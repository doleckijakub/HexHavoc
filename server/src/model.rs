use rand::Rng;
use serde::{Deserialize, Serialize};
use std::{
    collections::{HashMap, HashSet},
    sync::Arc,
};
use tokio::sync::Mutex;
use uuid::Uuid;

use crate::config::*;
use crate::packet::{ErrorPacket, Packet};
use crate::terrain::{TerrainChunk, TerrainGenerator, TileType};

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
    pub skin: i32,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub enum EntityType {
    #[serde(rename = "player")]
    Player(EntityPlayer),

    #[serde(rename = "forest_tree")]
    ForestTree,

    #[serde(rename = "spruce_tree")]
    SpruceTree,

    #[serde(rename = "jungle_tree")]
    JungleTree,

    #[serde(rename = "cactus")]
    Cactus,

    #[serde(rename = "tree_stump")]
    TreeStump,

    #[serde(rename = "ice_spike")]
    IceSpike,

    #[serde(rename = "bush")]
    Bush,

    #[serde(rename = "stone")]
    Stone,

    #[serde(rename = "big_stone")]
    BigStone,

    #[serde(rename = "tree_log")]
    TreeLog,

    #[serde(rename = "tall_grass")]
    TallGrass,

    #[serde(rename = "sea_shell")]
    SeaShell,
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
    usernames: HashSet<String>,

    terrain_generator: TerrainGenerator,
}

#[derive(Clone)]
pub struct Client {
    pub id: Uuid,
    pub ws_session: Arc<Mutex<actix_ws::Session>>,
    pub game: Option<Arc<Mutex<Game>>>,
}

#[derive(Default)]
pub struct ServerState {
    pub games: HashMap<Uuid, Arc<Mutex<Game>>>,
    pub game_ids_by_name: HashMap<String, Uuid>,
    pub clients: HashMap<Uuid, Client>,
}

pub type SharedState = Arc<Mutex<ServerState>>;

// IMPL

fn get_chunk_coords_visible_from(position: Vec2) -> Vec<(i32, i32)> {
    let mut coords = vec![];

    let chunk_size_f: f32 = CHUNK_SIZE as f32;

    let start_y =
        (((position.y - VIEW_RANGE - chunk_size_f / 2.0) / chunk_size_f).floor() as i32).max(0);
    let end_y = (((position.y + VIEW_RANGE - chunk_size_f / 2.0) / chunk_size_f).ceil() as i32)
        .min(WORLD_SIZE / CHUNK_SIZE);
    let start_x =
        (((position.x - VIEW_RANGE - chunk_size_f / 2.0) / chunk_size_f).floor() as i32).max(0);
    let end_x = (((position.x + VIEW_RANGE - chunk_size_f / 2.0) / chunk_size_f).ceil() as i32)
        .min(WORLD_SIZE / CHUNK_SIZE);

    for y in start_y..=end_y {
        for x in start_x..=end_x {
            coords.push((x, y));
        }
    }

    coords
}

impl Entity {
    pub fn new(id: Uuid, position: Vec2, value: EntityType) -> Self {
        Self {
            id,
            position,
            value,
        }
    }

    pub fn player(id: Uuid, position: Vec2, username: String, skin: i32) -> Self {
        Self::new(
            id,
            position,
            EntityType::Player(EntityPlayer { username, skin }),
        )
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
            usernames: HashSet::new(),

            terrain_generator: TerrainGenerator::new(seed),
        }
    }

    pub fn get_new_spawn_location(&self) -> Vec2 {
        const NO_SPAWN_BORDER: i32 = WATER_EDGE_SIZE * 2;

        let mut rng = rand::rng();

        loop {
            let x = rng.random_range(NO_SPAWN_BORDER..WORLD_SIZE - NO_SPAWN_BORDER);
            let y = rng.random_range(NO_SPAWN_BORDER..WORLD_SIZE - NO_SPAWN_BORDER);

            match self.terrain_generator.get_contents(x, y) {
                (TileType::Water | TileType::DeepWater, _) => continue,
                (_, Some(_)) => continue,
                _ => return Vec2::new(x as f32, y as f32),
            }
        }
    }

    pub fn get_chunk_data(&self, x: i32, y: i32) -> (TerrainChunk, Vec<Entity>) {
        let mut tiles = vec![];
        let mut entities = vec![];

        for cy in 0..CHUNK_SIZE {
            for cx in 0..CHUNK_SIZE {
                let tile_data = self
                    .terrain_generator
                    .get_contents(CHUNK_SIZE * x + cx, CHUNK_SIZE * y + cy);

                tiles.push(tile_data.0);

                if let Some(entity) = tile_data.1 {
                    entities.push(entity);
                }
            }
        }

        (
            TerrainChunk {
                position: Vec2::new(x as f32, y as f32),
                contents: tiles,
            },
            entities,
        )
    }
}

impl Client {
    async fn get_player_entity(&self) -> Option<Entity> {
        if let Some(game_arc) = &self.game {
            let game = game_arc.lock().await;
            game.entity_map.get(&self.id).cloned()
        } else {
            None
        }
    }

    async fn get_player(&self) -> Option<EntityPlayer> {
        if let EntityType::Player(player) = self
            .get_player_entity()
            .await
            .map(|entity| entity.value.clone())?
        {
            return Some(player);
        }

        panic!("Client entity is not a player");
    }

    async fn log_prefix(&self) -> String {
        match &self.get_player().await {
            Some(EntityPlayer { username, .. }) => format!("[C_{}] ({})", self.id, username),
            _ => format!("[C_{}]", self.id),
        }
    }

    pub async fn log<S: AsRef<str>>(&self, message: S) {
        println!("{} {}", self.log_prefix().await, message.as_ref());
    }

    pub async fn elog<S: AsRef<str>>(&self, message: S) {
        println!("{} {}", self.log_prefix().await, message.as_ref());
    }

    pub async fn send(&self, packet: Packet) {
        let json = serde_json::to_string(&packet).unwrap();
        let mut session = self.ws_session.lock().await;
        session.text(json).await.ok();
    }

    pub async fn send_error<S: AsRef<str>>(&self, error: S) {
        let packet = ErrorPacket::new(error);
        let json = serde_json::to_string(&packet).unwrap();
        let mut session = self.ws_session.lock().await;
        session.text(json).await.ok();
    }

    pub async fn recv(&mut self, packet: Packet, state: &mut ServerState) {
        match packet {
            Packet::PlayerRegister {
                game_name,
                username,
                skin,
            } => {
                if self.get_player().await.is_some() {
                    self.elog("Tried to reregister").await;
                    return;
                }

                let game_id = *match state.game_ids_by_name.get(&game_name) {
                    Some(id) => id,
                    _ => {
                        self.send_error("game-not-found").await;
                        return;
                    }
                };

                let game = state.games.get(&game_id).unwrap().clone();
                self.game = Some(game.clone());
                let mut game_guard = game.lock().await;

                if game_guard.usernames.contains(&username) {
                    self.send_error("username-taken").await;
                    return;
                }

                game_guard.usernames.insert(username.clone());

                state.clients.insert(self.id, self.clone());

                let position = game_guard.get_new_spawn_location();

                let entity = Entity::player(self.id, position, username, skin);

                game_guard.entity_map.insert(self.id, entity.clone());

                let chunk_coords = get_chunk_coords_visible_from(position);

                let chunk_data: Vec<_> = chunk_coords
                    .into_iter()
                    .map(|(x, y)| game_guard.get_chunk_data(x, y))
                    .collect();

                for (chunk, entities) in chunk_data {
                    let packet = Packet::TerrainChunk { chunk };
                    self.send(packet).await;

                    for entity in entities {
                        let packet = Packet::EntityLoad { entity };
                        self.send(packet).await;
                    }
                }

                let player_ids: Vec<_> = game_guard
                    .entity_map
                    .values()
                    .filter_map(|e| match e.value {
                        EntityType::Player(_) => Some(e.id),
                        _ => None,
                    })
                    .collect();

                drop(game_guard);

                let mut game_clients: Vec<Client> = Vec::new();

                for id in player_ids {
                    if let Some(client) = state.clients.get(&id)
                        && let Some(client_game) = &client.game
                        && client_game.lock().await.id == game_id
                    {
                        game_clients.push(client.clone());
                    }
                }

                for client in game_clients {
                    client
                        .send(Packet::EntityLoad {
                            entity: entity.clone(),
                        })
                        .await;

                    if client.id != self.id {
                        let entity = client.get_player_entity().await.unwrap();

                        self.send(Packet::EntityLoad { entity }).await;
                    }
                }

                self.send(Packet::PlayerRegistered { id: self.id }).await;

                self.log("Registered").await;
            }

            Packet::EntityMove { id, new_position } => {
                if id != self.id {
                    return; // TODO: ponder
                }

                let game = self.game.clone().unwrap();

                // TODO: check diff for cheating

                // send chunk update

                let mut chunk_coords = get_chunk_coords_visible_from(new_position);
                let prev_chunk_coords = get_chunk_coords_visible_from(
                    self.get_player_entity().await.clone().unwrap().position,
                );

                let prev_chunk_coords: HashSet<_> = prev_chunk_coords.into_iter().collect();

                chunk_coords.retain(|x| !prev_chunk_coords.contains(x));

                let chunk_data: Vec<_> = {
                    let game_guard = game.lock().await;
                    chunk_coords
                        .into_iter()
                        .map(|(x, y)| game_guard.get_chunk_data(x, y))
                        .collect()
                };

                for (chunk, entities) in chunk_data {
                    let packet = Packet::TerrainChunk { chunk };
                    self.send(packet).await;

                    for entity in entities {
                        let packet = Packet::EntityLoad { entity };
                        self.send(packet).await;
                    }
                }

                // update position

                if let Some(game_arc) = &self.game {
                    let mut game_guard = game_arc.lock().await;
                    if let Some(entity_mut) = game_guard.entity_map.get_mut(&self.id) {
                        entity_mut.position = new_position;
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
                    client.send(Packet::EntityMove { id, new_position }).await;
                }
            }

            other => {
                self.elog(format!("Sent an unexpected packet: {:?}", other))
                    .await;
            }
        }
    }
}

impl ServerState {
    pub fn create_game(&mut self, name: &str, seed: u32) -> Uuid {
        let id = Uuid::new_v4();
        let game = Game::new(id, name.to_string(), seed);

        game.log("Created");

        self.games.insert(id, Arc::new(Mutex::new(game)));
        self.game_ids_by_name.insert(name.to_string(), id);

        id
    }
}
