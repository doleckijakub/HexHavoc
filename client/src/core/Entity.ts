import type { Vec2 } from "./Vec2";

export class Entity {
    id: string;
    position: Vec2;
}

export class EntityPlayer extends Entity {
    entity_type: 'player';
    username: string;
    direction: number;
}

export class EntityForestTree extends Entity {
    entity_type: 'forest_tree';
}

export type EntityType =
    EntityPlayer |
    EntityForestTree;