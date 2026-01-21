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

export function terrainTileTypeToNumber(ttt: TerrainTileType): number {
    return {
        DeepWater: 0,
        Water: 1,
        Beach: 2,
        Grass: 3,
        Forest: 4,
        Desert: 5,
        Savanna: 6,
        Tundra: 7,
        Snow: 8,
        Stone: 9,
        Jungle: 10,
        Swamp: 11,
        Ice: 12,
    }[ttt];
}

export interface TerrainChunk {
    position: Vec2,
    contents: TerrainTileType[],
}

export type Item =
    | "iron_sword"
    | "iron_pickaxe"
    | "iron_axe";

export function itemToNumber(item: Item): number {
    return {
        "iron_sword": 0,
        "iron_pickaxe": 1,
        "iron_axe": 2,
    }[item]!;
}

export interface Inventory {
    slots: [Item | null],
    selected: number,
}