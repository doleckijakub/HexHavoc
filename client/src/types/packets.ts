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

export interface PlayerRegisterPacket {
    packet_type: 'player_register';
    game_name: string;
    username: string;
}

export interface PlayerRegisteredPacket {
    packet_type: 'player_registered',
    id: string,
}

export type Packet = 
    EntityMovePacket | EntityLoadPacket |
    TerrainChunkPacket |
    PlayerRegisterPacket | PlayerRegisteredPacket;
