export class ShaderModule {
    public readonly name: string;
    private readonly code: string;
    private readonly type: GLenum;

    constructor(name: string, code: string, type: GLenum) {
        this.name = name;
        this.code = code;
        this.type = type;
    }

    static async load(gl: WebGLRenderingContext, name: string) {
        const path = `/shaders/${name}`;
        const response = await fetch(path);
        if (!response.ok) {
            throw new Error(`Failed to load shader from ${path}`);
        }

        const code = await response.text();
        const type = path.endsWith(".frag") ? gl.FRAGMENT_SHADER : gl.VERTEX_SHADER;
        return new ShaderModule(name, code, type);
    }

    public compile(gl: WebGLRenderingContext): WebGLShader {
        const shader = gl.createShader(this.type);
        if (!shader) throw new Error("Failed to create shader");

        gl.shaderSource(shader, this.code);
        gl.compileShader(shader);

        const info = gl.getShaderInfoLog(shader);
        if (info) {
            gl.deleteShader(shader);
            throw new Error(`Failed to compile shader: ${info}`);
        }

        return shader;
    }
}
