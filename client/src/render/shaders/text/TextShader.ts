import { Shader, type Renderer } from '@render';

import vert from './main.vert?raw';
import frag from './main.frag?raw';

const MAX_TEXT_WIDTH = 512;
const MAX_TEXT_HEIGHT = 64;

const PIXELS_PER_UNIT = 16;

type CachedText = {
    tex: WebGLTexture;
    width: number;
    height: number;
};

export class TextShader extends Shader {
    private bufferCanvas: HTMLCanvasElement;
    private bufferCtx: CanvasRenderingContext2D;
    private textTex: WebGLTexture | null = null;
    private vao: WebGLVertexArrayObject | null = null;
    private cache = new Map<string, CachedText>();

    constructor(private renderer: Renderer) {
        super(renderer.getContext(), vert, frag);

        this.bufferCanvas = document.createElement('canvas');
        this.bufferCanvas.width = MAX_TEXT_WIDTH;
        this.bufferCanvas.height = MAX_TEXT_HEIGHT;

        this.bufferCtx = this.bufferCanvas.getContext('2d')!;

        const gl = this.gl;

        this.textTex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.textTex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        const quadVerts = new Float32Array([
            -1, -1, 0, 0,
            1, -1, 1, 0,
            -1, 1, 0, 1,
            -1, 1, 0, 1,
            1, -1, 1, 0,
            1, 1, 1, 1,
        ]);

        this.vao = gl.createVertexArray();
        gl.bindVertexArray(this.vao);

        const vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        gl.bufferData(gl.ARRAY_BUFFER, quadVerts, gl.STATIC_DRAW);

        const a_pos = this.getAttribLocation('a_pos');
        const a_uv = this.getAttribLocation('a_uv');

        gl.enableVertexAttribArray(a_pos);
        gl.vertexAttribPointer(a_pos, 2, gl.FLOAT, false, 16, 0);

        gl.enableVertexAttribArray(a_uv);
        gl.vertexAttribPointer(a_uv, 2, gl.FLOAT, false, 16, 8);

        gl.bindVertexArray(null);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }

    private createTextTexture(text: string): CachedText {
    const gl = this.gl;
    const ctx = this.bufferCtx;

    const fontSize = 10;
    const font = `${fontSize}px 'Fusion Pixel 10px Proportional TC'`;

    ctx.font = font;
    const metrics = ctx.measureText(text);
    const w = Math.ceil(metrics.width) + 4;
    const h = fontSize + 4;

    this.bufferCanvas.width = w;
    this.bufferCanvas.height = h;

    ctx.clearRect(0, 0, w, h);
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'black';
    ctx.fillStyle = 'white';
    ctx.imageSmoothingEnabled = false;

    const cx = w / 2;
    const cy = h / 2;

    ctx.strokeText(text, cx, cy);
    ctx.fillText(text, cx, cy);

    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        this.bufferCanvas
    );

    return { tex, width: w, height: h };
}


    renderText(text: string, x: number, y: number) {
        let entry = this.cache.get(text);
        if (!entry) {
            entry = this.createTextTexture(text);
            this.cache.set(text, entry);
        }

        const gl = this.gl;

        this.use();

        gl.uniformMatrix3fv(
            this.getUniformLocation('u_vp'),
            false,
            this.renderer.getCameraMatrix().arr()
        );

        gl.uniform2f(
            this.getUniformLocation('u_pos'),
            x,
            y
        );

        gl.uniform2f(
            this.getUniformLocation('u_size'),
            entry.width,
            entry.height
        );

        gl.uniform1f(
            this.getUniformLocation('u_ppu'),
            PIXELS_PER_UNIT
        );

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, entry.tex);
        gl.uniform1i(this.getUniformLocation('u_text'), 0);

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.disable(gl.DEPTH_TEST);

        gl.bindVertexArray(this.vao);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        gl.bindVertexArray(null);

        gl.disable(gl.BLEND);
    }
}
