import { Shader, type Renderer } from '@render';
import type { EntityType, Vec2 } from '@core';

import vert from './main.vert?raw';
import frag from './main.frag?raw';

function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = src;
        img.onload = () => resolve(img);
        img.onerror = (err) => reject(err);
    });
}

import tilemap0 from '../../../textures/tilemap_world_entities.png';
import tilemap1 from '../../../textures/tilemap_player.png';

const TILEMAPS: Tilemap[] = [
    { image: await loadImage(tilemap0), spritesPerWidth: 16, spritesPerHeight: 16 },
    { image: await loadImage(tilemap1), spritesPerWidth: 8, spritesPerHeight: 12 },
];

const SPRITE_MAP: Map<string, { layer: number, x: number, y: number, w: number, h: number }> = new Map([
    [ 'forest_tree', { layer: 0, x: 0, y: 0, w: 1, h: 2 } ],
    [ 'spruce_tree', { layer: 0, x: 1, y: 0, w: 1, h: 2 } ],
    [ 'jungle_tree', { layer: 0, x: 2, y: 0, w: 1, h: 2 } ],
    [ 'cactus',      { layer: 0, x: 3, y: 0, w: 1, h: 2 } ],
    [ 'tree_stump',  { layer: 0, x: 4, y: 1, w: 1, h: 1 } ],
    [ 'ice_spike',   { layer: 0, x: 5, y: 0, w: 1, h: 2 } ],
    [ 'bush',        { layer: 0, x: 6, y: 1, w: 1, h: 1 } ],
    [ 'stone',       { layer: 0, x: 7, y: 1, w: 1, h: 1 } ],
    [ 'big_stone',   { layer: 0, x: 8, y: 1, w: 1, h: 1 } ],
    [ 'tree_log',    { layer: 0, x: 9, y: 1, w: 1, h: 1 } ],
    [ 'tall_grass',  { layer: 0, x: 10, y: 1, w: 1, h: 1 } ],
    [ 'sea_shell',   { layer: 0, x: 11, y: 1, w: 1, h: 1 } ],
]);

interface SpriteInstance {
    x: number;
    y: number;
    spriteX: number;
    spriteY: number;
    spriteW: number;
    spriteH: number;
}

export interface Tilemap {
    image: HTMLImageElement;
    spritesPerWidth: number;
    spritesPerHeight: number;
}

export class EntityShader extends Shader {
    private vao: WebGLVertexArrayObject;
    private instanceBuffer: WebGLBuffer;

    private textures: WebGLTexture[] = [];
    private textureSizes: [number, number][] = [];
    private grids: { w: number; h: number }[] = [];

    private instanceBatches: SpriteInstance[][] = [];

    constructor(private renderer: Renderer) {
        const gl = renderer.getContext();
        super(gl, vert, frag);

        for (const t of TILEMAPS) {
            const tex = gl.createTexture()!;
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, t.image);

            this.textures.push(tex);
            this.textureSizes.push([ t.image.width, t.image.height ]);
            this.grids.push({ w: t.spritesPerWidth, h: t.spritesPerHeight });

            this.instanceBatches.push([]);
        }

        const quadVerts = new Float32Array([
            -0.5, 0.0, 0, 0,
             0.5, 0.0, 1, 0,
            -0.5, 1.0, 0, 1,

            -0.5, 1.0, 0, 1,
             0.5, 0.0, 1, 0,
             0.5, 1.0, 1, 1,
        ]);

        this.vao = gl.createVertexArray()!;
        gl.bindVertexArray(this.vao);

        const vbo = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        gl.bufferData(gl.ARRAY_BUFFER, quadVerts, gl.STATIC_DRAW);

        const a_pos = this.getAttribLocation('a_pos');
        const a_uv = this.getAttribLocation('a_uv');

        gl.enableVertexAttribArray(a_pos);
        gl.vertexAttribPointer(a_pos, 2, gl.FLOAT, false, 16, 0);

        gl.enableVertexAttribArray(a_uv);
        gl.vertexAttribPointer(a_uv, 2, gl.FLOAT, false, 16, 8);

        this.instanceBuffer = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);

        const a_instancePos = this.getAttribLocation('a_instancePos');
        const a_instanceFrame = this.getAttribLocation('a_instanceFrame');
        const stride = 6 * 4;

        gl.enableVertexAttribArray(a_instancePos);
        gl.vertexAttribPointer(a_instancePos, 2, gl.FLOAT, false, stride, 0);
        gl.vertexAttribDivisor(a_instancePos, 1);

        gl.enableVertexAttribArray(a_instanceFrame);
        gl.vertexAttribPointer(a_instanceFrame, 4, gl.FLOAT, false, stride, 8);
        gl.vertexAttribDivisor(a_instanceFrame, 1);

        gl.bindVertexArray(null);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }
    
    private dispatchSpriteRender(
        x: number,
        y: number,
        tilemap: number,
        spriteX: number,
        spriteY: number,
        spriteW: number = 1,
        spriteH: number = 1
    ) {
        const batch = this.instanceBatches[tilemap];
        if (!batch) throw new Error(`Tilemap index ${tilemap} out of range`);
        batch.push({ x, y, spriteX, spriteY, spriteW, spriteH });
    }

    dispatchEntityRender(
        entity: EntityType
    ) {
        const { entity_type, position: { x, y }, health } = entity;

        const sprite = SPRITE_MAP.get(entity_type);
        if (sprite) {
            return this.dispatchSpriteRender(x, y - 0.5, sprite.layer, sprite.x, sprite.y, sprite.w, sprite.h);
        }

        switch (entity_type) {
            case 'player': {
                return this.dispatchSpriteRender(
                    x, y,
                    1,
                    entity.direction,
                    4 * entity.skin + 1 + entity.animation_frame
                );
            }
            default: throw new Error(`Do not know how to render entity of type "${entity_type}"`);
        }
    }

    renderDispatchedEntities() {
        const gl = this.gl;

        this.use();

        const vp = this.renderer.getCameraMatrix();
        const u_vp = this.getUniformLocation('u_vp');
        const u_spriteGrid = this.getUniformLocation('u_spriteGrid');
        const u_spriteSheet = this.getUniformLocation('u_spriteSheet');
        const u_textureSize = this.getUniformLocation('u_textureSize');

        gl.uniformMatrix3fv(u_vp, false, vp.arr());

        gl.enable(gl.BLEND);
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LESS);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.bindVertexArray(this.vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);

        for (let i = 0; i < this.textures.length; i++) {
            const instances = this.instanceBatches[i];
            if (instances.length === 0) continue;

            const grid = this.grids[i];
            gl.uniform2f(u_spriteGrid, grid.w, grid.h);

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.textures[i]);
            gl.uniform1i(u_spriteSheet, 0);
            gl.uniform2fv(u_textureSize, this.textureSizes[i]);

            const data = new Float32Array(instances.length * 6);
            for (let j = 0; j < instances.length; j++) {
                const s = instances[j];
                data.set([s.x, s.y, s.spriteX, s.spriteY, s.spriteW, s.spriteH], j * 6);
            }

            gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
            gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, instances.length);
        }

        gl.bindVertexArray(null);
        gl.disable(gl.BLEND);

        for (const b of this.instanceBatches) b.length = 0;
        
        this.finish();
    }
}
