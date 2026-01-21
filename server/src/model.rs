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

#[derive(PartialEq, Eq)]
enum ToolType {
    Sword,
    Pickaxe,
    Axe,
}

#[derive(PartialEq, Eq)]
enum ToolMaterial {
    Iron,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, Eq, PartialEq, Hash)]
pub enum Item {
    #[serde(rename = "iron_sword")]
    IronSword,

    #[serde(rename = "iron_pickaxe")]
    IronPickaxe,

    #[serde(rename = "iron_axe")]
    IronAxe,
}

impl Item {
    fn tool_type(&self) -> Option<ToolType> {
        Some(match self {
            Item::IronSword => ToolType::Sword,
            Item::IronPickaxe => ToolType::Pickaxe,
            Item::IronAxe => ToolType::Axe,
        })
    }

    fn tool_material(&self) -> Option<ToolMaterial> {
        Some(match self {
            Item::IronSword | Item::IronPickaxe | Item::IronAxe => ToolMaterial::Iron,
        })
    }
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct Inventory {
    pub slots: Vec<Option<Item>>,
    pub selected: i32,
}

impl Inventory {
    fn hand_item(&self) -> Option<Item> {
        if let Some(item) = self.slots.get(self.selected as usize) {
            item.clone()
        } else {
            None
        }
    }
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct EntityPlayer {
    pub username: String,
    pub skin: i32,
    pub inventory: Inventory,
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

impl EntityType {
    fn best_damaging_tool(&self) -> ToolType {
        match self {
            EntityType::Player(_) => ToolType::Sword,
            EntityType::ForestTree => ToolType::Axe,
            EntityType::SpruceTree => ToolType::Axe,
            EntityType::JungleTree => ToolType::Axe,
            EntityType::Cactus => ToolType::Axe,
            EntityType::TreeStump => ToolType::Axe,
            EntityType::IceSpike => ToolType::Pickaxe,
            EntityType::Bush => ToolType::Axe,
            EntityType::Stone => ToolType::Pickaxe,
            EntityType::BigStone => ToolType::Pickaxe,
            EntityType::TreeLog => ToolType::Axe,
            EntityType::TallGrass => ToolType::Axe,
            EntityType::SeaShell => ToolType::Pickaxe,
        }
    }
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct Entity {
    pub id: Uuid,
    pub position: Vec2,
    pub value: EntityType,
    pub health: i32,
}

pub struct Game {
    pub id: Uuid,
    pub name: String,

    pub entity_map: HashMap<Uuid, Entity>,
    usernames: HashSet<String>,
    pub client_entity_view: HashMap<Uuid, HashSet<Uuid>>,

    terrain_generator: TerrainGenerator,
}

#[derive(Clone)]
pub struct Client {
    pub id: Uuid,
    pub username: Option<String>,
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
    pub fn new(id: Uuid, position: Vec2, value: EntityType, health: i32) -> Self {
        Self {
            id,
            position,
            value,
            health,
        }
    }

    pub fn player(id: Uuid, position: Vec2, username: String, skin: i32) -> Self {
        Self::new(
            id,
            position,
            EntityType::Player(EntityPlayer {
                username,
                skin,
                inventory: Inventory {
                    slots: vec![
                        Some(Item::IronSword),
                        Some(Item::IronPickaxe),
                        Some(Item::IronAxe),
                        None,
                        None,
                        None,
                    ],
                    selected: 0,
                },
            }),
            MAX_PLAYER_HEALTH,
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
        let terrain_generator = TerrainGenerator::new(seed);
        let mut entity_map = HashMap::new();

        for x in 0..WORLD_SIZE {
            for y in 0..WORLD_SIZE {
                if let Some(ent) = terrain_generator.get_entity(x, y) {
                    entity_map.insert(ent.id, ent);
                }
            }
        }

        Self {
            id,
            name,

            entity_map,
            usernames: HashSet::new(),
            client_entity_view: HashMap::new(),

            terrain_generator,
        }
    }

    pub fn get_new_spawn_location(&self) -> Vec2 {
        const NO_SPAWN_BORDER: i32 = WATER_EDGE_SIZE * 2;

        let mut rng = rand::rng();

        loop {
            let x = rng.random_range(NO_SPAWN_BORDER..WORLD_SIZE - NO_SPAWN_BORDER);
            let y = rng.random_range(NO_SPAWN_BORDER..WORLD_SIZE - NO_SPAWN_BORDER);

            match self.terrain_generator.get_tile(x as f64, y as f64) {
                TileType::Water | TileType::DeepWater => continue,
                _ => {}
            }

            // TODO: if an entity is here, continue

            return Vec2::new(x as f32, y as f32);
        }
    }

    pub fn get_chunk_data(&self, x: i32, y: i32) -> TerrainChunk {
        let mut tiles = vec![];

        for cy in 0..CHUNK_SIZE {
            for cx in 0..CHUNK_SIZE {
                let tile = self
                    .terrain_generator
                    .get_tile((CHUNK_SIZE * x + cx) as f64, (CHUNK_SIZE * y + cy) as f64);

                tiles.push(tile);
            }
        }

        TerrainChunk {
            position: Vec2::new(x as f32, y as f32),
            contents: tiles,
        }
    }

    pub fn add_entity_to_client_view(&mut self, client_id: Uuid, entity_id: Uuid) {
        self.client_entity_view
            .entry(client_id)
            .or_default()
            .insert(entity_id);
    }

    pub fn remove_entity_from_client_view(&mut self, client_id: Uuid, entity_id: &Uuid) {
        if let Some(set) = self.client_entity_view.get_mut(&client_id) {
            set.remove(entity_id);
        }
    }

    pub fn client_sees_entity(&self, client_id: Uuid, entity_id: &Uuid) -> bool {
        self.client_entity_view
            .get(&client_id)
            .is_some_and(|set| set.contains(entity_id))
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

    async fn get_player_entity_by_username(&self, username: &str) -> Option<Entity> {
        if let Some(game_arc) = &self.game {
            let game = game_arc.lock().await;

            for ent in game.entity_map.values() {
                if let EntityType::Player(entity_player) = &ent.value
                    && entity_player.username == username
                {
                    return Some(ent.clone());
                }
            }

            None
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

    pub async fn move_player(&self, new_position: Vec2, state: &mut ServerState, notify: bool) {
        let game_arc = match &self.game {
            Some(g) => g.clone(),
            _ => return,
        };

        let mut game_guard = game_arc.lock().await;

        let prev_position = match game_guard.entity_map.get(&self.id) {
            Some(e) => e.position,
            _ => return,
        };

        if let Some(entity_mut) = game_guard.entity_map.get_mut(&self.id) {
            entity_mut.position = new_position;
        }

        let prev_chunks: HashSet<_> = get_chunk_coords_visible_from(prev_position)
            .into_iter()
            .collect();
        let new_chunks: Vec<_> = get_chunk_coords_visible_from(new_position)
            .into_iter()
            .filter(|c| !prev_chunks.contains(c))
            .collect();

        for (x, y) in new_chunks.clone() {
            let chunk = game_guard.get_chunk_data(x, y);

            self.send(Packet::TerrainChunk { chunk }).await;
        }

        let mut newly_visible = Vec::new();
        let mut no_longer_visible = Vec::new();

        for entity in game_guard.entity_map.values() {
            let entity_chunk = (
                (entity.position.x / CHUNK_SIZE as f32).floor() as i32,
                (entity.position.y / CHUNK_SIZE as f32).floor() as i32,
            );

            if game_guard
                .client_entity_view
                .get(&self.id)
                .is_some_and(|set| set.contains(&entity.id))
            {
                if (entity.position.x - new_position.x).hypot(entity.position.y - new_position.y)
                    > 100.0
                {
                    no_longer_visible.push(entity.id);
                }
            } else if new_chunks.contains(&entity_chunk) {
                newly_visible.push(entity.id);
            }
        }

        for entity_id in newly_visible {
            if let Some(entity) = game_guard.entity_map.get(&entity_id) {
                self.send(Packet::EntityLoad {
                    entity: entity.clone(),
                })
                .await;
                game_guard.add_entity_to_client_view(self.id, entity_id);
            }
        }

        for entity_id in no_longer_visible {
            self.send(Packet::EntityUnload { id: entity_id }).await;
            game_guard.remove_entity_from_client_view(self.id, &entity_id);
        }

        let all_clients: Vec<Client> = state.clients.values().cloned().collect();

        for client in all_clients {
            if !notify && client.id == self.id {
                continue;
            }

            client
                .send(Packet::EntityMove {
                    id: self.id,
                    new_position,
                })
                .await;
        }
    }

    async fn handle_attack(&self, cursor: Vec2, state: &mut ServerState) {
        let game_arc = match &self.game {
            Some(g) => g.clone(),
            _ => return,
        };

        let (target_id, new_health, target_was_alive, game_id, attacker, victim) = {
            let mut game = game_arc.lock().await;

            let attacker = if let Entity {
                value: EntityType::Player(p),
                ..
            } = game.entity_map.get(&self.id).unwrap()
            {
                p.clone()
            } else {
                panic!("Attack has no attacker");
            };

            let mut hit: Option<Uuid> = None;
            let mut best_dist = f32::MAX;

            for (id, entity) in &game.entity_map {
                if *id == self.id {
                    continue;
                }
                let dist = (entity.position.x - cursor.x).hypot(entity.position.y - cursor.y);
                if dist < ATTACK_RANGE && dist < best_dist {
                    best_dist = dist;
                    hit = Some(*id);
                }
            }

            let Some(target_id) = hit else { return };

            let target: &mut Entity = game.entity_map.get_mut(&target_id).unwrap();
            target.health -= calculate_damage(target, attacker.inventory.hand_item());
            let new_health = target.health;
            let target_was_alive = new_health > 0;

            let victim = if let Entity {
                value: EntityType::Player(p),
                ..
            } = target.clone()
            {
                Some(p.clone())
            } else {
                None
            };

            (
                target_id,
                new_health,
                target_was_alive,
                game.id,
                attacker,
                victim,
            )
        };

        for client in state.clients.values() {
            if let Some(client_game) = &client.game {
                let cg = client_game.lock().await;
                if cg.id == game_id && cg.client_sees_entity(client.id, &target_id) {
                    client
                        .send(Packet::EntityDamage {
                            id: target_id,
                            new_health,
                        })
                        .await;
                }
            }
        }

        if !target_was_alive {
            let removed = {
                let mut game = game_arc.lock().await;
                game.entity_map.remove(&target_id)
            };

            if removed.is_some() {
                for client in state.clients.values() {
                    if let Some(client_game) = &client.game {
                        let cg = client_game.lock().await;

                        if cg.client_sees_entity(client.id, &target_id) {
                            client.send(Packet::EntityDeath { id: target_id }).await;
                        }

                        if let Some(v) = victim.clone() {
                            client
                                .send(Packet::SystemMessage {
                                    message: format!(
                                        "{} was killed by {}",
                                        v.username, attacker.username
                                    ),
                                })
                                .await;
                        }
                    }
                }
            }
        }
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

                self.username = Some(username.clone());

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

                for chunk in chunk_data {
                    let packet = Packet::TerrainChunk { chunk };
                    self.send(packet).await;
                }

                let player_ids: Vec<_> = game_guard
                    .entity_map
                    .values()
                    .filter_map(|e| match e.value {
                        EntityType::Player(_) => Some(e.id),
                        _ => None,
                    })
                    .collect();

                let entities_to_load = {
                    let mut entities_to_load = vec![];

                    let visible_chunks: HashSet<_> = get_chunk_coords_visible_from(position)
                        .into_iter()
                        .collect();

                    for other_entity in game_guard.entity_map.values() {
                        let entity_chunk = (
                            (other_entity.position.x / CHUNK_SIZE as f32).floor() as i32,
                            (other_entity.position.y / CHUNK_SIZE as f32).floor() as i32,
                        );

                        if visible_chunks.contains(&entity_chunk)
                            && !game_guard.client_sees_entity(self.id, &other_entity.id)
                        {
                            entities_to_load.push(other_entity.clone());
                        }
                    }

                    entities_to_load
                };

                for entity in entities_to_load {
                    self.send(Packet::EntityLoad {
                        entity: entity.clone(),
                    })
                    .await;

                    game_guard.add_entity_to_client_view(self.id, entity.id);
                }

                drop(game_guard);

                self.move_player(position, state, false).await;

                let mut game_clients: Vec<Client> = Vec::new();

                for id in player_ids {
                    if let Some(client) = state.clients.get(&id)
                        && let Some(client_game) = &client.game
                        && client_game.lock().await.id == game_id
                    {
                        game_clients.push(client.clone());
                    }
                }

                for client in &game_clients {
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

                let new_player_message =
                    format!("{} joined the game", self.username.clone().unwrap());
                for client in &game_clients {
                    client
                        .send(Packet::SystemMessage {
                            message: new_player_message.clone(),
                        })
                        .await;
                }

                self.log("Registered").await;
            }

            Packet::EntityMove { id, new_position } => {
                if id != self.id {
                    return; // TODO: ponder
                }

                self.move_player(new_position, state, false).await;
            }

            Packet::ChatMessageSend { message } => {
                let all_clients: Vec<Client> = state.clients.values().cloned().collect();

                if message.starts_with('/') {
                    let p = message.split(' ').collect::<Vec<&str>>();
                    match &p[..] {
                        ["/tp", username] => {
                            let target_position = {
                                if let Some(target_entity) =
                                    self.get_player_entity_by_username(username).await
                                {
                                    target_entity.position
                                } else {
                                    self.send(Packet::SystemMessage {
                                        message: format!("Player {} not found", username),
                                    })
                                    .await;
                                    return;
                                }
                            };

                            self.move_player(target_position, state, true).await;

                            return;
                        }
                        _ => {
                            self.send(Packet::SystemMessage {
                                message: "Invalid command".to_string(),
                            })
                            .await;

                            return;
                        }
                    }
                }

                let message_id = Uuid::new_v4();
                for client in &all_clients {
                    let sender_name = self.username.clone().unwrap();
                    client
                        .send(Packet::ChatMessage {
                            id: message_id,
                            message: message.clone(),
                            username: sender_name,
                        })
                        .await;
                }
            }

            Packet::PlayerAttack { cursor_world_pos } => {
                self.handle_attack(cursor_world_pos, state).await;
            }

            Packet::InventorySelect { selected } => {
                let game_arc = match &self.game {
                    Some(g) => g.clone(),
                    _ => return,
                };

                let mut game = game_arc.lock().await;

                if let Some(Entity { value, .. }) = game.entity_map.get_mut(&self.id)
                    && let EntityType::Player(player) = value
                {
                    player.inventory.selected = selected;
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

fn calculate_damage(target: &Entity, attacking_item: Option<Item>) -> i32 {
    if let Some(item) = attacking_item {
        let mut damage = 5;

        if let Some(tool_type) = item.tool_type() {
            damage *= 2;

            if tool_type == target.value.best_damaging_tool() {
                damage *= 2;
            }
        }

        damage *= match item.tool_material() {
            Some(ToolMaterial::Iron) => 2,
            _ => 1,
        };

        damage
    } else {
        5
    }
}
