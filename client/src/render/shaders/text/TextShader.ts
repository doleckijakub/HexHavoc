import { Shader, type Renderer } from '@render';

import vert from './main.vert?raw';
import frag from './main.frag?raw';

const MAX_TEXT_WIDTH = 512;
const MAX_TEXT_HEIGHT = 64;

export class TextShader extends Shader {
    private bufferCanvas: HTMLCanvasElement;
    private bufferCtx: CanvasRenderingContext2D;
    private textTex: WebGLTexture | null = null;
    private vao: WebGLVertexArrayObject | null = null;

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

    renderText(text: string, x: number, y: number) {
        const gl = this.gl;
        const ctx = this.bufferCtx;

        ctx.clearRect(0, 0, this.bufferCanvas.width, this.bufferCanvas.height);
        ctx.fillStyle = 'rgba(0, 0, 0, 0)';
        ctx.fillRect(0, 0, this.bufferCanvas.width, this.bufferCanvas.height);

        ctx.fillStyle = 'white';
        ctx.font = "32px 'Fusion Pixel 10px Proportional TC'";
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, this.bufferCanvas.width / 2, this.bufferCanvas.height / 2);

        gl.bindTexture(gl.TEXTURE_2D, this.textTex);
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            this.bufferCanvas
        );

        this.use();

        const vp = this.renderer.getCameraMatrix();
        gl.uniformMatrix3fv(this.getUniformLocation('u_vp'), false, vp.arr());

        gl.uniform1i(this.getUniformLocation('u_text'), 0);
        gl.uniform2f(this.getUniformLocation('u_pos'), x, y);
        gl.uniform2f(this.getUniformLocation('u_size'), MAX_TEXT_WIDTH, MAX_TEXT_HEIGHT);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.textTex);

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        const wasDepthTestEnabled = gl.isEnabled(gl.DEPTH_TEST);
        gl.disable(gl.DEPTH_TEST);

        gl.bindVertexArray(this.vao);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        gl.bindVertexArray(null);

        if (wasDepthTestEnabled) gl.enable(gl.DEPTH_TEST);
        gl.disable(gl.BLEND);

        this.finish();
    }
}
