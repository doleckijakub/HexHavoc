#version 300 es

in vec2 a_unitPos;
in vec2 a_offset;
in vec2 a_scale;
in vec4 a_color;

uniform mat3 u_vp;

out vec4 v_color;

void main() {
  vec2 world = a_unitPos * a_scale + a_offset;
  vec3 clip = u_vp * vec3(world, 1.0);

  gl_Position = vec4(clip.xy, 0.0, 1.0);
  
  v_color = a_color;
}