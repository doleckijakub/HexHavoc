export class ShaderProgramFactory {
    public static create(gl: WebGLRenderingContext, shaders: WebGLShader[]) {
        const program = gl.createProgram();
        if (!program) throw new Error("Failed to create WebGL program");

        for (const shader of shaders) {
            gl.attachShader(program, shader);
        }

        gl.linkProgram(program);
        
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            const info = gl.getProgramInfoLog(program);
            gl.deleteProgram(program);
            throw new Error("Failed to link program: " + info);
        }
        
        return program;
    }
}
