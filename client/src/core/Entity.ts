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

export class EntitySpruceTree extends Entity {
    entity_type: 'spruce_tree';
}

export class EntityJungleTree extends Entity {
    entity_type: 'jungle_tree';
}

export class EntityCactus extends Entity {
    entity_type: 'cactus';
}

export class EntityTreeStump extends Entity {
    entity_type: 'tree_stump';
}

export class EntityIceSpike extends Entity {
    entity_type: 'ice_spike';
}

export class EntityBush extends Entity {
    entity_type: 'bush';
}

export class EntityStone extends Entity {
    entity_type: 'stone';
}

export class EntityBigStone extends Entity {
    entity_type: 'big_stone';
}

export class EntityTreeLog extends Entity {
    entity_type: 'tree_log';
}

export class EntityTallGrass extends Entity {
    entity_type: 'tall_grass';
}

export class EntitySeaShell extends Entity {
    entity_type: 'sea_shell';
}


export type EntityType =
    EntityPlayer |
    EntityForestTree |
    EntitySpruceTree |
    EntityJungleTree |
    EntityCactus |
    EntityTreeStump |
    EntityIceSpike |
    EntityBush |
    EntityStone |
    EntityBigStone |
    EntityTreeLog |
    EntityTallGrass |
    EntitySeaShell;
