use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "packet_type")]
pub enum Packet {
    #[serde(rename = "player_register")]
    PlayerRegister {
        game_id: Uuid,
        username: String
    },

    #[serde(rename = "player_registered")]
    PlayerRegistered {
        id: Uuid
    },
}