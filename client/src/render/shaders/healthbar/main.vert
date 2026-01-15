#version 300 es

precision mediump float;

in vec2 a_unitPos;
in vec2 a_offset;

uniform mat3 u_vp;

out float ar;
out vec2 uv;

const float WIDTH = 1.5;
const float HEIGHT = 0.25;

void main() {
  vec2 world = a_unitPos * vec2(WIDTH, HEIGHT) + a_offset;
  vec3 clip = u_vp * vec3(world, 1.0);

  ar = WIDTH / HEIGHT;
  uv = a_unitPos + vec2(0.5);
  gl_Position = vec4(clip.xy, 0.0, 1.0);
}