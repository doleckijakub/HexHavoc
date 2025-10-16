#version 300 es

precision highp float;

in vec2 a_pos;
in vec2 a_uv;

uniform mat3 u_vp;
uniform vec2 u_pos;
uniform float u_heightTiles;

out vec2 v_uv;

void main() {
    vec2 worldPos = u_pos + vec2(a_pos.x, a_pos.y * u_heightTiles);
    vec3 clipPos = u_vp * vec3(worldPos, 1.0);
    gl_Position = vec4(clipPos.xy, 0.0, 1.0);
    
    v_uv = vec2(a_uv.x, 1.0 - a_uv.y);
}
