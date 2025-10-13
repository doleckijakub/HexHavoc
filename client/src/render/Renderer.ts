import { Vec2, Mat3, Vec4, Color } from '@core';
import { Shader } from '@render';
import type { TerrainChunk, TerrainTileType, TVec4 } from '@type';

interface TerrainRenderer {
    vao: WebGLVertexArrayObject;
    offsets: Float32Array;
    scales: Float32Array;
    colors: Float32Array;
    offsetBuffer: WebGLBuffer;
    scaleBuffer: WebGLBuffer;
    colorBuffer: WebGLBuffer;
}

const TILE_COLORS: Record<TerrainTileType, TVec4> = {
    [ "DeepWater" ]: Color.rgb(0, 0, 70),
    [ "Water" ]: Color.rgb(25, 50, 150),
    [ "Beach" ]: Color.rgb(230, 220, 170),
    [ "Grass" ]: Color.rgb(50, 180, 50),
    [ "Forest" ]: Color.rgb(20, 100, 20),
    [ "Desert" ]: Color.rgb(237, 151, 125),
    [ "Savanna" ]: Color.rgb(189, 183, 107),
    [ "Tundra" ]: Color.rgb(0, 50, 0),
    [ "Snow" ]: Color.rgb(240, 240, 255),
    [ "Stone" ]: Color.rgb(130, 130, 130),
    [ "Jungle" ]: Color.rgb(0, 150, 0),
    [ "Swamp" ]: Color.rgb(40, 60, 20),
    [ "Ice" ]: Color.rgb(180, 220, 255),
};

export class Renderer {
    private gl: WebGL2RenderingContext;
    private currentShader: Shader | null = null;
    private camera: Vec2 = new Vec2(0, 0);
    private terrainRenderer!: TerrainRenderer;

    constructor(private canvas: HTMLCanvasElement) {
        const gl = canvas.getContext("webgl2");
        if (!gl) throw new Error("WebGL not supported");
        this.gl = gl;
        this.resize();
        window.addEventListener("resize", () => this.resize());
    }

    getContext() {
        return this.gl;
    }

    setCamera(camera: Vec2) {
        this.camera = camera;
    }

    useShader(shader: Shader) {
        this.currentShader = shader;
        shader.use();
    }

    clear() {
        const gl = this.gl;
        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        gl.clearColor(0.1, 0.1, 0.1, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
    }

    private createTerrainRenderer(): TerrainRenderer {
        const gl = this.gl;
        if (!this.currentShader) throw new Error("No shader bound");

        const maxInstances = 65536;

        const unitQuad = new Float32Array([
            -0.5, -0.5,
             0.5, -0.5,
            -0.5,  0.5,
            -0.5,  0.5,
             0.5, -0.5,
             0.5,  0.5,
        ]);

        const offsets = new Float32Array(maxInstances * 2);
        const scales  = new Float32Array(maxInstances * 2);
        const colors  = new Float32Array(maxInstances * 4);

        const vao = gl.createVertexArray()!;
        gl.bindVertexArray(vao);

        const unitVBO = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER, unitVBO);
        gl.bufferData(gl.ARRAY_BUFFER, unitQuad, gl.STATIC_DRAW);
        const locUnit = this.currentShader.getAttribLocation('a_unitPos');
        gl.enableVertexAttribArray(locUnit);
        gl.vertexAttribPointer(locUnit, 2, gl.FLOAT, false, 0, 0);

        const offsetBuffer = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER, offsetBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, maxInstances * 2 * 4, gl.DYNAMIC_DRAW);
        const locOffset = this.currentShader.getAttribLocation('a_offset');
        gl.enableVertexAttribArray(locOffset);
        gl.vertexAttribPointer(locOffset, 2, gl.FLOAT, false, 0, 0);
        gl.vertexAttribDivisor(locOffset, 1);

        const scaleBuffer = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER, scaleBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, maxInstances * 2 * 4, gl.DYNAMIC_DRAW);
        const locScale = this.currentShader.getAttribLocation('a_scale');
        gl.enableVertexAttribArray(locScale);
        gl.vertexAttribPointer(locScale, 2, gl.FLOAT, false, 0, 0);
        gl.vertexAttribDivisor(locScale, 1);

        const colorBuffer = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, maxInstances * 4 * 4, gl.DYNAMIC_DRAW);
        const locColor = this.currentShader.getAttribLocation('a_color');
        gl.enableVertexAttribArray(locColor);
        gl.vertexAttribPointer(locColor, 4, gl.FLOAT, false, 0, 0);
        gl.vertexAttribDivisor(locColor, 1);

        gl.bindVertexArray(null);

        return { vao, offsets, scales, colors, offsetBuffer, scaleBuffer, colorBuffer };
    }

    initTerrainRenderer() {
        this.terrainRenderer = this.createTerrainRenderer();
    }

    drawTerrain(chunks: TerrainChunk[]) {
        if (!this.currentShader) throw new Error("Shader not bound");
        const gl = this.gl;
        const tr = this.terrainRenderer;

        const TILE_SIZE = 1;
        const CHUNK_SIZE = 8;

        let I = 0;
        for (const chunk of chunks) {
            for (let i = 0; i < chunk.contents.length; i++, I++) {
                const tileType = chunk.contents[i];

                const localX = i % CHUNK_SIZE;
                const localY = Math.floor(i / CHUNK_SIZE);

                tr.offsets[I * 2 + 0] = chunk.position.x * CHUNK_SIZE + localX;
                tr.offsets[I * 2 + 1] = chunk.position.y * CHUNK_SIZE + localY;

                tr.scales[I * 2 + 0] = TILE_SIZE;
                tr.scales[I * 2 + 1] = TILE_SIZE;

                tr.colors.set(TILE_COLORS[tileType], I * 4);
            }
        }

        const instanceCount = I;

        gl.bindBuffer(gl.ARRAY_BUFFER, tr.offsetBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, tr.offsets.subarray(0, instanceCount * 2));
        gl.bindBuffer(gl.ARRAY_BUFFER, tr.scaleBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, tr.scales.subarray(0, instanceCount * 2));
        gl.bindBuffer(gl.ARRAY_BUFFER, tr.colorBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, tr.colors.subarray(0, instanceCount * 4));

        const vp = Mat3.ortho(this.canvas.width, this.canvas.height, this.camera, 32);
        gl.uniformMatrix3fv(this.currentShader.getUniformLocation("u_vp"), false, vp.arr());

        gl.bindVertexArray(tr.vao);
        gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, instanceCount);
        gl.bindVertexArray(null);
    }

    private resize() {
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;
    }
}
