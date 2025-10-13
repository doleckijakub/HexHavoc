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

export interface EntityDestroyedPacket {
    packet_type: 'entity_destroyed',
    id: string,
}

export interface PlayerRegisterPacket {
    packet_type: 'player_register';
    game_name: string;
    username: string;
}

export interface PlayerRegisteredPacket {
    packet_type: 'player_registered',
    id: string,
    position: Vec2,
}

export type Packet = 
    EntityMovePacket | EntityLoadPacket | EntityDestroyedPacket |
    TerrainChunkPacket |
    PlayerRegisterPacket | PlayerRegisteredPacket;
