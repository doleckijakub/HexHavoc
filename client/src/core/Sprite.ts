import { Geometry } from "./Geometry";
import { Material } from "./Material";
import { Transform } from "./Transform";
import { Vec2 } from "./Vec2";

export class Sprite {
  // TODO: transform class  will be seperated thing from Sprite
  public transform: Transform;
  public geometry: Geometry;
  public material: Material;

  constructor(gl: WebGLRenderingContext, w: number, h: number, material: Material) {
    this.transform = new Transform();
    this.material = material;
    this.geometry = new Geometry(gl, this.rectVertices(w, h), this.rectTexCoords());
  }

  private rectVertices(w: number, h: number): Vec2[] {
    return [
      new Vec2(0, 0),
      new Vec2(w, 0),
      new Vec2(0, h),
      new Vec2(0, h),
      new Vec2(w, 0),
      new Vec2(w, h),
    ];
  }

  private rectTexCoords(): Vec2[] {
    return [
      new Vec2(0, 0),
      new Vec2(1, 0),
      new Vec2(0, 1),
      new Vec2(0, 1),
      new Vec2(1, 0),
      new Vec2(1, 1),
    ];
  }
}
