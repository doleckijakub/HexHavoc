import { Shader, type Renderer } from '@render';
import { Color, type Entity } from '@core';

import vert from './main.vert?raw';
import frag from './main.frag?raw';

export class HitboxShader extends Shader {
    constructor(private renderer: Renderer) {
        super(renderer.getContext(), vert, frag);
    }

    renderHitbox(x: number, y: number, w: number, h: number) {
        this.use();

        const gl = this.gl;

        const vertices = new Float32Array([
            -0.5, -0.5,
             0.5, -0.5,
             0.5,  0.5,
            -0.5,  0.5,
            -0.5, -0.5,
        ]);

        const vbo = gl.createBuffer()!;
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

        const locUnit = this.getAttribLocation('a_unitPos');
        gl.enableVertexAttribArray(locUnit);
        gl.vertexAttribPointer(locUnit, 2, gl.FLOAT, false, 0, 0);

        const offsets = new Float32Array([x, y]);
        const scales = new Float32Array([w, h]);

        const vp = this.renderer.getCameraMatrix();
        gl.uniformMatrix3fv(this.getUniformLocation("u_vp"), false, vp.arr());

        const offsetLoc = this.getAttribLocation('a_offset');
        const scaleLoc = this.getAttribLocation('a_scale');

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

        gl.drawArraysInstanced(gl.LINE_STRIP, 0, 5, 1);

        gl.disableVertexAttribArray(locUnit);
        gl.disableVertexAttribArray(offsetLoc);
        gl.disableVertexAttribArray(scaleLoc);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.deleteBuffer(vbo);
        gl.deleteBuffer(offsetBuf);
        gl.deleteBuffer(scaleBuf);

        this.finish();
    }
}