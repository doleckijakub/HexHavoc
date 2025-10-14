import { Shader, type Renderer } from '@render';
import { Color, type Entity } from '@core';

import vert from './main.vert?raw';
import frag from './main.frag?raw';

export class PlayerShader extends Shader {
    constructor(private renderer: Renderer) {
        super(renderer.getContext(), vert, frag);
    }

    renderPlayer(playerEntity: Entity) {
        this.use();

        const gl = this.gl;
        const { x, y } = playerEntity.position;
        const size = 0.8;
        const color = Color.hex('cf4345');

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
        const scales = new Float32Array([size, size]);
        const colors = new Float32Array(color);

        const vp = this.renderer.getCameraMatrix();
        gl.uniformMatrix3fv(this.getUniformLocation("u_vp"), false, vp.arr());

        const offsetLoc = this.getAttribLocation('a_offset');
        const scaleLoc = this.getAttribLocation('a_scale');
        const colorLoc = this.getAttribLocation('a_color');

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

        gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, 1);

        gl.disableVertexAttribArray(locUnit);
        gl.disableVertexAttribArray(offsetLoc);
        gl.disableVertexAttribArray(scaleLoc);
        gl.disableVertexAttribArray(colorLoc);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.deleteBuffer(vbo);
        gl.deleteBuffer(offsetBuf);
        gl.deleteBuffer(scaleBuf);
        gl.deleteBuffer(colorBuf);

        this.finish();
    }
}