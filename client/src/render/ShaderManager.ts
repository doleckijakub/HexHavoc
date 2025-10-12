import { Shader } from '@render';

export class ShaderManager {
    private shaders = new Map<string, Shader>();

    constructor(private gl: WebGLRenderingContext) {}

    add(name: string, vertexSrc: string, fragmentSrc: string) {
        const shader = new Shader(this.gl, vertexSrc, fragmentSrc);
        this.shaders.set(name, shader);
    }

    get(name: string): Shader {
        const shader = this.shaders.get(name);
        if (!shader) throw new Error(`Shader "${name}" not found`);
        return shader;
    }
}
