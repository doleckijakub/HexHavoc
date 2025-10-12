import { Mat3, Vec2, readVec2 } from "@core";

export class Transform {
  private pos = new Mat3();

  setPos(vec: Vec2): void;
  setPos(x: number, y: number): void;
  setPos(...args: [Vec2] | [number, number]): void {
    const vec = readVec2(args);
    this.pos.setTranslate(vec);
  }

  translate(x: number, y: number): void;
  translate(vec: Vec2): void;
  translate(...args: [Vec2] | [number, number]): void {
    const vec = readVec2(args);
    this.pos.translate(vec);
  }

  scale(vec: Vec2): void;
  scale(sx: number, sy: number): void;
  scale(...args: [Vec2] | [number, number]): void {
    const vec = readVec2(args);
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
}
