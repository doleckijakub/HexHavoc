import { Vec2, Mat3 } from '@core';
import type { TVec4 } from '@type';

class Camera {
    position: Vec2;
    scale: number;
}

export class Renderer {
    private gl: WebGL2RenderingContext;
    
    private camera: Camera;
    private clearColor: TVec4;

    constructor(private canvas: HTMLCanvasElement) {
        const gl = canvas.getContext("webgl2");
        if (!gl) throw new Error("WebGL not supported");

        this.gl = gl;
        this.camera = { position: new Vec2(0, 0), scale: 1 };

        this.resize();
        window.addEventListener("resize", () => this.resize());
    }

    getContext() {
        return this.gl;
    }

    private resize() {
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;
    }

    // camera

    setCameraPosition(position: Vec2) {
        this.camera.position = position;
    }

    setCameraScale(scale: number) {
        this.camera.scale = scale;
    }

    getCameraMatrix(): Mat3 {
        return Mat3.ortho(this.canvas.width, this.canvas.height, this.camera.position, this.camera.scale);
    }

    // clear

    setClearColor(clearColor: TVec4) {
        this.clearColor = clearColor;
    }

    clear() {
        const gl = this.gl;
        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        gl.clearColor(...this.clearColor);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    }
}