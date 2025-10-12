import { ShaderModule, ShaderProgramFactory } from "@render";
import {
  Color,
  Vec2,
  Mat3,
  Material,
  Texture,
  GeometryFactory,
  Transform,
} from "@core";
import { Sprite } from "./core/Sprite";

class RenderableObject {
  public readonly transform: Transform;

  constructor(public readonly sprite: Sprite) {
    this.transform = new Transform();
  }
}

const glCanvas = document.getElementById("gl-canvas") as HTMLCanvasElement;
if (!glCanvas) throw new Error("No canvas with id 'gl-canvas' found");
const gl = glCanvas.getContext("webgl");
if (!gl) throw new Error("WebGL not supported");

gl.enable(gl.BLEND);
gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

const shadersNames = ["base2D.vert", "base2D.frag"];

const shadersModules = await Promise.all(
  shadersNames.map((name) => ShaderModule.load(gl, name))
);

const shaders: Map<string, WebGLShader> = new Map();

for (const module of shadersModules) {
  const shader = module.compile(gl);
  shaders.set(module.name, shader);
}

const shaderProgram = ShaderProgramFactory.create(gl, [
  shaders.get("base2D.vert")!,
  shaders.get("base2D.frag")!,
]);

const geometryFactory = new GeometryFactory(gl);
const rect = geometryFactory.rect(64, 64);

const solidMaterial = new Material(gl, shaderProgram);
solidMaterial.setColor(Color.rgb(255, 0, 0));
// prepare materials:
const slimeTexture = await Texture.load(gl, "/textures/slime.png");
const slimeMaterial = new Material(gl, shaderProgram);
slimeMaterial.setTexture(slimeTexture);

const sprite = new Sprite(rect, slimeMaterial);
sprite.setTexScale(new Vec2(16 / slimeTexture.width, 16 / slimeTexture.height));

const sprite2 = new Sprite(rect, slimeMaterial);
sprite2.setTexScale(
  new Vec2(16 / slimeTexture.width, 16 / slimeTexture.height)
);

const slime1 = new RenderableObject(sprite);
const slime2 = new RenderableObject(sprite2);

const worldMatrix = new Mat3();
worldMatrix.translate(-1, 1).scale(2 / glCanvas.width, -2 / glCanvas.height);

sprite.setTexOffset(new Vec2(0, 0));
slime1.transform.setPos(100, 300);
slime2.transform.setPos(170, 300);
//sprite.transform.rotate(Math.PI / 4);

const scene = [slime1, slime2];

setInterval(() => {
  if (slime1.sprite.getTexOffset().x >= 16 / 32) {
    slime1.sprite.setTexOffset(new Vec2(0, 0));
  } else {
    slime1.sprite.setTexOffset(new Vec2(16 / 32, 0));
  }
}, 500);

setInterval(() => {
  if (slime2.sprite.getTexOffset().x >= 16 / 32) {
    slime2.sprite.setTexOffset(new Vec2(0, 0));
  } else {
    slime2.sprite.setTexOffset(new Vec2(16 / 32, 0));
  }

  const currColor = slime2.sprite.getTintColor();
  if (currColor[0] !== 1 && currColor[1] !== 1 && currColor[2] !== 1) {
    slime2.sprite.setTintColor(Color.rgb(255, 255, 255))
  } else {
    slime2.sprite.setTintColor(Color.rgba(249, 146, 166, 0.9));
  }
}, 1000);

animateScene();

function animateScene() {
  if (!gl) return;
  gl.viewport(0, 0, glCanvas.width, glCanvas.height);
  gl.clearColor(0.9, 1, 1, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);

  for (const obj of scene) {
    obj.sprite.material.bind();

    const uPos = gl.getUniformLocation(shaderProgram, "uPos");
    gl.uniformMatrix3fv(uPos, false, obj.transform.getPosMatrix().arr());

    const uTintColor = gl.getUniformLocation(shaderProgram, "uTintColor");
    gl.uniform4fv(uTintColor, obj.sprite.getTintColor());

    const uColor = gl.getUniformLocation(shaderProgram, "uColor");
    gl.uniform4fv(uColor, obj.sprite.material.getColor());

    const uWorldMatrix = gl.getUniformLocation(shaderProgram, "uWorldMatrix");
    gl.uniformMatrix3fv(uWorldMatrix, false, worldMatrix.arr());

    if (obj.sprite.material.hasTexture()) {
      const uTexOffset = gl.getUniformLocation(shaderProgram, "uTexOffset");
      const texOffset = obj.sprite.getTexOffset();
      gl.uniform2f(uTexOffset, texOffset.x, texOffset.y);

      const uTexScale = gl.getUniformLocation(shaderProgram, "uTexScale");
      const texScale = obj.sprite.getTexScale();
      gl.uniform2f(uTexScale, texScale.x, texScale.y);
    }

    const aVertexPosition = gl.getAttribLocation(
      shaderProgram,
      "aVertexPosition"
    );
    gl.bindBuffer(gl.ARRAY_BUFFER, obj.sprite.geometry.getVertexBuffer());
    gl.enableVertexAttribArray(aVertexPosition);
    gl.vertexAttribPointer(aVertexPosition, 2, gl.FLOAT, false, 0, 0);

    const aTexCoord = gl.getAttribLocation(shaderProgram, "aTexCoord");
    gl.bindBuffer(gl.ARRAY_BUFFER, obj.sprite.geometry.getTexCoordBuffer());
    gl.enableVertexAttribArray(aTexCoord);
    gl.vertexAttribPointer(aTexCoord, 2, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.TRIANGLES, 0, obj.sprite.geometry.verticesCount());
  }

  requestAnimationFrame((currentTime) => {
    animateScene();
  });
}
