import type { Vec2 } from "./Vec2";

export class Entity {
    id: string;
    position: Vec2;
}

export class EntityPlayer extends Entity {
    entity_type: 'player';
    username: string;
    skin: number;

    previous_position: Vec2;
    direction: number;
    animation_frame: number;
}

export class EntityForestTree extends Entity {
    entity_type: 'forest_tree';
}

export type EntityType =
    EntityPlayer |
    EntityForestTree;