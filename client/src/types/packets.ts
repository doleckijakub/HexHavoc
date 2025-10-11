import type { Vec2 } from '@core/Vec2';
import type { Entity } from '@core/Entity';
import type { TerrainChunk } from '@type/game';

export interface EntityMovePacket {
    packet_type: 'entity_move'
    id: string,
    new_position: Vec2,
}

export interface TerrainChunkPacket { // sent whenever the player "loads it"
    packet_type: 'terrain_chunk',
    chunk: TerrainChunk,
}

export interface EntityLoadPacket {
    packet_type: 'entity_load',
    entity: Entity,
}

export interface EntityUnloadPacket {
    packet_type: 'entity_unload',
    id: string,
}

export interface PlayerRegisterPacket {
    packet_type: 'player_register';
    game_id: string;
    username: string;
}

export interface PlayerRegisteredPacket {
    packet_type: 'player_registered',
    id: string,
}

export type Packet = 
    EntityMovePacket | EntityLoadPacket | EntityUnloadPacket |
    TerrainChunkPacket |
    PlayerRegisterPacket | PlayerRegisteredPacket;
