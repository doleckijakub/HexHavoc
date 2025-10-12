import type { Vec2 } from '@core/Vec2';

export type TerrainTileType = 
    "DeepWater" |
    "Water" |
    "Beach" |
    "Grass" |
    "Forest" |
    "Desert" |
    "Savanna" |
    "Tundra" |
    "Snow" |
    "Stone" |
    "Jungle" |
    "Swamp" |
    "Ice";

export interface TerrainChunk {
    position: Vec2,
    contents: TerrainTileType[],
}
