import { ShaderModule, ShaderProgramFactory } from "@render";
import { Color } from "@core";

const glCanvas = document.getElementById("gl-canvas") as HTMLCanvasElement;
if (!glCanvas) throw new Error("No canvas with id 'gl-canvas' found");
const gl = glCanvas.getContext("webgl");
if (!gl) throw new Error("WebGL not supported");

const shadersNames = ["simple.vert", "simple.frag"];

const shadersModules = await Promise.all(
  shadersNames.map((name) => ShaderModule.load(gl, name))
);

const shaders: Map<string, WebGLShader> = new Map();

for (const module of shadersModules) {
  const shader = module.compile(gl);
  shaders.set(module.name, shader);
}

const shaderProgram = ShaderProgramFactory.create(gl, [
  shaders.get("simple.vert")!,
  shaders.get("simple.frag")!,
]);

const aspectRatio = glCanvas.width / glCanvas.height;
const currentRotation = [0, 1];
const currentScale = [1.0, aspectRatio];

// Vertex information
const vertexArray = new Float32Array([
  -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, -0.5, -0.5,
]);
const vertexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
gl.bufferData(gl.ARRAY_BUFFER, vertexArray, gl.STATIC_DRAW);
const vertexNumComponents = 2;
const vertexCount = vertexArray.length / vertexNumComponents;

// Rendering data shared with the scalers.
let uScalingFactor;
let uGlobalColor;
let uRotationVector;
let aVertexPosition;

// Animation timing
let previousTime = 0.0;
const degreesPerSecond = 90.0;
let currentAngle = 0.0;

const pink = Color.hex("#fcafd5");
const black = Color.hex("#000000");
animateScene();

function animateScene() {
  if (!gl) return;

  gl.viewport(0, 0, glCanvas.width, glCanvas.height);
  gl.clearColor(...pink.arr());
  gl.clear(gl.COLOR_BUFFER_BIT);

  const radians = (currentAngle * Math.PI) / 180.0;
  currentRotation[0] = Math.sin(radians);
  currentRotation[1] = Math.cos(radians);

  gl.useProgram(shaderProgram);

  uScalingFactor = gl.getUniformLocation(shaderProgram, "uScalingFactor");
  uGlobalColor = gl.getUniformLocation(shaderProgram, "uGlobalColor");
  uRotationVector = gl.getUniformLocation(shaderProgram, "uRotationVector");

  gl.uniform2fv(uScalingFactor, currentScale);
  gl.uniform2fv(uRotationVector, currentRotation);
  gl.uniform4fv(uGlobalColor, black.arr());

  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

  aVertexPosition = gl.getAttribLocation(shaderProgram, "aVertexPosition");

  gl.enableVertexAttribArray(aVertexPosition);
  gl.vertexAttribPointer(
    aVertexPosition,
    vertexNumComponents,
    gl.FLOAT,
    false,
    0,
    0
  );

  gl.drawArrays(gl.TRIANGLES, 0, vertexCount);

  requestAnimationFrame((currentTime) => {
    const deltaAngle =
      ((currentTime - previousTime) / 1000.0) * degreesPerSecond;

    currentAngle = (currentAngle + deltaAngle) % 360;

    previousTime = currentTime;
    animateScene();
  });
}
