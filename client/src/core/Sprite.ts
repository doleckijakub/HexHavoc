import { Geometry } from "./Geometry";
import { Material } from "./Material";
import { Transform } from "./Transform";

export class Sprite {
  // TODO: transform class  will be seperated thing from Sprite
  public transform: Transform;
  public geometry: Geometry;
  public material: Material;

  constructor(gl: WebGLRenderingContext, geometry: Geometry, material: Material) {
    this.transform = new Transform();
    this.geometry = geometry;
    this.material = material;
  }
}
