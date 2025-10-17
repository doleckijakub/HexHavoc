#version 300 es
precision highp float;

in vec2 a_pos;
in vec2 a_uv;

in vec2 a_instancePos;
in vec4 a_instanceFrame; // spriteX, spriteY, spriteW, spriteH

uniform mat3 u_vp;
uniform vec2 u_spriteGrid;

out vec2 v_uv;
out vec4 v_frame;

void main() {
    vec2 worldPos = a_instancePos + vec2(a_pos.x * a_instanceFrame.z, a_pos.y * a_instanceFrame.w);
    vec3 clipPos = u_vp * vec3(worldPos, 1.0);

    gl_Position = vec4(clipPos.xy, a_instancePos.y * 0.001, 1.0);

    v_uv = vec2(a_uv.x, 1.0 - a_uv.y);
    v_frame = a_instanceFrame;
}
