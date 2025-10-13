export class Shader {
    private program: WebGLProgram;

    private attribLocations: Map<string, number> = new Map();
    private uniformLocations: Map<string, WebGLUniformLocation> = new Map();

    constructor(private gl: WebGLRenderingContext, vertexSrc: string, fragmentSrc: string) {
        const vs = this.compileShader(vertexSrc, gl.VERTEX_SHADER);
        const fs = this.compileShader(fragmentSrc, gl.FRAGMENT_SHADER);

        this.program = gl.createProgram()!;
        gl.attachShader(this.program, vs);
        gl.attachShader(this.program, fs);
        gl.linkProgram(this.program);

        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
            throw new Error(`Shader link error: ${gl.getProgramInfoLog(this.program)}`);
        }

        gl.deleteShader(vs);
        gl.deleteShader(fs);
    }

    private compileShader(src: string, type: number): WebGLShader {
        const shader = this.gl.createShader(type)!;
        this.gl.shaderSource(shader, src);
        this.gl.compileShader(shader);
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            throw new Error(`Shader compile error: ${this.gl.getShaderInfoLog(shader)}`);
        }
        return shader;
    }

    use() {
        this.gl.useProgram(this.program);
    }

    getAttribLocation(name: string): number {
        const cached = this.attribLocations.get(name);
        if (cached) return cached;

        const loc = this.gl.getAttribLocation(this.program, name);
        if (loc === -1) throw new Error(`Attrib ${name} not found`);

        this.attribLocations.set(name, loc);

        return loc;
    }

    getUniformLocation(name: string): WebGLUniformLocation {
        const cached = this.uniformLocations.get(name);
        if (cached) return cached;

        const loc = this.gl.getUniformLocation(this.program, name);
        if (loc === null) throw new Error(`Uniform ${name} not found`);

        this.uniformLocations.set(name, loc);

        return loc;
    }
}
