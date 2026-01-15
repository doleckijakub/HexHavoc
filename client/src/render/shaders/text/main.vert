#version 300 es
precision highp float;

in vec2 a_pos;
in vec2 a_uv;

uniform mat3 u_vp;
uniform vec2 u_pos;
uniform vec2 u_size; // width, height in pixels
uniform float u_ppu;

out vec2 v_uv;

void main() {
    vec2 halfSize = u_size / (2.0 * u_ppu); // convert px → world units
    vec2 worldPos = u_pos + a_pos * halfSize;

    vec3 clip = u_vp * vec3(worldPos, 1.0);
    gl_Position = vec4(clip.xy, 0.0, 1.0);

    v_uv = vec2(a_uv.x, 1.0 - a_uv.y); // flip vertically only
}
