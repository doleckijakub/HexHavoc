import { Geometry, Vec2 } from "@core";

export class GeometryFactory {
  constructor(private readonly gl: WebGLRenderingContext) {}

  rect(w: number, h: number): Geometry {
    const v = [
      new Vec2(0, 0),
      new Vec2(w, 0),
      new Vec2(0, h),
      new Vec2(0, h),
      new Vec2(w, 0),
      new Vec2(w, h),
    ];

    const texCoord = [
      new Vec2(0, 0),
      new Vec2(1, 0),
      new Vec2(0, 1),
      new Vec2(0, 1),
      new Vec2(1, 0),
      new Vec2(1, 1),
    ];

    return new Geometry(this.gl, v, texCoord);
  }

  triangle(points: [Vec2, Vec2, Vec2]) {
    const texCoord = [
      new Vec2(0, 0),
      new Vec2(1, 0),
      new Vec2(0, 1),
    ];
    return new Geometry(this.gl, points, texCoord);
  }

  public circle(r: number, segments: number = 32): Geometry {
    if (segments < 3) {
      throw new Error("Circle must have at least 3 segments.");
    }

    const vertices: Vec2[] = [];
    const texCoords: Vec2[] = [];

    const centerX_LGR = r;
    const centerY_LGR = r;

    const centerPoint = new Vec2(centerX_LGR, centerY_LGR);
    const centerTexCoord = new Vec2(0.5, 0.5);

    for (let i = 0; i < segments; i++) {
      const angle1 = (i / segments) * Math.PI * 2;
      const angle2 = ((i + 1) / segments) * Math.PI * 2;

      const p1 = new Vec2(centerX_LGR + Math.cos(angle1) * r, centerY_LGR + Math.sin(angle1) * r);
      const p2 = new Vec2(centerX_LGR + Math.cos(angle2) * r, centerY_LGR + Math.sin(angle2) * r);

      vertices.push(centerPoint);
      vertices.push(p1);
      vertices.push(p2);

      texCoords.push(centerTexCoord);
      texCoords.push(new Vec2((p1.x - centerX_LGR + r) / (2 * r), (p1.y - centerY_LGR + r) / (2 * r)));
      texCoords.push(new Vec2((p2.x - centerX_LGR + r) / (2 * r), (p2.y - centerY_LGR + r) / (2 * r)));
    }

    return new Geometry(this.gl, vertices, texCoords);
  }
}
