use std::{
    collections::HashMap,
    sync::{Arc, Mutex},
};
use uuid::Uuid;

use crate::packet::Packet;

pub struct Game {
    pub id: Uuid,
    pub name: String,
    pub seed: u64,
    pub player_ids: Vec<Uuid>,
}

impl Game {
    pub fn log<S: AsRef<str>>(&self, message: S) {
        println!("[G_{}] {}", self.id, message.as_ref());
    }

    pub fn elog<S: AsRef<str>>(&self, message: S) {
        eprintln!("[G_{}] {}", self.id, message.as_ref());
    }
}

#[derive(Clone)]
pub struct PlayerData {
    pub game_id: Uuid,
    pub username: String,
}

#[derive(Clone)]
pub struct Client {
    pub id: Uuid,
    pub ws_session: actix_ws::Session,
    pub player_data: Option<PlayerData>,
}

impl Client {
    pub fn log<S: AsRef<str>>(&self, message: S) {
        println!("[C_{}] {}", self.id, message.as_ref());
    }

    pub fn elog<S: AsRef<str>>(&self, message: S) {
        eprintln!("[C_{}] {}", self.id, message.as_ref());
    }

    pub async fn send(&mut self, packet: Packet) {
        let json = serde_json::to_string(&packet).unwrap();
        self.ws_session.text(json).await.ok();
    }

    pub async fn recv(&mut self, packet: Packet, state: &mut ServerState) {
        match packet {
            Packet::PlayerRegister { game_id, username } => {
                if self.player_data.is_some() {
                    self.elog("Tried to reregister");
                    return;
                }

                self.player_data = Some(PlayerData {
                    game_id,
                    username: username.clone()
                });

                let res = Packet::PlayerRegistered { id: self.id };
                self.send(res).await;

                self.log(format!("Registered as: {}", username));
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

    pub fn create_game(&mut self, name: &str, seed: u64) -> Uuid {
        let id = Uuid::new_v4();
        let game = Game { id, name: name.to_string(), seed, player_ids: vec![] };

        game.log("Created");

        self.games.insert(id, game);
        self.game_ids_by_name.insert(name.to_string(), id);

        id
    }
}

pub type SharedState = Arc<Mutex<ServerState>>;