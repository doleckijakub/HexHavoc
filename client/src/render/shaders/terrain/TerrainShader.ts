import { Shader, type Renderer } from '@render';
import { Color } from '@core';
import { terrainTileTypeToNumber, type TerrainChunk, type TerrainTileType, type TVec4 } from '@type';

import vert from './main.vert?raw';
import frag from './main.frag?raw';

const TILE_COLORS: TVec4[] = [
    Color.rgb(0, 0, 70),      // DeepWater
    Color.rgb(25, 50, 150),   // Water
    Color.rgb(230, 220, 170), // Beach
    Color.rgb(50, 180, 50),   // Grass
    Color.rgb(20, 100, 20),   // Forest
    Color.rgb(237, 151, 125), // Desert
    Color.rgb(189, 183, 107), // Savanna
    Color.rgb(0, 50, 0),      // Tundra
    Color.rgb(240, 240, 255), // Snow
    Color.rgb(130, 130, 130), // Stone
    Color.rgb(0, 150, 0),     // Jungle
    Color.rgb(40, 60, 20),    // Swamp
    Color.rgb(180, 220, 255), // Ice
];

const CHUNK_SIZE = 8;
const TILE_SIZE = 1;

const MAX_INSTANCES = 512;

export class TerrainShader extends Shader {
    private vao: WebGLVertexArrayObject;

    private offsets: Float32Array;
    private chunkIndices: Uint32Array;

    private offsetBuffer: WebGLBuffer;
    private chunkIndexBuffer: WebGLBuffer;

    private chunkTilemapTex: WebGLTexture | null = null;
    private maxLayers: number;

    constructor(private renderer: Renderer) {
        super(renderer.getContext(), vert, frag);

        this.use();

        const gl = this.gl;

        this.maxLayers = Math.max(1, MAX_INSTANCES);

        const unitQuad = new Float32Array([
            -0.5, -0.5,
             0.5, -0.5,
            -0.5,  0.5,
            -0.5,  0.5,
             0.5, -0.5,
             0.5,  0.5,
        ]);

        this.offsets = new Float32Array(MAX_INSTANCES * 2);
        this.chunkIndices = new Uint32Array(MAX_INSTANCES);

        this.vao = gl.createVertexArray()!;
        gl.bindVertexArray(this.vao);

        const unitVBO = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER, unitVBO);
        gl.bufferData(gl.ARRAY_BUFFER, unitQuad, gl.STATIC_DRAW);
        const locUnit = this.getAttribLocation('a_unitPos');
        gl.enableVertexAttribArray(locUnit);
        gl.vertexAttribPointer(locUnit, 2, gl.FLOAT, false, 0, 0);

        this.offsetBuffer = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.offsetBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, MAX_INSTANCES * 2 * 4, gl.DYNAMIC_DRAW);
        const locOffset = this.getAttribLocation('a_offset');
        gl.enableVertexAttribArray(locOffset);
        gl.vertexAttribPointer(locOffset, 2, gl.FLOAT, false, 0, 0);
        gl.vertexAttribDivisor(locOffset, 1);

        this.chunkIndexBuffer = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.chunkIndexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, MAX_INSTANCES * 4, gl.DYNAMIC_DRAW);
        const locChunkIndex = this.getAttribLocation('a_chunkIndex');
        gl.enableVertexAttribArray(locChunkIndex);
        (gl).vertexAttribIPointer(locChunkIndex, 1, gl.UNSIGNED_INT, 0, 0);
        gl.vertexAttribDivisor(locChunkIndex, 1);

        this.chunkTilemapTex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.chunkTilemapTex);

        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
        gl.texImage3D(
            gl.TEXTURE_2D_ARRAY,
            0,
            gl.R8UI,
            CHUNK_SIZE + 2,
            CHUNK_SIZE + 2,
            this.maxLayers,
            0,
            gl.RED_INTEGER,
            gl.UNSIGNED_BYTE,
            null
        );

        const zero = new Uint8Array((CHUNK_SIZE + 2) * (CHUNK_SIZE + 2));
        for (let layer = 0; layer < this.maxLayers; layer++) {
            gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
            gl.texSubImage3D(
                gl.TEXTURE_2D_ARRAY,
                0,
                0, 0, layer,
                CHUNK_SIZE + 2, CHUNK_SIZE + 2, 1,
                gl.RED_INTEGER,
                gl.UNSIGNED_BYTE,
                zero
            );
        }

        gl.bindVertexArray(null);

        gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        const locSampler = this.getUniformLocation('u_chunkTiles');
        gl.uniform1i(locSampler, 0);

        const flatColors = new Float32Array(TILE_COLORS.length * 4);
        for (let i = 0; i < TILE_COLORS.length; i++) {
            const c = TILE_COLORS[i];
            flatColors[i * 4 + 0] = c[0];
            flatColors[i * 4 + 1] = c[1];
            flatColors[i * 4 + 2] = c[2];
            flatColors[i * 4 + 3] = c[3];
        }
        const locTileColors = this.getUniformLocation('u_tileColors');
        gl.uniform4fv(locTileColors, flatColors);

        this.finish();
    }

    updateChunkLayer(layerIndex: number, textureSize: number, data: Uint8Array) {
        if (!this.chunkTilemapTex) return;
        if (layerIndex < 0 || layerIndex >= this.maxLayers) throw new Error('layerIndex out of range');

        const gl = this.gl;

        gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.chunkTilemapTex);
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
        gl.texSubImage3D(
            gl.TEXTURE_2D_ARRAY,
            0,
            0, 0, layerIndex,
            textureSize, textureSize, 1,
            gl.RED_INTEGER,
            gl.UNSIGNED_BYTE,
            data
        );
        gl.bindTexture(gl.TEXTURE_2D_ARRAY, null);
    }

    renderTerrain(terrain: Map<String, TerrainChunk>) {
        this.use();

        const gl = this.gl;

        let I = 0;
        for (const loc of terrain.keys()) {
            const chunk = terrain.get(loc);

            this.offsets[I * 2 + 0] = chunk!.position.x * CHUNK_SIZE;
            this.offsets[I * 2 + 1] = chunk!.position.y * CHUNK_SIZE;

            this.chunkIndices[I] = I; //  >>> 0;

            const buffer = new Uint8Array((CHUNK_SIZE + 2) * (CHUNK_SIZE + 2));

            let i = 0;
            for (let y = -1; y <= CHUNK_SIZE; y++) {
                for (let x = -1; x <= CHUNK_SIZE; x++, i++) {
                    const [cxs, cys] = loc.split(':');
                    const [cx, cy] = [parseInt(cxs), parseInt(cys)];

                    const [rcx, rcy] = [
                        cx + (x === -1 ? -1 : x === CHUNK_SIZE ? 1 : 0),
                        cy + (y === -1 ? -1 : y === CHUNK_SIZE ? 1 : 0),
                    ];

                    const c = terrain.get(`${rcx}:${rcy}`);

                    const [rx, ry] = [
                        (CHUNK_SIZE + x) % CHUNK_SIZE,
                        (CHUNK_SIZE + y) % CHUNK_SIZE,
                    ];

                    const j = rx + ry * CHUNK_SIZE;
                    const terrainTileType = c?.contents[j] ?? 'Ice';

                    buffer[i] = terrainTileTypeToNumber(terrainTileType);
                }
            }

            this.updateChunkLayer(I, CHUNK_SIZE + 2, buffer);

            I++;
        }

        const instanceCount = I;

        gl.bindBuffer(gl.ARRAY_BUFFER, this.offsetBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.offsets.subarray(0, instanceCount * 2));

        gl.bindBuffer(gl.ARRAY_BUFFER, this.chunkIndexBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.chunkIndices.subarray(0, instanceCount));

        const vp = this.renderer.getCameraMatrix();
        gl.uniformMatrix3fv(this.getUniformLocation("u_vp"), false, vp.arr());

        gl.uniform1f(this.getUniformLocation('u_tileSize'), TILE_SIZE);
        gl.uniform1i(this.getUniformLocation('u_chunkSize'), CHUNK_SIZE);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.chunkTilemapTex);

        gl.bindVertexArray(this.vao);
        gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, instanceCount);
        gl.bindVertexArray(null);

        this.finish();
    }
}
