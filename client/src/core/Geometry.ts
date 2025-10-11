import { Mat3, Vec2 } from "@core";

export class Geometry {
  private vertices: Float32Array;
  private texCoords: Float32Array;
  private pos = new Mat3();
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

  private readVec2(args: [Vec2] | [number, number]): Vec2 {
    if (args.length === 1) {
      return args[0];
    } else {
      return new Vec2(args[0], args[1]);
    }
  }

  setPos(vec: Vec2): void;
  setPos(x: number, y: number): void;
  setPos(...args: [Vec2] | [number, number]): void {
    const vec = this.readVec2(args);
    this.pos.setTranslate(vec);
  }

  translate(x: number, y: number): void;
  translate(vec: Vec2): void;
  translate(...args: [Vec2] | [number, number]): void {
    const vec = this.readVec2(args);
    this.pos.translate(vec);
  }

  scale(vec: Vec2): void;
  scale(sx: number, sy: number): void;
  scale(...args: [Vec2] | [number, number]): void {
    const vec = this.readVec2(args);
    this.pos.scale(vec);
  }

  rotate(angle: number): void {
    this.pos.rotate(angle);
  }

  getPos() {
    const arr = this.pos.arr();
    return new Vec2(arr[6], arr[7]);
  }

  getPosMatrix() {
    return this.pos;
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
