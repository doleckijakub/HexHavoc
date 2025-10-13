import { Vec2, Mat3, Vec4, Color } from '@core';
import { Shader } from '@render';
import type { TerrainChunk, TerrainTileType, TVec4 } from '@type';

interface TerrainRenderer {
    vao: WebGLVertexArrayObject;
    offsets: Float32Array;
    scales: Float32Array;
    colors: Float32Array;

    colorLeft: Float32Array;
    colorRight: Float32Array;
    colorUp: Float32Array;
    colorDown: Float32Array;

    offsetBuffer: WebGLBuffer;
    scaleBuffer: WebGLBuffer;
    colorBuffer: WebGLBuffer;

    colorLeftBuffer: WebGLBuffer;
    colorRightBuffer: WebGLBuffer;
    colorUpBuffer: WebGLBuffer;
    colorDownBuffer: WebGLBuffer;
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
    scale: number = 64;

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

    drawSquare(x: number, y: number, size: number, color: TVec4) {
        const gl = this.gl;
        if (!this.currentShader) throw new Error("Shader not bound");

        // Define a simple quad centered at (0, 0)
        const vertices = new Float32Array([
            -0.5, -0.5,
            0.5, -0.5,
            -0.5,  0.5,
            -0.5,  0.5,
            0.5, -0.5,
            0.5,  0.5,
        ]);

        // Create buffer for quad
        const vbo = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

        // Bind attributes
        const locUnit = this.currentShader.getAttribLocation('a_unitPos');
        gl.enableVertexAttribArray(locUnit);
        gl.vertexAttribPointer(locUnit, 2, gl.FLOAT, false, 0, 0);

        // Compute transformation for one square
        const offsets = new Float32Array([x, y]);
        const scales = new Float32Array([size, size]);
        const colors = new Float32Array(color);

        const vp = Mat3.ortho(this.canvas.width, this.canvas.height, this.camera, this.scale);
        gl.uniformMatrix3fv(this.currentShader.getUniformLocation("u_vp"), false, vp.arr());

        // Create single-instance buffers
        const offsetLoc = this.currentShader.getAttribLocation('a_offset');
        const scaleLoc = this.currentShader.getAttribLocation('a_scale');
        const colorLoc = this.currentShader.getAttribLocation('a_color');

        const offsetBuf = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER, offsetBuf);
        gl.bufferData(gl.ARRAY_BUFFER, offsets, gl.STREAM_DRAW);
        gl.enableVertexAttribArray(offsetLoc);
        gl.vertexAttribPointer(offsetLoc, 2, gl.FLOAT, false, 0, 0);
        gl.vertexAttribDivisor(offsetLoc, 1);

        const scaleBuf = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER, scaleBuf);
        gl.bufferData(gl.ARRAY_BUFFER, scales, gl.STREAM_DRAW);
        gl.enableVertexAttribArray(scaleLoc);
        gl.vertexAttribPointer(scaleLoc, 2, gl.FLOAT, false, 0, 0);
        gl.vertexAttribDivisor(scaleLoc, 1);

        const colorBuf = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER, colorBuf);
        gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STREAM_DRAW);
        gl.enableVertexAttribArray(colorLoc);
        gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, 0, 0);
        gl.vertexAttribDivisor(colorLoc, 1);

        // Draw one square
        gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, 1);

        // Cleanup
        gl.disableVertexAttribArray(locUnit);
        gl.disableVertexAttribArray(offsetLoc);
        gl.disableVertexAttribArray(scaleLoc);
        gl.disableVertexAttribArray(colorLoc);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.deleteBuffer(vbo);
        gl.deleteBuffer(offsetBuf);
        gl.deleteBuffer(scaleBuf);
        gl.deleteBuffer(colorBuf);
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

        const colorLeft   = new Float32Array(maxInstances * 4);
        const colorRight  = new Float32Array(maxInstances * 4);
        const colorUp     = new Float32Array(maxInstances * 4);
        const colorDown   = new Float32Array(maxInstances * 4);

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

        const colorLeftBuffer = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER, colorLeftBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, maxInstances * 4 * 4, gl.DYNAMIC_DRAW);
        const locLeft = this.currentShader.getAttribLocation('a_colorLeft');
        gl.enableVertexAttribArray(locLeft);
        gl.vertexAttribPointer(locLeft, 4, gl.FLOAT, false, 0, 0);
        gl.vertexAttribDivisor(locLeft, 1);

        const colorRightBuffer = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER, colorRightBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, maxInstances * 4 * 4, gl.DYNAMIC_DRAW);
        const locRight = this.currentShader.getAttribLocation('a_colorRight');
        gl.enableVertexAttribArray(locRight);
        gl.vertexAttribPointer(locRight, 4, gl.FLOAT, false, 0, 0);
        gl.vertexAttribDivisor(locRight, 1);

        const colorUpBuffer = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER, colorUpBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, maxInstances * 4 * 4, gl.DYNAMIC_DRAW);
        const locUp = this.currentShader.getAttribLocation('a_colorUp');
        gl.enableVertexAttribArray(locUp);
        gl.vertexAttribPointer(locUp, 4, gl.FLOAT, false, 0, 0);
        gl.vertexAttribDivisor(locUp, 1);

        const colorDownBuffer = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER, colorDownBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, maxInstances * 4 * 4, gl.DYNAMIC_DRAW);
        const locDown = this.currentShader.getAttribLocation('a_colorDown');
        gl.enableVertexAttribArray(locDown);
        gl.vertexAttribPointer(locDown, 4, gl.FLOAT, false, 0, 0);
        gl.vertexAttribDivisor(locDown, 1);

        gl.bindVertexArray(null);

        return {
            vao,
            
            offsets,
            scales,
            colors,

            colorLeft,
            colorRight,
            colorUp,
            colorDown,

            colorLeftBuffer,
            colorRightBuffer,
            colorUpBuffer,
            colorDownBuffer,

            offsetBuffer,
            scaleBuffer,
            colorBuffer
        };
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
        // for (const chunk of chunks) {
        //     for (let i = 0; i < chunk.contents.length; i++, I++) {
        //         const tileType = chunk.contents[i];

        //         const localX = i % CHUNK_SIZE;
        //         const localY = Math.floor(i / CHUNK_SIZE);

        //         tr.offsets[I * 2 + 0] = chunk.position.x * CHUNK_SIZE + localX;
        //         tr.offsets[I * 2 + 1] = chunk.position.y * CHUNK_SIZE + localY;

        //         tr.scales[I * 2 + 0] = TILE_SIZE;
        //         tr.scales[I * 2 + 1] = TILE_SIZE;

        //         tr.colors.set(TILE_COLORS[tileType], I * 4);
        //     }
        // }

        function getTile(x: number, y: number): TerrainTileType | null {
            let cloc = { x: Math.floor(x / CHUNK_SIZE), y: Math.floor(y / CHUNK_SIZE) };

            for (const chunk of chunks) {
                if (chunk.position.x == cloc.x && chunk.position.y == cloc.y) {
                    const [ lx, ly ] = [ x % CHUNK_SIZE, y % CHUNK_SIZE ];
                    return chunk.contents[lx + ly * CHUNK_SIZE];
                }
            }

            return null;
        }

        for (const chunk of chunks) {
            for (let i = 0; i < chunk.contents.length; i++, I++) {
                const tileType = chunk.contents[i];
                const localX = i % CHUNK_SIZE;
                const localY = Math.floor(i / CHUNK_SIZE);

                const worldX = chunk.position.x * CHUNK_SIZE + localX;
                const worldY = chunk.position.y * CHUNK_SIZE + localY;

                tr.offsets[I * 2 + 0] = worldX;
                tr.offsets[I * 2 + 1] = worldY;

                tr.scales[I * 2 + 0] = TILE_SIZE;
                tr.scales[I * 2 + 1] = TILE_SIZE;

                const color = TILE_COLORS[tileType];
                tr.colors.set(color, I * 4);

                const leftType: TerrainTileType  = getTile(worldX - 1, worldY) ?? tileType;
                const rightType: TerrainTileType = getTile(worldX + 1, worldY) ?? tileType;
                const upType: TerrainTileType    = getTile(worldX, worldY + 1) ?? tileType;
                const downType: TerrainTileType  = getTile(worldX, worldY - 1) ?? tileType;

                tr.colorLeft.set(TILE_COLORS[leftType], I * 4);
                tr.colorRight.set(TILE_COLORS[rightType], I * 4);
                tr.colorUp.set(TILE_COLORS[upType], I * 4);
                tr.colorDown.set(TILE_COLORS[downType], I * 4);
            }
        }

        const instanceCount = I;

        gl.bindBuffer(gl.ARRAY_BUFFER, tr.offsetBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, tr.offsets.subarray(0, instanceCount * 2));
        gl.bindBuffer(gl.ARRAY_BUFFER, tr.scaleBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, tr.scales.subarray(0, instanceCount * 2));
        gl.bindBuffer(gl.ARRAY_BUFFER, tr.colorBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, tr.colors.subarray(0, instanceCount * 4));

        gl.bindBuffer(gl.ARRAY_BUFFER, tr.colorLeftBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, tr.colorLeft.subarray(0, instanceCount * 4));
        gl.bindBuffer(gl.ARRAY_BUFFER, tr.colorRightBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, tr.colorRight.subarray(0, instanceCount * 4));
        gl.bindBuffer(gl.ARRAY_BUFFER, tr.colorUpBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, tr.colorUp.subarray(0, instanceCount * 4));
        gl.bindBuffer(gl.ARRAY_BUFFER, tr.colorDownBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, tr.colorDown.subarray(0, instanceCount * 4));

        const vp = Mat3.ortho(this.canvas.width, this.canvas.height, this.camera, this.scale);
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
