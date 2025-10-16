import { Shader, type Renderer } from '@render';

import vert from './main.vert?raw';
import frag from './main.frag?raw';

export class SpriteShader extends Shader {
    private vao: WebGLVertexArrayObject;
    private spriteSheet: WebGLTexture;

    constructor(private renderer: Renderer, spriteImage: HTMLImageElement) {
        super(renderer.getContext(), vert, frag);

        const gl = this.gl;

        this.spriteSheet = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.spriteSheet);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, spriteImage);

        const quadVerts = new Float32Array([
            -0.5, 0.0,  0, 0,
             0.5, 0.0,  1, 0,
            -0.5, 1.0,  0, 1,
            
            -0.5, 1.0,  0, 1,
             0.5, 0.0,  1, 0,
             0.5, 1.0,  1, 1,
        ]);

        this.vao = gl.createVertexArray();
        gl.bindVertexArray(this.vao);

        const vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        gl.bufferData(gl.ARRAY_BUFFER, quadVerts, gl.STATIC_DRAW);

        const a_pos = this.getAttribLocation('a_pos');
        const a_uv  = this.getAttribLocation('a_uv');

        gl.enableVertexAttribArray(a_pos);
        gl.vertexAttribPointer(a_pos, 2, gl.FLOAT, false, 16, 0);

        gl.enableVertexAttribArray(a_uv);
        gl.vertexAttribPointer(a_uv, 2, gl.FLOAT, false, 16, 8);

        gl.bindVertexArray(null);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }

    renderSprite(tileX: number, tileY: number, frame: number, heightTiles: number, sheetCols: number) {
        const gl = this.gl;

        this.use();

        const vp = this.renderer.getCameraMatrix();
        gl.uniformMatrix3fv(this.getUniformLocation('u_vp'), false, vp.arr());

        gl.uniform2f(this.getUniformLocation('u_pos'), tileX, tileY);
        gl.uniform1f(this.getUniformLocation('u_heightTiles'), heightTiles);

        const u = frame % sheetCols;
        const v = Math.floor(frame / sheetCols);
        gl.uniform2f(this.getUniformLocation('u_frameUV'), u, v);
        gl.uniform1i(this.getUniformLocation('u_sheetCols'), sheetCols);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.spriteSheet);
        gl.uniform1i(this.getUniformLocation('u_spriteSheet'), 0);

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        gl.bindVertexArray(this.vao);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        gl.bindVertexArray(null);

        gl.disable(gl.BLEND);

        this.finish();
    }
}
