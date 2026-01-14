#version 300 es

precision mediump float;

in vec2 v_local;

uniform float u_radius;
uniform float u_thickness;

out vec4 outColor;

void main() {
  float d = length(v_local);

  float inner = u_radius - u_thickness;

  if (d > u_radius || d < inner) {
    discard;
  }

  outColor = vec4(1.0);
}