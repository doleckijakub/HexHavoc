use rand::Rng;
use serde::{Deserialize, Serialize};
use std::{
    collections::{HashMap, HashSet},
    sync::{Arc, Mutex},
};
use uuid::Uuid;

use crate::config::*;
use crate::packet::{ErrorPacket, Packet};
use crate::terrain::{TileType, TerrainChunk, TerrainGenerator};

/// STRUCT

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

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct EntityPlayer {
    pub username: String,
    // TODO: sprite
    // TODO: tint color
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub enum EntityType {
    #[serde(rename = "player")]
    Player(EntityPlayer)
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct Entity {
    pub id: Uuid,
    pub position: Vec2,
    pub value: EntityType,
}

pub struct Game {
    pub id: Uuid,
    pub name: String,
    
    pub entity_map: HashMap<Uuid, Entity>,

    terrain_generator: TerrainGenerator,
}

#[derive(Clone)]
pub struct Client {
    pub id: Uuid,
    pub ws_session: Arc<Mutex<actix_ws::Session>>,
    pub game: Option<Arc<Mutex<Game>>>,
}

pub struct ServerState {
    pub games: HashMap<Uuid, Arc<Mutex<Game>>>,
    pub game_ids_by_name: HashMap<String, Uuid>,
    pub clients: HashMap<Uuid, Client>,
}

pub type SharedState = Arc<Mutex<ServerState>>;

/// IMPL

fn get_chunk_coords_visible_from(position: Vec2) -> Vec<(i32, i32)> {
    let mut coords = vec![];
    
    let start_y = (((position.y - VIEW_RANGE) / CHUNK_SIZE as f32).floor() as i32).max(0);
    let end_y   = (((position.y + VIEW_RANGE) / CHUNK_SIZE as f32).ceil() as i32).min(WORLD_SIZE / CHUNK_SIZE);
    let start_x = (((position.x - VIEW_RANGE) / CHUNK_SIZE as f32).floor() as i32).max(0);
    let end_x   = (((position.x + VIEW_RANGE) / CHUNK_SIZE as f32).ceil() as i32).min(WORLD_SIZE / CHUNK_SIZE);

    for y in start_y..=end_y {
        for x in start_x..=end_x {
            coords.push((x, y));
        }
    }

    coords
}

impl Entity {
    fn player(id: Uuid, position: Vec2, username: String) -> Self {
        Self {
            id,
            position,
            value: EntityType::Player(EntityPlayer { username })
        }
    }
}

impl Game {
    pub fn log<S: AsRef<str>>(&self, message: S) {
        println!("[G_{}] ({}) {}", self.id, self.name, message.as_ref());
    }

    pub fn elog<S: AsRef<str>>(&self, message: S) {
        eprintln!("[G_{}] ({}) {}", self.id, self.name, message.as_ref());
    }

    pub fn new(id: Uuid, name: String, seed: u32) -> Self {
        Self {
            id,
            name,
            entity_map: HashMap::new(),
            terrain_generator: TerrainGenerator::new(seed),
        }
    }

    pub fn get_tile(&self, x: i32, y: i32) -> TileType {
        self.terrain_generator.get_tile(x as f64, y as f64)
    }

    pub fn get_new_spawn_location(&self) -> Vec2 {
        return Vec2::new(128.0, 128.0);

        let mut rng = rand::rng();

        loop {
            let x = rng.random_range(0..WORLD_SIZE);
            let y = rng.random_range(0..WORLD_SIZE);

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

impl Client {
    fn get_player_entity(&self) -> Option<Entity> {
        self.game.as_ref().and_then(|game_arc| {
            let game = game_arc.lock().ok()?;
            game.entity_map.get(&self.id).cloned()
        })
    }

    #[allow(irrefutable_let_patterns)] // TODO: remove when adding more entities
    fn get_player(&self) -> Option<EntityPlayer> {
        if self.game.is_none() { return None; }

        if let EntityType::Player(player) = self.get_player_entity().and_then(|entity| Some(entity.value.clone())).unwrap() {
            return Some(player);
        }

        panic!("Client entity is not a player");
    }

    fn log_prefix(&self) -> String {
        match &self.get_player() {
            Some(EntityPlayer { username, .. }) => format!("[C_{}] ({})", self.id, username),
            None => format!("[C_{}]", self.id),
        }
    }

    pub fn log<S: AsRef<str>>(&self, message: S) {
        println!("{} {}", self.log_prefix(), message.as_ref());
    }

    pub fn elog<S: AsRef<str>>(&self, message: S) {
        println!("{} {}", self.log_prefix(), message.as_ref());
    }

    pub async fn send(&self, packet: Packet) {
        let json = serde_json::to_string(&packet).unwrap();
        if let Ok(mut session) = self.ws_session.lock() {
            session.text(json).await.ok();
        }
    }

    pub async fn send_error<S: AsRef<str>>(&self, error: S) {
        let packet = ErrorPacket::new(error);
        let json = serde_json::to_string(&packet).unwrap();
        if let Ok(mut session) = self.ws_session.lock() {
            session.text(json).await.ok();
        }
    }

    #[allow(irrefutable_let_patterns)] // TODO: remove when adding more entities
    pub async fn recv(&mut self, packet: Packet, state: &mut ServerState) {
        match packet {
            Packet::PlayerRegister { game_name, username } => {
                if self.get_player().is_some() {
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
                    let client = client.clone();

                    if client.game.is_none() { continue; }

                    if let Some(client_game) = client.game {
                        let client_game = client_game.lock().unwrap();
                        
                        if client_game.id != game_id { continue; }

                        if let Some(player_entity) = client_game.entity_map.get(&client.id) {
                            if let EntityType::Player(player) = &player_entity.value {
                                if player.username == username {
                                    self.send_error("username-taken").await;
                                    return;
                                }
                            }
                        }
                    }
                }

                let game = state.games.get(&game_id).unwrap().clone();
                self.game = Some(game.clone());
                let mut game_guard = game.lock().unwrap();

                state.clients.insert(self.id, self.clone());

                let position = game_guard.get_new_spawn_location();

                let entity = Entity::player(self.id, position, username);

                game_guard.entity_map.insert(self.id, entity.clone());

                let chunk_coords = get_chunk_coords_visible_from(position);

                let chunks: Vec<_> = chunk_coords
                    .into_iter()
                    .map(|(x, y)| game_guard.get_chunk(x, y))
                    .collect();

                for chunk in chunks {
                    let packet = Packet::TerrainChunk { chunk };
                    self.send(packet).await;
                }

                #[allow(unreachable_patterns)] // TODO: remove when adding more entities
                let player_ids: Vec<_> = game_guard.entity_map
                    .values()
                    .filter_map(|e| match e.value {
                        EntityType::Player(_) => Some(e.id),
                        _ => None,
                    })
                    .collect();

                drop(game_guard);

                let mut game_clients: Vec<Client> = Vec::new();

                for id in player_ids {
                    if let Some(client) = state.clients.get(&id) {
                        if let Some(client_game) = &client.game {
                            if client_game.lock().unwrap().id == game_id {
                                game_clients.push(client.clone());
                            }
                        }
                    }
                }

                for client in game_clients {
                    client.send(Packet::EntityLoad {
                        entity: entity.clone()
                    }).await;

                    if client.id != self.id {
                        let entity = client.get_player_entity().unwrap();

                        self.send(Packet::EntityLoad {
                            entity
                        }).await;
                    }
                }

                self.send(Packet::PlayerRegistered {
                    id: self.id
                }).await;

                self.log("Registered");
            }

            Packet::EntityMove { id, new_position } => {
                if id != self.id {
                    return; // TODO: ponder
                }

                let game = self.game.clone().unwrap();

                // TODO: check diff for cheating

                // send chunk update

                let mut chunk_coords = get_chunk_coords_visible_from(new_position);
                let prev_chunk_coords = get_chunk_coords_visible_from(self.get_player_entity().clone().unwrap().position);

                let prev_chunk_coords: HashSet<_> = prev_chunk_coords.into_iter().collect();

                chunk_coords.retain(|x| !prev_chunk_coords.contains(x));

                let chunks: Vec<_> = {
                    let game_guard = game.lock().unwrap();
                    chunk_coords
                        .into_iter()
                        .map(|(x, y)| game_guard.get_chunk(x, y))
                        .collect()
                };

                for chunk in chunks {
                    let packet = Packet::TerrainChunk { chunk };
                    self.send(packet).await;
                }

                // update position

                if let Some(game_arc) = &self.game {
                    if let Ok(mut game_guard) = game_arc.lock() {
                        if let Some(entity_mut) = game_guard.entity_map.get_mut(&self.id) {
                            entity_mut.position = new_position;
                        }
                    }
                }

                // send position update to others

                let others: Vec<Client> = state
                    .clients
                    .values()
                    .filter(|c| c.id != self.id)
                    .cloned()
                    .collect();

                for client in others {
                    client.send(Packet::EntityMove {
                        id,
                        new_position
                    }).await;
                }
            }

            other => {
                self.elog(format!("Sent an unexpected packet: {:?}", other));
            }
        }
    }
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

        self.games.insert(id, Arc::new(Mutex::new(game)));
        self.game_ids_by_name.insert(name.to_string(), id);

        id
    }
}
