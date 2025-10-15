#version 300 es
precision highp float;

in vec2 a_pos;
in vec2 a_uv;

uniform mat3 u_vp;
uniform vec2 u_pos;
uniform vec2 u_size;

out vec2 v_uv;

void main() {
    vec2 halfSize = u_size * 0.5;
    vec2 pos = u_pos + a_pos * halfSize / 64.0;

    vec3 world = u_vp * vec3(pos, 1.0);
    gl_Position = vec4(world.xy, 0.0, 1.0);

    v_uv = a_uv;
    v_uv.y = 1.0 - v_uv.y;
}
