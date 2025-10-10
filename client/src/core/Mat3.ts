import type { Vec2 } from "@core/Vec2";

export class Mat3 {
  private elements: Float32Array;

  constructor() {
    this.elements = new Float32Array(9);
    this.identity();
  }

  identity(): Mat3 {
    const e = this.elements;
    e[0] = 1;
    e[1] = 0;
    e[2] = 0;
    e[3] = 0;
    e[4] = 1;
    e[5] = 0;
    e[6] = 0;
    e[7] = 0;
    e[8] = 1;

    return this;
  }

  translate(tx: number, ty: number): Mat3;
  translate(vec: Vec2): Mat3;
  translate(...args: [number, number] | [Vec2]): Mat3 {
    const e = this.elements;
    const [tx, ty] = this.parseVec2Args(args);
    e[6] += tx;
    e[7] += ty;

    return this;
  }

  scale(sx: number, sy: number): Mat3;
  scale(vec: Vec2): Mat3;
  scale(...args: [number, number] | [Vec2]): Mat3 {
    const e = this.elements;
    const [sx, sy] = this.parseVec2Args(args);
    e[0] *= sx;
    e[1] *= sx;
    e[2] *= sx;
    e[3] *= sy;
    e[4] *= sy;
    e[5] *= sy;

    return this;
  }

  arr(): Float32Array {
    return this.elements;
  }

  private parseVec2Args(args: [number, number] | [Vec2]): [number, number] {
    if (args.length === 1) {
      return [args[0].x, args[0].y];
    } else {
      return [args[0], args[1]];
    }
  }
}
