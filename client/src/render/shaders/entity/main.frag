#version 300 es

precision highp float;

in vec2 v_uv;
in vec4 v_frame; // spriteX, spriteY, spriteW, spriteH

uniform sampler2D u_spriteSheet;
uniform vec2 u_spriteGrid;
uniform vec2 u_textureSize;

out vec4 outColor;

void main() {
    float frameW = 1.0 / u_spriteGrid.x;
    float frameH = 1.0 / u_spriteGrid.y;

    vec2 uv = vec2(
        (v_frame.x + v_uv.x * v_frame.z) * frameW,
        (v_frame.y + v_uv.y * v_frame.w) * frameH
    );

    vec2 halfTexel = 0.5 / u_textureSize;

    vec2 minUV = vec2(v_frame.x * frameW, v_frame.y * frameH) + halfTexel;
    vec2 maxUV = vec2((v_frame.x + v_frame.z) * frameW, (v_frame.y + v_frame.w) * frameH) - halfTexel;
    uv = clamp(uv, minUV, maxUV);

    vec4 tex = texture(u_spriteSheet, uv);
    if (tex.a < 0.01) discard;
    outColor = tex;
}
