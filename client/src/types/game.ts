import type { Vec2 } from '@core/Vec2';

enum TerrainTileType {
    EMPTY,
    GRASS,
    DIRT,
    SAND,
    CLAY,
}

export interface TerrainChunk {
    position: Vec2,
    contents: TerrainTileType[],
}
