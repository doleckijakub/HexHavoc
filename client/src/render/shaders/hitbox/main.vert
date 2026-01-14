#version 300 es

precision mediump float;

in vec2 a_unitPos;
in vec2 a_offset;

uniform float u_radius;
uniform mat3 u_vp;

out vec2 v_local;

void main() {
  vec2 world = a_unitPos * u_radius + a_offset;
  vec3 clip = u_vp * vec3(world, 1.0);

  gl_Position = vec4(clip.xy, 0.0, 1.0);
  
  v_local = a_unitPos * 2.0;
}