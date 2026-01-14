use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::model::{Entity, Vec2};
use crate::terrain::TerrainChunk;

#[derive(Debug, Serialize, Deserialize)]
pub struct ErrorPacket {
    pub error: String,
}

impl ErrorPacket {
    pub fn new<S: AsRef<str>>(error: S) -> Self {
        Self {
            error: error.as_ref().to_string(),
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "packet_type")]
pub enum Packet {
    #[serde(rename = "player_register")]
    PlayerRegister {
        game_name: String,
        username: String,
        skin: i32,
    },

    #[serde(rename = "player_registered")]
    PlayerRegistered { id: Uuid },

    #[serde(rename = "terrain_chunk")]
    TerrainChunk { chunk: TerrainChunk },

    #[serde(rename = "entity_load")]
    EntityLoad { entity: Entity },

    #[serde(rename = "entity_move")]
    EntityMove { id: Uuid, new_position: Vec2 },

    #[serde(rename = "chat_message_send")]
    ChatMessageSend { message: String },

    #[serde(rename = "chat_message")]
    ChatMessage { 
        id: Uuid, 
        message: String, 
        username: String 
    },

    #[serde(rename = "system_message")]
    SystemMessage { message: String },
}
