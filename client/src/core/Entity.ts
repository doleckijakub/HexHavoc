import type { Vec2 } from "./Vec2";

export class EntityTypePlayer {
    username: string;
};

export type EntityType =
    { player: EntityTypePlayer };

export class Entity {
    id: string;
    position: Vec2;
    value: EntityType;
}
