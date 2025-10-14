import { Shader, type Renderer } from '@render';
import { Color } from '@core';
import { terrainTypeTypeToNumber, type TerrainChunk, type TerrainTileType, type TVec4 } from '@type';

import vert from './main.vert?raw';
import frag from './main.frag?raw';

const TILE_COLORS: TVec4[] = [
    Color.rgb(0, 0, 70),
    Color.rgb(25, 50, 150),
    Color.rgb(230, 220, 170),
    Color.rgb(50, 180, 50),
    Color.rgb(20, 100, 20),
    Color.rgb(237, 151, 125),
    Color.rgb(189, 183, 107),
    Color.rgb(0, 50, 0),
    Color.rgb(240, 240, 255),
    Color.rgb(130, 130, 130),
    Color.rgb(0, 150, 0),
    Color.rgb(40, 60, 20),
    Color.rgb(180, 220, 255),
];

export class TerrainShader extends Shader {
    private vao: WebGLVertexArrayObject;

    private offsets: Float32Array;
    private scales: Float32Array;
    private colors: Float32Array;

    private offsetBuffer: WebGLBuffer;
    private scaleBuffer: WebGLBuffer;
    private colorBuffer: WebGLBuffer;

    constructor(private renderer: Renderer) {
        super(renderer.getContext(), vert, frag);

        this.use();

        const gl = this.gl;

        const maxInstances = 65536;

        const unitQuad = new Float32Array([
            -0.5, -0.5,
             0.5, -0.5,
            -0.5,  0.5,
            -0.5,  0.5,
             0.5, -0.5,
             0.5,  0.5,
        ]);

        this.offsets = new Float32Array(maxInstances * 2);
        this.scales  = new Float32Array(maxInstances * 2);
        this.colors  = new Float32Array(maxInstances * 4);

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
        gl.bufferData(gl.ARRAY_BUFFER, maxInstances * 2 * 4, gl.DYNAMIC_DRAW);
        const locOffset = this.getAttribLocation('a_offset');
        gl.enableVertexAttribArray(locOffset);
        gl.vertexAttribPointer(locOffset, 2, gl.FLOAT, false, 0, 0);
        gl.vertexAttribDivisor(locOffset, 1);

        this.scaleBuffer = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.scaleBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, maxInstances * 2 * 4, gl.DYNAMIC_DRAW);
        const locScale = this.getAttribLocation('a_scale');
        gl.enableVertexAttribArray(locScale);
        gl.vertexAttribPointer(locScale, 2, gl.FLOAT, false, 0, 0);
        gl.vertexAttribDivisor(locScale, 1);

        this.colorBuffer = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, maxInstances * 4 * 4, gl.DYNAMIC_DRAW);
        const locColor = this.getAttribLocation('a_color');
        gl.enableVertexAttribArray(locColor);
        gl.vertexAttribPointer(locColor, 4, gl.FLOAT, false, 0, 0);
        gl.vertexAttribDivisor(locColor, 1);

        gl.bindVertexArray(null);

        this.finish();
    }

    renderTerrain(chunks: TerrainChunk[]) {
        this.use();

        const gl = this.gl;

        const TILE_SIZE = 1;
        const CHUNK_SIZE = 8;

        let I = 0;
        for (const chunk of chunks) {
            for (let i = 0; i < chunk.contents.length; i++, I++) {
                const tileType = chunk.contents[i];

                const localX = i % CHUNK_SIZE;
                const localY = Math.floor(i / CHUNK_SIZE);

                this.offsets[I * 2 + 0] = chunk.position.x * CHUNK_SIZE + localX;
                this.offsets[I * 2 + 1] = chunk.position.y * CHUNK_SIZE + localY;

                this.scales[I * 2 + 0] = TILE_SIZE;
                this.scales[I * 2 + 1] = TILE_SIZE;

                this.colors.set(TILE_COLORS[terrainTypeTypeToNumber(tileType)], I * 4);
            }
        }

        const instanceCount = I;

        gl.bindBuffer(gl.ARRAY_BUFFER, this.offsetBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.offsets.subarray(0, instanceCount * 2));
        gl.bindBuffer(gl.ARRAY_BUFFER, this.scaleBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.scales.subarray(0, instanceCount * 2));
        gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.colors.subarray(0, instanceCount * 4));

        const vp = this.renderer.getCameraMatrix();
        gl.uniformMatrix3fv(this.getUniformLocation("u_vp"), false, vp.arr());

        gl.bindVertexArray(this.vao);
        gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, instanceCount);
        gl.bindVertexArray(null);

        this.finish();
    }
}