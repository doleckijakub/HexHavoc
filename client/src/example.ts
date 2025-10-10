import { ShaderModule, ShaderProgramFactory } from "@render";
import { Color, Vec2, Mat3 } from "@core";
import { Geometry } from "./core/Geometry";

const glCanvas = document.getElementById("gl-canvas") as HTMLCanvasElement;
if (!glCanvas) throw new Error("No canvas with id 'gl-canvas' found");
const gl = glCanvas.getContext("webgl");
if (!gl) throw new Error("WebGL not supported");

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
]);

const vertexNumComponents = 2;
const vertexCount = geometry.verticesLength() / vertexNumComponents;

// Rendering data shared with the scalers.
let uPos;
let uGlobalColor;
let aVertexPosition;

const worldMatrix = new Mat3();
worldMatrix.translate(-1, 1).scale(2 / glCanvas.width, -2 / glCanvas.height);

geometry.setPos(new Vec2(100, 100));
geometry.scale(2, 2);
geometry.rotate(Math.PI / 4);
animateScene();

setInterval(() => {
  geometry.setColor(Color.random());
}, 250);

function animateScene() {
  if (!gl) return;

  gl.viewport(0, 0, glCanvas.width, glCanvas.height);
  gl.clearColor(0.9, 1, 1, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);

  gl.useProgram(shaderProgram);

  uPos = gl.getUniformLocation(shaderProgram, "uPos");
  uGlobalColor = gl.getUniformLocation(shaderProgram, "uGlobalColor");
  const uWorldMatrix = gl.getUniformLocation(shaderProgram, "uWorldMatrix");

  geometry.translate(new Vec2(1, 0));

  gl.uniformMatrix3fv(uWorldMatrix, false, worldMatrix.arr());
  gl.uniformMatrix3fv(uPos, false, geometry.getPosMatrix().arr());
  gl.uniform4fv(uGlobalColor, geometry.getColor().arr());

  aVertexPosition = gl.getAttribLocation(shaderProgram, "aVertexPosition");

  gl.enableVertexAttribArray(aVertexPosition);
  gl.vertexAttribPointer(aVertexPosition, 2, gl.FLOAT, false, 0, 0);

  gl.drawArrays(gl.TRIANGLES, 0, vertexCount);

  if (geometry.getPos().x > glCanvas.width) {
    geometry.setPos(new Vec2(0, 100));
  }

  requestAnimationFrame((currentTime) => {
    animateScene();
  });
}
