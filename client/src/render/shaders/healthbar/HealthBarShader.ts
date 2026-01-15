import { Shader, type Renderer } from '@render';

import vert from './main.vert?raw';
import frag from './main.frag?raw';

export class HealthBarShader extends Shader {
    constructor(private renderer: Renderer) {
        super(renderer.getContext(), vert, frag);
    }

    renderHealthBar(x: number, y: number, health: number, max_health: number) {
        this.use();

        const gl = this.gl;

        const vertices = new Float32Array([
            -0.5, -0.5,
             0.5, -0.5,
            -0.5,  0.5,
            -0.5,  0.5,
             0.5, -0.5,
             0.5,  0.5,
        ]);

        const vbo = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

        const locUnit = this.getAttribLocation('a_unitPos');
        gl.enableVertexAttribArray(locUnit);
        gl.vertexAttribPointer(locUnit, 2, gl.FLOAT, false, 0, 0);

        const offsets = new Float32Array([x, y]);

        const vp = this.renderer.getCameraMatrix();
        gl.uniformMatrix3fv(this.getUniformLocation("u_vp"), false, vp.arr());
        gl.uniform1f(this.getUniformLocation("u_p"), health / max_health);

        const offsetLoc = this.getAttribLocation('a_offset');

        const offsetBuf = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER, offsetBuf);
        gl.bufferData(gl.ARRAY_BUFFER, offsets, gl.STREAM_DRAW);
        gl.enableVertexAttribArray(offsetLoc);
        gl.vertexAttribPointer(offsetLoc, 2, gl.FLOAT, false, 0, 0);
        gl.vertexAttribDivisor(offsetLoc, 1);

        gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, 1);

        gl.disableVertexAttribArray(locUnit);
        gl.disableVertexAttribArray(offsetLoc);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.deleteBuffer(vbo);
        gl.deleteBuffer(offsetBuf);

        this.finish();
    }
}