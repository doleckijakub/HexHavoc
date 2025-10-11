import { ShaderModule, ShaderProgramFactory } from "@render";
import { Color, Vec2, Mat3, Geometry, Material, Texture } from "@core";

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

const geometry = new Geometry(gl, [
  new Vec2(0, 0), // A
  new Vec2(50, 0), // B
  new Vec2(0, 50), // C
  new Vec2(0, 50), // C
  new Vec2(50, 0), // B
  new Vec2(50, 50), // D
], [
  new Vec2(0, 0), // A - bottom-left
  new Vec2(1, 0), // B - bottom-right
  new Vec2(0, 1), // C - top-left
  new Vec2(0, 1), // C - top-left
  new Vec2(1, 0), // B - bottom-right
  new Vec2(1, 1), // D - top-right
]);
const tx = await Texture.load(gl, "/textures/Tux.png");
const material = new Material(gl, shaderProgram);
material.setTexture(tx);

const worldMatrix = new Mat3();
worldMatrix.translate(-1, 1).scale(2 / glCanvas.width, -2 / glCanvas.height);

geometry.setPos(new Vec2(100, 100));
geometry.scale(4, 4);
geometry.rotate(Math.PI / 4);

setInterval(() => {
  material.setColor(Color.random());
}, 150);

animateScene();

function animateScene() {
  if (!gl) return;

  gl.viewport(0, 0, glCanvas.width, glCanvas.height);
  gl.clearColor(0.9, 1, 1, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);

  material.bind();

  const uPos = gl.getUniformLocation(shaderProgram, "uPos");
  const uColor = gl.getUniformLocation(shaderProgram, "uColor");
  const uWorldMatrix = gl.getUniformLocation(shaderProgram, "uWorldMatrix");

  geometry.translate(new Vec2(1, 0));
  geometry.rotate(Math.PI / 80);

  gl.uniformMatrix3fv(uWorldMatrix, false, worldMatrix.arr());
  gl.uniformMatrix3fv(uPos, false, geometry.getPosMatrix().arr());
  gl.uniform4fv(uColor, material.getColor().arr());

  const aVertexPosition = gl.getAttribLocation(shaderProgram, "aVertexPosition");
  gl.bindBuffer(gl.ARRAY_BUFFER, geometry.getVertexBuffer());
  gl.enableVertexAttribArray(aVertexPosition);
  gl.vertexAttribPointer(aVertexPosition, 2, gl.FLOAT, false, 0, 0);

  const aTexCoord = gl.getAttribLocation(shaderProgram, "aTexCoord");
  gl.bindBuffer(gl.ARRAY_BUFFER, geometry.getTexCoordBuffer());
  gl.enableVertexAttribArray(aTexCoord);
  gl.vertexAttribPointer(aTexCoord, 2, gl.FLOAT, false, 0, 0);

  gl.drawArrays(gl.TRIANGLES, 0, geometry.verticesCount());

  if (geometry.getPos().x > glCanvas.width) {
    geometry.setPos(new Vec2(0, 100));
  }

  requestAnimationFrame((currentTime) => {
    animateScene();
  });
}
