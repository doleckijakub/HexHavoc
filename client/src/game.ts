import type {
    Packet,
    PlayerRegisteredPacket,
    TerrainChunkPacket,
    TerrainChunk,
    EntityLoadPacket,
    EntityMovePacket
} from '@type';

import { Renderer } from '@render';
import { Color, Vec2, type EntityType } from '@core';

import { PlayerShader } from '@render/shaders/player/PlayerShader';
import { TerrainShader } from '@render/shaders/terrain/TerrainShader';
import { HitboxShader } from '@render/shaders/hitbox/HitboxShader';
import { TextShader } from '@render/shaders/text/TextShader';
import { SpriteShader } from '@render/shaders/sprite/SpriteShader';

function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = src;
        img.onload = () => resolve(img);
        img.onerror = (err) => reject(err);
    });
}

import tilemapSrc from './textures/tilemap.png';
import { stringify } from 'querystring';
const tilemap = await loadImage(tilemapSrc);

const canvas = document.getElementById("gl") as HTMLCanvasElement;
const renderer = new Renderer(canvas);

const playerShader = new PlayerShader(renderer);
const terrainShader = new TerrainShader(renderer);
const hitboxShader = new HitboxShader(renderer);
const textShader = new TextShader(renderer);
const spriteShader = new SpriteShader(renderer, tilemap);

class Game {
    private ws: WebSocket;
    private keyboardState: Record<string, boolean> = {};

    private playerId?: string;
    private entities: Map<string, EntityType> = new Map();
    private terrain: Map<string, TerrainChunk> = new Map();

    private lastLoopTimestamp: number;
    
    // TODO: remove?
    private fpsSpan = document.getElementById('fps') as HTMLSpanElement;
    private positionSpan = document.getElementById('position') as HTMLSpanElement;
    private scaleSlider = document.getElementById("scale-slider") as HTMLInputElement;

    constructor() {
        const ws = new WebSocket(`ws://${document.location.host}/ws`);
        const pathElements = document.location.pathname.split('/');
        const gameName = pathElements[pathElements.length - 1];

        renderer.setClearColor(Color.hex('7F007F'));
        // TODO
        // renderer.setClearColor(Color.rgb(0, 0, 70));

        ws.onopen = () => {
            this.send({
                packet_type: 'player_register',
                game_name: gameName,
                username: 'player_' + Date.now(),
            });
        };

        ws.onmessage = ev => this.recv(this.parsePacket(ev));

        ws.onclose = console.warn;
        ws.onerror = console.error;

        this.ws = ws;
    }

    private parsePacket(ev: MessageEvent<any>): Packet {
        const data = JSON.parse(ev.data);
        const packet_type = data['packet_type']; 

        switch (packet_type) {
            case 'player_registered': return {
                packet_type,
                id: data['id']
            };
            case 'terrain_chunk': {
                const chunkData = data['chunk'];

                return {
                    packet_type,
                    chunk: {
                        position: Vec2.from(chunkData['position']),
                        contents: chunkData['contents']
                    }
                };
            }
            case 'entity_load': {
                const entityData = data['entity'];

                const id = entityData['id'];
                const position = Vec2.from(entityData['position']);
                const value = entityData['value'];

                let entity: EntityType;

                if (typeof value === 'string') {
                    entity = <EntityType> {
                        id,
                        position,
                        entity_type: value
                    };
                } else {
                    const entity_type = Object.keys(value)[0];
                    entity = <EntityType> {
                        id,
                        position,
                        entity_type,
                        ...value[entity_type]
                    };
                }

                return {
                    packet_type,
                    entity
                };
            }
            case 'entity_move': return {
                packet_type,
                id: data['id'],
                new_position: Vec2.from(data['new_position']),
            }
        }

        throw new Error(`Do not know how to parse packet of type "${packet_type}"`);
    }

    private onEntityLoad(packet: EntityLoadPacket) {
        this.entities.set(packet.entity.id, packet.entity);
    }

    private onEntityMove(packet: EntityMovePacket) {
        const entity = this.entities.get(packet.id);

        if (!entity) {
            console.warn(`Entity ${packet.id} does not exist`);
            return;
        }

        entity.position = packet.new_position;
    }

    private onPlayerRegistered(packet: PlayerRegisteredPacket) {
        this.playerId = packet.id;
    }

    private onTerrainChunk(packet: TerrainChunkPacket) {
        this.terrain.set(`${packet.chunk.position.x}:${packet.chunk.position.y}`, packet.chunk);
    }

    private recv(packet: Packet) {
        switch (packet.packet_type) {
            case 'entity_load': this.onEntityLoad(packet); break;
            case 'entity_move': this.onEntityMove(packet); break;
            case 'player_registered': this.onPlayerRegistered(packet); break;
            case 'terrain_chunk': this.onTerrainChunk(packet); break;
            default: console.warn(`No handler found for packet of type "${packet.packet_type}"`);
        }
    }

    private send(packet: Packet) {
        this.ws.send(JSON.stringify(packet));
    }

    private loop(now: number) {
        this.render(now);
        this.update(now);

        requestAnimationFrame(this.loop.bind(this));
    }

    private render(now: number) {
        renderer.clear();

        if (!this.playerId) return;

        const player = this.entities.get(this.playerId);
        if (!player) return;

        renderer.setCameraPosition(player.position);
        renderer.setCameraScale(Number.parseFloat(this.scaleSlider.value!));

        // render

        terrainShader.renderTerrain(this.terrain);

        for (let entity of Array.from(this.entities.values()).sort((e1, e2) => e2.position.y - e1.position.y)) {
            const { entity_type, position: { x, y } } = entity;

            switch (entity_type) {
                case 'player': playerShader.renderPlayer(entity); break;
                case 'forest_tree': spriteShader.renderSprite(x, y, 0, 2, 16); break;
                default: throw new Error(`Do not know how to render entity of type "${entity_type}"`);
            }
        }

        for (let entity of this.entities.values()) {
            if (entity.entity_type != 'player') continue;

            if (entity.id != this.playerId) textShader.renderText(
                entity.username,
                entity.position.x,
                entity.position.y + 1
            );
        }

        // hitboxes

        // for (let chunk of this.terrain.values()) {
        //     hitboxShader.renderHitbox(
        //         chunk.position.x * 8 + 3.5,
        //         chunk.position.y * 8 + 3.5,
        //         8,
        //         8
        //     );
        // }

        // for (let entity of this.entities.values()) {
        //     // TODO: switch (entity.type)
        //     hitboxShader.renderHitbox(
        //         entity.position.x,
        //         entity.position.y,
        //         0.8,
        //         0.8
        //     );
        // }
    }

    private update(now: number) {
        if (!this.playerId) return;

        const player = this.entities.get(this.playerId);
        if (!player) return;

        const dt = (now - this.lastLoopTimestamp) / 1000;
        this.lastLoopTimestamp = now;

        if (Math.floor(now / 10) % 10 == 0) this.fpsSpan.innerText = `FPS: ${Math.round(1 / dt)}`;
        this.positionSpan.innerText = `x: ${Math.round(player.position.x)} y: ${Math.round(player.position.y)}`;

        const speed = this.keyboardState["ShiftLeft"] ? 80 : 8;

        let dx = 0, dy = 0;
        if (this.keyboardState["KeyW"]) dy += 1;
        if (this.keyboardState["KeyS"]) dy -= 1;
        if (this.keyboardState["KeyA"]) dx -= 1;
        if (this.keyboardState["KeyD"]) dx += 1;

        if (dx || dy) {
            const len = Math.hypot(dx, dy);
            dx /= len; dy /= len;

            for (let loc of this.terrain.keys()) {
                const [scx, scy] = loc.split(':');
                
                const [cx, cy] = [
                    Number.parseInt(scx),
                    Number.parseInt(scy)
                ];

                const [x, y] = [
                    cx * 8 + 4,
                    cy * 8 + 4
                ];

                if (Math.hypot(player.position.x - x, player.position.y - y) > 100) {
                    this.terrain.delete(loc);
                }
            }

            for (let id of this.entities.keys()) {
                const { entity_type, position: { x, y } } = this.entities.get(id)!;
                
                if (entity_type == 'player') continue; // TODO: actually remove // TODO(server): recieve back upon load

                if (Math.hypot(player.position.x - x, player.position.y - y) > 100) {
                    this.entities.delete(id);
                }
            }

            player.position = new Vec2(
                player.position.x + dx * dt * speed,
                player.position.y + dy * dt * speed
            );

            this.send({
                packet_type: 'entity_move',
                id: this.playerId,
                new_position: player.position,
            });
        }
    }

    public run() {
        this.lastLoopTimestamp = performance.now();

        requestAnimationFrame(this.loop.bind(this));

        window.addEventListener("keydown", e => this.keyboardState[e.code] = true);
        window.addEventListener("keyup", e => this.keyboardState[e.code] = false);

        setInterval(() => this.ws.send(''), 20 * 1000);
    }
}

const game = new Game();
game.run();
