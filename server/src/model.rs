use rand::Rng;
use serde::{Deserialize, Serialize};
use std::{
    collections::{HashMap, HashSet},
    sync::{Arc, Mutex},
};
use uuid::Uuid;

use crate::packet::{ErrorPacket, Packet};
use crate::terrain::{TileType, TerrainChunk, TerrainGenerator};

#[derive(Debug, Deserialize, Serialize, Clone, Copy)]
pub struct Vec2 {
    x: f32,
    y: f32,
}

impl Vec2 {
    pub fn new(x: f32, y: f32) -> Self {
        Self { x, y }
    }
}

pub struct Game {
    pub id: Uuid,
    pub name: String,
    
    // net
    pub player_ids: Vec<Uuid>,

    // world
    terrain_generator: TerrainGenerator,
}

const WORLD_SIZE: i32 = 1000;
const HALF_WORLD_SIZE: i32 = WORLD_SIZE / 2;

const VIEW_RANGE: f32 = 20.0;

const CHUNK_SIZE: i32 = 8;

fn get_chunk_coords_visible_from(position: Vec2) -> Vec<(i32, i32)> {
    let mut coords = vec![];
    
    let start_y = ((position.y - VIEW_RANGE) / CHUNK_SIZE as f32).floor() as i32;
    let end_y   = ((position.y + VIEW_RANGE) / CHUNK_SIZE as f32).ceil() as i32;
    let start_x = ((position.x - VIEW_RANGE) / CHUNK_SIZE as f32).floor() as i32;
    let end_x   = ((position.x + VIEW_RANGE) / CHUNK_SIZE as f32).ceil() as i32;

    for y in start_y..=end_y {
        for x in start_x..=end_x {
            coords.push((x, y));
        }
    }

    coords
}

impl Game {
    pub fn log<S: AsRef<str>>(&self, message: S) {
        println!("[G_{}] {}", self.id, message.as_ref());
    }

    pub fn elog<S: AsRef<str>>(&self, message: S) {
        eprintln!("[G_{}] {}", self.id, message.as_ref());
    }

    pub fn new(id: Uuid, name: String, seed: u32) -> Self {
        Self {
            id,
            name,

            player_ids: vec![],

            terrain_generator: TerrainGenerator::new(seed),
        }
    }

    pub fn get_tile(&self, x: i32, y: i32) -> TileType {
        self.terrain_generator.get_tile(x as f64, y as f64)
    }

    pub fn get_new_spawn_location(&self) -> Vec2 {
        let mut rng = rand::rng();

        loop {
            let x = rng.random_range(-HALF_WORLD_SIZE..HALF_WORLD_SIZE);
            let y = rng.random_range(-HALF_WORLD_SIZE..HALF_WORLD_SIZE);

            match self.get_tile(x, y) {
                TileType::Water | TileType::DeepWater => continue,
                _ => return Vec2::new(x as f32, y as f32),
            }
        }
    }

    pub fn get_chunk(&self, x: i32, y: i32) -> TerrainChunk {
        let mut contents = vec![];
        
        for cy in 0..CHUNK_SIZE {
            for cx in 0..CHUNK_SIZE {
                contents.push(self.get_tile(CHUNK_SIZE * x + cx, CHUNK_SIZE * y + cy));
            }
        }

        TerrainChunk {
            position: Vec2::new(x as f32, y as f32),
            contents,
        }
    }
}

#[derive(Clone)]
pub struct PlayerData {
    pub game_id: Uuid,
    pub username: String,
    pub position: Vec2,
}

#[derive(Clone)]
pub struct Client {
    pub id: Uuid,
    pub ws_session: actix_ws::Session,
    pub player_data: Option<PlayerData>,
}

impl Client {
    fn log_prefix(&self) -> String {
        match &self.player_data {
            Some(PlayerData { username, .. }) => format!("[C_{}] ({})", self.id, username),
            None => format!("[C_{}]", self.id),
        }
    }

    pub fn log<S: AsRef<str>>(&self, message: S) {
        println!("{} {}", self.log_prefix(), message.as_ref());
    }

    pub fn elog<S: AsRef<str>>(&self, message: S) {
        println!("{} {}", self.log_prefix(), message.as_ref());
    }

    pub async fn send(&mut self, packet: Packet) {
        let json = serde_json::to_string(&packet).unwrap();
        self.ws_session.text(json).await.ok();
    }

    pub async fn send_error<S: AsRef<str>>(&mut self, error: S) {
        let packet = ErrorPacket::new(error);
        let json = serde_json::to_string(&packet).unwrap();
        self.ws_session.text(json).await.ok();
    }

    pub async fn recv(&mut self, packet: Packet, state: &mut ServerState) {
        match packet {
            Packet::PlayerRegister { game_name, username } => {
                if self.player_data.is_some() {
                    self.elog("Tried to reregister");
                    return;
                }

                let game_id = *match state.game_ids_by_name.get(&game_name) {
                    Some(id) => id,
                    None => {
                        self.send_error("game-not-found").await;
                        return;
                    }
                };

                for (_, client) in state.clients.iter() {
                    if let Some(player_data) = &client.player_data {
                        if player_data.username == username {
                            self.send_error("username-taken").await;
                        }
                    }
                }

                let game = state.games.get(&game_id).unwrap();

                let position = game.get_new_spawn_location();

                self.player_data = Some(PlayerData {
                    game_id,
                    username,
                    position,
                });

                let chunks = get_chunk_coords_visible_from(position)
                    .into_iter()
                    .map(move |(x, y)| game.get_chunk(x, y));

                for chunk in chunks {
                    let packet = Packet::TerrainChunk { chunk };
                    self.send(packet).await;
                }

                let res = Packet::PlayerRegistered {
                    id: self.id,
                    position
                };

                self.send(res).await;

                self.log("Registered");
            }

            Packet::EntityMove { id, new_position } => {
                if id != self.id {
                    return; // TODO: ponder
                }

                // TODO: check diff for cheating

                // send chunk update

                let mut chunk_coords = get_chunk_coords_visible_from(new_position);
                let prev_chunk_coords = get_chunk_coords_visible_from(self.player_data.clone().unwrap().position);

                let prev_chunk_coords: HashSet<_> = prev_chunk_coords.into_iter().collect();

                chunk_coords.retain(|x| !prev_chunk_coords.contains(x));

                let game = state.games.get(&self.player_data.clone().unwrap().game_id).unwrap();

                let chunks = chunk_coords
                    .into_iter()
                    .map(move |(x, y)| game.get_chunk(x, y));

                for chunk in chunks {
                    let packet = Packet::TerrainChunk { chunk };
                    self.send(packet).await;
                }

                // update position

                if let Some(ref mut player_data) = self.player_data {
                    player_data.position = new_position;
                }

                // send position update to others

                let mut others = state
                    .clients
                    .clone()
                    .into_iter()
                    .collect::<Vec<_>>();

                others.retain(|(_, c)| c.id != self.id);

                for (_, mut client) in others {
                    client.send(Packet::EntityMove { id, new_position }).await;
                }
            }

            other => {
                self.elog(format!("Sent an unexpected packet: {:?}", other));
            }
        }
    }
}

pub struct ServerState {
    pub games: HashMap<Uuid, Game>,
    pub game_ids_by_name: HashMap<String, Uuid>,
    pub clients: HashMap<Uuid, Client>,
}

impl ServerState {
    pub fn new() -> Self {
        Self {
            games: HashMap::new(),
            game_ids_by_name: HashMap::new(),
            clients: HashMap::new(),
        }
    }

    pub fn create_game(&mut self, name: &str, seed: u32) -> Uuid {
        let id = Uuid::new_v4();
        let game = Game::new(id, name.to_string(), seed);

        game.log("Created");

        self.games.insert(id, game);
        self.game_ids_by_name.insert(name.to_string(), id);

        id
    }
}

pub type SharedState = Arc<Mutex<ServerState>>;