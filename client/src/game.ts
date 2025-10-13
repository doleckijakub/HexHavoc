import type {
    Packet,
    PlayerRegisteredPacket,
    TerrainChunkPacket,
    TerrainChunk,
    EntityLoadPacket,
    EntityMovePacket
} from '@type';

import { Renderer, ShaderManager } from '@render';
import { Color, Vec2, Vec4, type Entity } from '@core';

const canvas = document.getElementById("gl") as HTMLCanvasElement;
const renderer = new Renderer(canvas);
const shaderManager = new ShaderManager(renderer.getContext());

shaderManager.add("terrain", `
attribute vec2 a_unitPos;
attribute vec2 a_offset;
attribute vec2 a_scale;
attribute vec4 a_color;

attribute vec4 a_colorLeft;
attribute vec4 a_colorRight;
attribute vec4 a_colorUp;
attribute vec4 a_colorDown;

uniform mat3 u_vp;

varying vec4 v_color;
varying vec4 v_left;
varying vec4 v_right;
varying vec4 v_up;
varying vec4 v_down;
varying vec2 v_uv;

void main() {
  vec2 world = a_unitPos * a_scale + a_offset;
  vec3 clip = u_vp * vec3(world, 1.0);

  gl_Position = vec4(clip.xy, 0.0, 1.0);
  v_color = a_color;
  v_left = a_colorLeft;
  v_right = a_colorRight;
  v_up = a_colorUp;
  v_down = a_colorDown;

  v_uv = a_unitPos + 0.5;
}
`, `
precision mediump float;

varying vec4 v_color;
varying vec4 v_left;
varying vec4 v_right;
varying vec4 v_up;
varying vec4 v_down;
varying vec2 v_uv;

const vec4 COLOR_WATER = vec4(25.0, 50.0, 150.0, 255.0) / 255.0;
const vec4 COLOR_DEEP_WATER = vec4(0.0, 0.0, 70.0, 255.0) / 255.0;

const vec4 COLOR_SIDE_0 = vec4(79.0, 51.0, 9.0, 255.0) / 255.0;
const vec4 COLOR_SIDE_1 = vec4(110.0, 71.0, 14.0, 255.0) / 255.0;

void main() {
  float border = 1.0 / 16.0;

  float x = v_uv.x;
  float y = v_uv.y;

  vec4 color = v_color;

  if (distance(v_left, COLOR_DEEP_WATER) < 0.1 || distance(v_right, COLOR_DEEP_WATER) < 0.1 || distance(v_up, COLOR_DEEP_WATER) < 0.1 || distance(v_down, COLOR_DEEP_WATER) < 0.1) {
    color = (v_color + v_left + v_right + v_up + v_down) / 5.0;
  }

  if (distance(v_color, COLOR_WATER) < 0.1 && v_color != v_up && distance(v_up, COLOR_DEEP_WATER) > 0.1) {
    vec4 color_side = x < 0.25 ? COLOR_SIDE_0 : x < 0.5 ? COLOR_SIDE_1 : x < 0.75 ? COLOR_SIDE_0 : COLOR_SIDE_1;
    color_side = (color_side + v_up) / 2.0;
    gl_FragColor = y > 1.0 - border ? color_side / 2.0 : y > 0.35 ? color_side : y > 0.35 - border ? vec4(vec3(0.8), 1.0) : v_color;
    return;
  }

  bool drawBorder = false;

  if (distance(v_color, COLOR_WATER) > 0.1) {
    if (x < border && v_color != v_left) drawBorder = true;
    if (x > 1.0 - border && v_color != v_right) drawBorder = true;
    if (y > 1.0 - border && v_color != v_up) drawBorder = true;
    if (y < border && v_color != v_down) drawBorder = true;
  }

  gl_FragColor = drawBorder ? color / 1.5 : color;
}

`);

const terrainShader = shaderManager.get("terrain");

class Game {
    private ws: WebSocket;
    private keys: Record<string, boolean> = {};

    private playerId?: string;
    private entities: Map<string, Entity> = new Map();
    private terrain: Map<string, TerrainChunk> = new Map();

    constructor() {
        const ws = new WebSocket(`ws://${document.location.host}/ws`);
        const pathElements = document.location.pathname.split('/');
        const gameName = pathElements[pathElements.length - 1];

        renderer.useShader(terrainShader);
        renderer.initTerrainRenderer();

        ws.onopen = () => {
            this.send({
                packet_type: 'player_register',
                game_name: gameName,
                username: 'player_' + Date.now(),
            });
        };

        ws.onmessage = ev => this.recv(JSON.parse(ev.data));

        ws.onclose = console.warn;
        ws.onerror = console.error;

        this.ws = ws;
    }

    private onEntityLoad(packet: EntityLoadPacket) {
        this.entities.set(packet.entity.id, packet.entity);
    }

    private onEntityMove(packet: EntityMovePacket) {
        const entity = this.entities.get(packet.id);
        if (!entity) console.error(`Entity ${packet.id} does not exist and thus cannot be moved`);
        entity!.position = packet.new_position;
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

    private render(now: number) {
        renderer.scale = Number.parseFloat((document.querySelector("#scale-slider") as HTMLInputElement).value || '32');

        renderer.clear();

        if (this.playerId) {
            const player = this.entities.get(this.playerId);

            renderer.useShader(terrainShader);

            const camera = player!.position;

            renderer.setCamera(camera);

            renderer.drawTerrain(Array.from(this.terrain.values()));

            for (let entity of this.entities.values()) {
                const { x, y } = entity.position;
                renderer.drawSquare(x, y, 0.8, Color.hex('cf4345'));
            }

            this.update(now);
        }

        requestAnimationFrame(this.render.bind(this));
    }

    private last = performance.now();
    
    private fpsSpan = document.getElementById('fps') as HTMLSpanElement;
    private positionSpan = document.getElementById('position') as HTMLSpanElement;

    private update(now: number) {
        if (!this.playerId) return;

        const player = this.entities.get(this.playerId);
        if (!player) return;

        const dt = (now - this.last) / 1000;
        this.last = now;

        this.fpsSpan.innerText = `FPS: ${Math.round(1 / dt)}`;
        this.positionSpan.innerText = `x: ${Math.round(player.position.x)} y: ${Math.round(player.position.y)}`;

        const speed = this.keys["ShiftLeft"] ? 50 : 5;

        let dx = 0, dy = 0;
        if (this.keys["KeyW"]) dy += 1;
        if (this.keys["KeyS"]) dy -= 1;
        if (this.keys["KeyA"]) dx -= 1;
        if (this.keys["KeyD"]) dx += 1;

        if (dx || dy) {
            const len = Math.hypot(dx, dy);
            dx /= len; dy /= len;

            player.position = new Vec2(
                player.position.x + dx * dt * speed,
                player.position.y + dy * dt * speed
            );

            for (let loc of this.terrain.keys()) {
                const [scx, scy] = loc.split(':');
                const [cx, cy] = [Number.parseInt(scx), Number.parseInt(scy)];
                const [x, y] = [cx * 8, cy * 8];

                if (Math.hypot(x - player.position.x, y - player.position.y) > 100) {
                    this.terrain.delete(loc);
                }
            }

            this.send({
                packet_type: 'entity_move',
                id: this.playerId,
                new_position: player.position,
            });
        }
    }

    public run() {
        requestAnimationFrame(this.render.bind(this));

        window.addEventListener("keydown", e => this.keys[e.code] = true);
        window.addEventListener("keyup", e => this.keys[e.code] = false);
    }
}

const game = new Game();
game.run();
