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

  static fromValues(e: number[]): Mat3 {
    let self = new Mat3();
    for (let i = 0; i < 9; i++) {
      self.elements[i] = e[i];
    }
    return self;
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

  setTranslate(tx: number, ty: number): Mat3;
  setTranslate(vec: Vec2): Mat3;
  setTranslate(...args: [number, number] | [Vec2]): Mat3 {
    const e = this.elements;
    const [tx, ty] = this.parseVec2Args(args);
    e[6] = tx;
    e[7] = ty;

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

  rotate(angle: number): Mat3 {
    const e = this.elements;
    const c = Math.cos(angle);
    const s = Math.sin(angle);

    const m0 = e[0] * c + e[3] * s;
    const m1 = e[1] * c + e[4] * s;
    const m2 = e[2] * c + e[5] * s;

    const m3 = e[0] * -s + e[3] * c;
    const m4 = e[1] * -s + e[4] * c;
    const m5 = e[2] * -s + e[5] * c;

    e[0] = m0;
    e[1] = m1;
    e[2] = m2;
    e[3] = m3;
    e[4] = m4;
    e[5] = m5;

    return this;
  }

  multiply(other: Mat3): Mat3 {
    const out = new Mat3();
    for (let r = 0; r < 3; r++){
      for (let c = 0; c < 3 ; c++){
        let sum = 0;
        for (let k = 0; k < 3; k++)
          sum += this.elements[r * 3 + k] * other.elements[k * 3 + c];
        out.elements[r * 3 + c] = sum;
      }
    }
    return out;
  }

  static ortho(viewWidth: number, viewHeight: number, center: Vec2, scale = 1): Mat3 {
    const sx = 2 / viewWidth * scale;
    const sy = 2 / viewHeight * scale;

    const tx = -center.x * sx;
    const ty = -center.y * sy;

    const mat = Mat3.fromValues([
        sx,  0,  0,
        0,   sy, 0,
        tx,  ty, 1,
    ]);

    return mat;
  }

  static invert(m: Mat3): Mat3 {
    const e = m.arr();

    const a = e[0], b = e[3];
    const c = e[1], d = e[4];
    const tx = e[6], ty = e[7];

    const det = a * d - b * c;
    if (det === 0) throw new Error("Non-invertible Mat3");

    const invDet = 1 / det;

    return Mat3.fromValues([
        d * invDet,
      -c * invDet,
        0,

      -b * invDet,
        a * invDet,
        0,

      (b * ty - d * tx) * invDet,
      (c * tx - a * ty) * invDet,
        1,
    ]);
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
