import type { Vec2 } from '@core/Vec2';
import type { EntityType } from '@core/Entity';
import type { TerrainChunk } from '@type/game';

export interface EntityMovePacket {
    packet_type: 'entity_move'
    id: string,
    new_position: Vec2,
}

export interface TerrainChunkPacket {
    packet_type: 'terrain_chunk',
    chunk: TerrainChunk,
}

export interface EntityLoadPacket {
    packet_type: 'entity_load',
    entity: EntityType,
}

export interface EntityUnloadPacket {
    packet_type: 'entity_unload',
    id: string,
}

export interface PlayerRegisterPacket {
    packet_type: 'player_register';
    game_name: string;
    username: string;
    skin: number;
}

export interface PlayerRegisteredPacket {
    packet_type: 'player_registered',
    id: string,
}

export interface ChatMessageSendPacket {
    packet_type: 'chat_message_send',
    message: string,
}

export interface ChatMessagePacket {
    packet_type: 'chat_message',
    id: string,
    message: string,
    username: string,
}

export interface SystemMessagePacket {
    packet_type: 'system_message',
    message: string,
}

export interface PlayerAttackPacket {
    packet_type: 'player_attack',
    cursor_world_pos: { x: number; y: number },
};

export interface EntityDamagePacket {
    packet_type: 'entity_damage',
    id: string,
    new_health: number,
};

export interface EntityDeathPacket {
    packet_type: 'entity_death',
    id: string,
};

export type Packet =
    EntityMovePacket |
    EntityLoadPacket |
    EntityUnloadPacket |
    TerrainChunkPacket |
    PlayerRegisterPacket |
    PlayerRegisteredPacket |
    ChatMessagePacket |
    ChatMessageSendPacket |
    SystemMessagePacket |
    PlayerAttackPacket |
    EntityDamagePacket |
    EntityDeathPacket;
