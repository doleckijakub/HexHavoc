import type { Vec2 } from "./Vec2";

enum TerrainEntityType {
    TREE,
    STONE,
}

type EntityType = TerrainEntityType;

export class Entity {
    id: string;
    pos: Vec2;
    ty: EntityType;
}
