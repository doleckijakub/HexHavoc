import '@fontsource/fusion-pixel-10px-proportional-tc';

import type {
    Packet,
    PlayerRegisteredPacket,
    TerrainChunkPacket,
    TerrainChunk,
    EntityLoadPacket,
    EntityMovePacket,
    ChatMessagePacket,
    SystemMessagePacket,
    TerrainTileType
} from '@type';

import { Renderer } from '@render';
import { Color, EntityPlayer, Mat3, Vec2, type EntityType } from '@core';

import { TerrainShader } from '@render/shaders/terrain/TerrainShader';
import { HitboxShader } from '@render/shaders/hitbox/HitboxShader';
import { TextShader } from '@render/shaders/text/TextShader';
import { EntityShader } from '@render/shaders/entity/EntityShader';

let iota = 0;
const DIRECTION_N = iota++;
const DIRECTION_NE = iota++;
const DIRECTION_E = iota++;
const DIRECTION_SE = iota++;
const DIRECTION_S = iota++;
const DIRECTION_SW = iota++;
const DIRECTION_W = iota++;
const DIRECTION_NW = iota++;

const ENTITY_SIZE = 0.75;

const NON_WALKABLE_TILES = new Set<TerrainTileType>([
    "Water",
    "DeepWater",
]);

function positionDifferenceToDirection(position: Vec2, newPosition: Vec2): null|number {
    const { x, y } = newPosition.sub(position);

    const sx = Math.sign(x);
    const sy = Math.sign(y);

    switch (`${sx},${sy}`) {
        case '0,1': return DIRECTION_N;
        case '1,1': return DIRECTION_NE;
        case '1,0': return DIRECTION_E;
        case '1,-1': return DIRECTION_SE;
        case '0,-1': return DIRECTION_S;
        case '-1,-1': return DIRECTION_SW;
        case '-1,0': return DIRECTION_W;
        case '-1,1': return DIRECTION_NW;
        default: return null;
    }
}

class Game {
    private ws: WebSocket;
    private keyboardState: Record<string, boolean> = {};

    private canvas: HTMLCanvasElement;
    private renderer: Renderer;

    private terrainShader: TerrainShader;
    private hitboxShader: HitboxShader;
    private textShader: TextShader;
    private entityShader: EntityShader;

    private playerId?: string;
    private entities: Map<string, EntityType> = new Map();
    private terrain: Map<string, TerrainChunk> = new Map();

    private lastLoopTimestamp: number;

    // TODO: remove?
    private lastFpsUpdate: number = 0;
    private fpsSpan = document.getElementById('fps') as HTMLSpanElement;
    private positionSpan = document.getElementById('position') as HTMLSpanElement;
    private scaleSlider = document.getElementById("scale-slider") as HTMLInputElement;

    private chatInput = document.getElementById("game__chat__input") as HTMLInputElement;
    private chatMessages = document.getElementById("game__chat__messages") as HTMLDivElement;
    private chatFocused = false;

    private cursorTile: Vec2 | null = null;

    private constructor(ws: WebSocket) {
        this.canvas = document.getElementById("gl") as HTMLCanvasElement;
        this.renderer = new Renderer(this.canvas);

        this.terrainShader = new TerrainShader(this.renderer);
        this.hitboxShader = new HitboxShader(this.renderer);
        this.textShader = new TextShader(this.renderer);
        this.entityShader = new EntityShader(this.renderer);

        this.chatInput.addEventListener("keydown", ev => {
            if (ev.key === "Enter") {
                this.send({
                    packet_type: "chat_message_send",
                    message: this.chatInput.value,
                });
                this.chatInput.value = "";
                setTimeout(() => this.chatInput.blur(), 0);
            }

            if (ev.key === "Escape") {
                setTimeout(() => this.chatInput.blur(), 0);
            }
        });

        this.chatInput.addEventListener("focus", () => {
            this.chatFocused = true;
        });

        this.chatInput.addEventListener("blur", () => {
            this.chatFocused = false;
            this.chatInput.value = "";
        });

        this.ws = ws;
    }

    static async create(username: string, skin: number): Promise<Game> {
        return new Promise((resolve, reject) => {
            const ws = new WebSocket(`${document.location.protocol == 'https:' ? 'wss' : 'ws'}://${document.location.host}/ws`);
            const pathElements = document.location.pathname.split('/');
            const gameName = pathElements[pathElements.length - 1];

            const game = new Game(ws);

            game.renderer.setClearColor(Color.hex('7F007F'));
            // TODO
            // renderer.setClearColor(Color.rgb(0, 0, 70));

            ws.onopen = () => {
                game.send({
                    packet_type: 'player_register',
                    game_name: gameName,

                    username,
                    skin,
                });
            };

            ws.onmessage = ev => {
                const data = JSON.parse(ev.data);
                if (data.error) {
                    ws.close();
                    reject(new Error(data.error));
                }

                const packet = game.parsePacket(data);
                game.recv(packet);

                if (packet.packet_type === 'player_registered') {
                    resolve(game);
                }
            };

            ws.onclose = console.warn;
            ws.onerror = console.error;
        })
    }

    private parsePacket(data: any): Packet {
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
                    entity = <EntityType>{
                        id,
                        position,
                        entity_type: value
                    };
                } else {
                    const entity_type = Object.keys(value)[0];

                    let e = {
                        id,
                        position,
                        entity_type,
                        ...value[entity_type]
                    };

                    if (entity_type === 'player') {
                        e.previous_position = position;
                        e.direction = DIRECTION_S;
                    }

                    entity = <EntityType>e;
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
            case 'chat_message': return {
                packet_type,
                id: data['id'],
                username: data['username'],
                message: data['message'],
            }
            case 'system_message': return {
                packet_type,
                message: data['message'],
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
        const chatbox = document.getElementById('game__chat');
        if (chatbox) {
            chatbox.style.display = 'flex';
        }
    }

    private onTerrainChunk(packet: TerrainChunkPacket) {
        this.terrain.set(`${packet.chunk.position.x}:${packet.chunk.position.y}`, packet.chunk);
    }

    private onChatMessage(packet: ChatMessagePacket) {
        const message = document.createElement('div');
        message.classList.add('game__chat__message');
        const playerName = document.createElement('span');
        playerName.textContent = packet.username;
        playerName.classList.add('game__chat__message__username');
        message.appendChild(playerName);
        const playerMessage = document.createElement('span');
        playerMessage.textContent = `: ${packet.message}`;
        message.appendChild(playerMessage);

        this.chatMessages.appendChild(message);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    private onSystemMessage(packet: SystemMessagePacket) {
        const message = document.createElement('div');
        message.classList.add('game__chat__message');
        const systemMessage = document.createElement('span');
        systemMessage.textContent = packet.message;
        systemMessage.classList.add('game__chat__message__system');
        message.appendChild(systemMessage);

        this.chatMessages.appendChild(message);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    private recv(packet: Packet) {
        switch (packet.packet_type) {
            case 'entity_load': this.onEntityLoad(packet); break;
            case 'entity_move': this.onEntityMove(packet); break;
            case 'player_registered': this.onPlayerRegistered(packet); break;
            case 'terrain_chunk': this.onTerrainChunk(packet); break;
            case 'chat_message': this.onChatMessage(packet); break;
            case 'system_message': this.onSystemMessage(packet); break;
            default: console.warn(`No handler found for packet of type "${packet.packet_type}"`);
        }
    }

    private send(packet: Packet) {
        this.ws.send(JSON.stringify(packet));
    }

    private getPlayer(): EntityPlayer | null {
        if (!this.playerId) return null;

        const player = this.entities.get(this.playerId);
        if (!player) return null;

        if (player.entity_type !== 'player') throw new Error("Player is not a player");

        return player;
    }

    private getTerrainTileAt(pos: Vec2): TerrainTileType | null {
        pos = new Vec2(pos.x + 0.5, pos.y + 0.5);
        
        const cx = Math.floor(pos.x / 8);
        const cy = Math.floor(pos.y / 8);

        const chunk = this.terrain.get(`${cx}:${cy}`);
        if (!chunk) return null;

        const lx = Math.floor(pos.x - cx * 8);
        const ly = Math.floor(pos.y - cy * 8);

        if (lx < 0 || ly < 0 || lx >= 8 || ly >= 8) return null;

        const index = ly * 8 + lx;
        return chunk.contents[index] ?? null;
    }

    private loop(now: number) {
        this.render(now);
        this.update(now);

        requestAnimationFrame(this.loop.bind(this));
    }

    private render(now: number) {
        this.renderer.clear();

        if (!this.playerId) return;

        const player = this.getPlayer();
        if (!player) return;

        this.renderer.setCameraPosition(player.position);
        this.renderer.setCameraScale(Number.parseFloat(this.scaleSlider.value!));

        // render

        this.terrainShader.renderTerrain(this.terrain);

        for (let entity of this.entities.values()) this.entityShader.dispatchEntityRender(entity);
        this.entityShader.renderDispatchedEntities();

        for (let entity of this.entities.values()) {
            if (entity.entity_type != 'player') continue;

            if (entity.id != this.playerId) {
                this.textShader.renderText(
                    entity.username,
                    entity.position.x,
                    entity.position.y + 1
                );
            }
        }

        // hitboxes

        // for (const ent of this.entities.values()) {
        //     const dx = this.getPlayer()!.position.x - ent.position.x;
        //     const dy = this.getPlayer()!.position.y - ent.position.y;

        //     if (Math.hypot(dx, dy) > 8) continue;

        //     this.hitboxShader.renderHitbox(
        //         ent.position.x,
        //         ent.position.y,
        //         ENTITY_SIZE
        //     );
        // }

        // cursor

        if (this.cursorTile) {
            this.hitboxShader.renderHitbox(
                this.cursorTile.x,
                this.cursorTile.y,
                1
            );
        }
    }

    private resolveCollisions(pos: Vec2): Vec2 {
        let corrected = new Vec2(pos.x, pos.y);

        for (const [id, ent] of this.entities) {
            if (id === this.playerId) continue;

            const dx = corrected.x - ent.position.x;
            const dy = corrected.y - ent.position.y;

            if (Math.hypot(dx, dy) > 8) continue;

            const overlapX = ENTITY_SIZE - Math.abs(dx);
            const overlapY = ENTITY_SIZE - Math.abs(dy);

            if (overlapX <= 0 || overlapY <= 0) continue;

            if (overlapX < overlapY) {
                corrected = new Vec2(
                    corrected.x + Math.sign(dx) * overlapX,
                    corrected.y
                );
            } else {
                corrected = new Vec2(
                    corrected.x,
                    corrected.y + Math.sign(dy) * overlapY
                );
            }
        }

        return corrected;
    }

    private update(now: number) {
        if (!this.playerId) return;

        const player = this.getPlayer();
        if (!player) return;

        const dt = (now - this.lastLoopTimestamp) / 1000;
        this.lastLoopTimestamp = now;

        if (now - this.lastFpsUpdate > 100) {
            this.fpsSpan.innerText = `FPS: ${Math.round(1 / dt)}`;
            this.lastFpsUpdate = now;
        }
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

            dx *= dt * speed;
            dy *= dt * speed;

            if (NON_WALKABLE_TILES.has(this.getTerrainTileAt(
                new Vec2(
                    player.position.x + dx,
                    player.position.y
                )
            )!)) dx = 0;

            if (NON_WALKABLE_TILES.has(this.getTerrainTileAt(
                new Vec2(
                    player.position.x,
                    player.position.y + dy
                )
            )!)) dy = 0;

            const desiredPosition = new Vec2(
                player.position.x + dx,
                player.position.y + dy
            );

            player.position = this.resolveCollisions(desiredPosition);

            this.send({
                packet_type: 'entity_move',
                id: this.playerId,
                new_position: player.position,
            });
        }
    }

    animate() {
        for (let entity of this.entities.values()) {
            if (entity.entity_type === 'player') {
                const direction = positionDifferenceToDirection(entity.previous_position, entity.position);
                if (direction !== null) entity.direction = direction;

                const animationFrame = direction === null
                    ? 1
                    : ((): number => {
                        const time = performance.now() / 1000;
                        const stepDuration = 0.1;
                        const phase = (time / stepDuration) % 4;

                        return [0, 1, 2, 1][Math.floor(phase)];
                    })();

                entity.animation_frame = animationFrame;
                entity.previous_position = entity.position;
            }
        }
    }

    private screenToWorld(mx: number, my: number): Vec2 {
        const rect = this.canvas.getBoundingClientRect();

        const x = (mx / rect.width) * 2 - 1;
        const y = 1 - (my / rect.height) * 2;

        const v = new Float32Array([x, y, 1]);

        const inv = Mat3.invert(this.renderer.getCameraMatrix());

        const wx =
            inv.arr()[0] * v[0] +
            inv.arr()[3] * v[1] +
            inv.arr()[6] * v[2];

        const wy =
            inv.arr()[1] * v[0] +
            inv.arr()[4] * v[1] +
            inv.arr()[7] * v[2];

        return new Vec2(wx, wy);
    }

    private updateCursorFromMouse(ev: MouseEvent) {
        const rect = this.canvas.getBoundingClientRect();

        const mx = ev.clientX - rect.left;
        const my = ev.clientY - rect.top;

        const world = this.screenToWorld(mx, my);

        this.cursorTile = new Vec2(
            Math.floor(world.x + 0.5),
            Math.floor(world.y + 0.5)
        );
    }

    public run() {
        this.lastLoopTimestamp = performance.now();

        requestAnimationFrame(this.loop.bind(this));

        window.addEventListener("keydown", e => {
            this.keyboardState[e.code] = true && !this.chatFocused;

            if (e.code === 'Enter' && !this.chatFocused) {
                e.preventDefault();
                this.chatInput.focus();
            }
        });

        window.addEventListener("keyup", e => {
            this.keyboardState[e.code] = false && !this.chatFocused;
        });

        this.canvas.addEventListener("mousemove", ev => {
            this.updateCursorFromMouse(ev);
        });

        this.canvas.addEventListener("mouseleave", () => {
            this.cursorTile = null;
        });

        setInterval(() => this.ws.send(''), 20 * 1000);
        setInterval(this.animate.bind(this), 100);
    }
}

function startGame() {
    const formDiv = document.getElementById('form')! as HTMLDivElement;
    const gameDiv = document.getElementById('game')! as HTMLDivElement;

    const usernameInput = formDiv.querySelector('input[name=username]') as HTMLInputElement;
    const skinInput = formDiv.querySelector('input[name=skin]') as HTMLInputElement;

    const form = formDiv.querySelector('form')!;
    form.addEventListener('submit', async ev => {
        ev.preventDefault();

        const username = usernameInput.value.trim();
        if (!username) {
            alert('Please enter a username');
            return;
        }

        const skin = parseInt(skinInput.value);

        formDiv.remove();
        gameDiv.removeAttribute('style');

        try {
            const game = await Game.create(username, skin);
            game.run();
        } catch (err: any) {
            alert(`Registration failed: ${err.message}`);
            window.location.reload();
        }
    });
}

if (document.readyState !== 'loading') {
    startGame();
} else {
    window.addEventListener('DOMContentLoaded', startGame);
}
