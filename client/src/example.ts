import { ShaderModule, ShaderProgramFactory } from "@render";
import { Color, Vec2, Mat3, Material, Texture, GeometryFactory } from "@core";
import { Sprite } from "./core/Sprite";

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

const solidMaterial = new Material(gl, shaderProgram);
solidMaterial.setColor(Color.rgb(255, 0, 0));
// prepare materials:
const tuxTexture = await Texture.load(gl, "/textures/Tux.png");
const tuxMaterial = new Material(gl, shaderProgram);
tuxMaterial.setTexture(tuxTexture);

const rect = geometryFactory.rect(60, 60);
const circle = geometryFactory.circle(30, 30);

const sprite = new Sprite(gl, rect, tuxMaterial);

const worldMatrix = new Mat3();
worldMatrix.translate(-1, 1).scale(2 / glCanvas.width, -2 / glCanvas.height);

sprite.transform.setPos(new Vec2(200, 200));
sprite.transform.scale(4, 4);
sprite.transform.rotate(Math.PI / 4);

setInterval(() => {
  //sprite.material.setColor(Color.random());
}, 150);

animateScene();

function animateScene() {
  if (!gl) return;

  gl.viewport(0, 0, glCanvas.width, glCanvas.height);
  gl.clearColor(0.9, 1, 1, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);

  sprite.material.bind();

  const uPos = gl.getUniformLocation(shaderProgram, "uPos");
  const uColor = gl.getUniformLocation(shaderProgram, "uColor");
  const uWorldMatrix = gl.getUniformLocation(shaderProgram, "uWorldMatrix");

  sprite.transform.translate(new Vec2(1, 0));
  sprite.transform.rotate(Math.PI / 80);

  gl.uniformMatrix3fv(uWorldMatrix, false, worldMatrix.arr());
  gl.uniformMatrix3fv(uPos, false, sprite.transform.getPosMatrix().arr());
  gl.uniform4fv(uColor, sprite.material.getColor().arr());

  const aVertexPosition = gl.getAttribLocation(shaderProgram, "aVertexPosition");
  gl.bindBuffer(gl.ARRAY_BUFFER, sprite.geometry.getVertexBuffer());
  gl.enableVertexAttribArray(aVertexPosition);
  gl.vertexAttribPointer(aVertexPosition, 2, gl.FLOAT, false, 0, 0);

  const aTexCoord = gl.getAttribLocation(shaderProgram, "aTexCoord");
  gl.bindBuffer(gl.ARRAY_BUFFER, sprite.geometry.getTexCoordBuffer());
  gl.enableVertexAttribArray(aTexCoord);
  gl.vertexAttribPointer(aTexCoord, 2, gl.FLOAT, false, 0, 0);

  gl.drawArrays(gl.TRIANGLES, 0, sprite.geometry.verticesCount());

  if (sprite.transform.getPos().x > glCanvas.width) {
    sprite.transform.setPos(new Vec2(0, 100));
  }

  requestAnimationFrame((currentTime) => {
    animateScene();
  });
}
