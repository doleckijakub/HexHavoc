import type { TColor } from "@type";
import type { TVec2Args } from '@core';
import { Color, Geometry, Material, Transform, Vec2, readVec2 } from '@core';

export class Sprite {
  public geometry: Geometry;
  public material: Material;

  private texOffset = new Vec2(0, 0);
  private texScale = new Vec2(1, 1);

  private tintColor = Color.rgb(255, 255, 255);

  constructor(geometry: Geometry, material: Material) {
    this.geometry = geometry;
    this.material = material;
  }

  getTexOffset() {
    return this.texOffset;
  }

  setTexOffset(x: number, y: number): void;
  setTexOffset(vec: Vec2): void;
  setTexOffset(...args: TVec2Args) {
    const vec = readVec2(args);
    this.texOffset = vec;
  }

  getTexScale() {
    return this.texScale;
  }

  setTexScale(x: number, y: number): void;
  setTexScale(vec: Vec2): void;
  setTexScale(...args: TVec2Args) {
    const vec = readVec2(args);
    this.texScale = vec;
  }

  setTintColor(color: TColor) {
    this.tintColor = color;
  }

  getTintColor() {
    return this.tintColor;
  }
}
