#version 300 es
precision highp float;

in vec2 v_uv;
in vec4 v_frame; // spriteX, spriteY, spriteW, spriteH

uniform sampler2D u_spriteSheet;
uniform vec2 u_spriteGrid;

out vec4 outColor;

void main() {
    float frameW = 1.0 / u_spriteGrid.x;
    float frameH = 1.0 / u_spriteGrid.y;

    vec2 uv = vec2(
        (v_frame.x + v_uv.x * v_frame.z) * frameW,
        (v_frame.y + v_uv.y * v_frame.w) * frameH
    );

    vec4 tex = texture(u_spriteSheet, uv);
    if (tex.a < 0.01) discard;
    outColor = tex;
}
