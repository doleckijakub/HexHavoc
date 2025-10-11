import { Vec2 } from "@core";

export class Geometry {
  private vertices: Float32Array;
  private texCoords: Float32Array;
  private vertexBuffer: WebGLBuffer;
  private texCoordBuffer: WebGLBuffer;

  constructor(
    private readonly gl: WebGLRenderingContext,
    vertices: Vec2[],
    texCoords?: Vec2[],
  ) {
    this.vertices = new Float32Array(Vec2.flat(vertices));
    
    if (!texCoords) {
      texCoords = vertices.map(() => new Vec2(0, 0));
    }
    this.texCoords = new Float32Array(Vec2.flat(texCoords));
    
    this.initBuffers();
  }

  private initBuffers(): void {
    this.vertexBuffer = this.gl.createBuffer();
    if (!this.vertexBuffer) throw new Error("Failed to create vertex buffer");

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      this.vertices,
      this.gl.STATIC_DRAW
    );

    this.texCoordBuffer = this.gl.createBuffer();
    if (!this.texCoordBuffer) throw new Error("Failed to create texture coordinate buffer");

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.texCoordBuffer);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      this.texCoords,
      this.gl.STATIC_DRAW
    );
  }

  verticesCount() {
    return this.vertices.length / 2;
  }

  getVertexBuffer() {
    return this.vertexBuffer;
  }

  getTexCoordBuffer() {
    return this.texCoordBuffer;
  }

  destroy(): void {
    this.gl.deleteBuffer(this.vertexBuffer);
    this.gl.deleteBuffer(this.texCoordBuffer);
  }
}
