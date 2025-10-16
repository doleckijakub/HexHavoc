#version 300 es

precision highp float;

in vec2 v_uv;

uniform sampler2D u_spriteSheet;
uniform vec2 u_frameUV;
uniform int u_sheetCols;
uniform float u_heightTiles;

out vec4 outColor;

void main() {
    float tileHeight = u_heightTiles;
    float frameW = 1.0 / float(u_sheetCols);
    float frameH = 1.0 / float(u_sheetCols);

    vec2 uv = vec2(
        u_frameUV.x * frameW + v_uv.x * frameW,
        u_frameUV.y * frameH + (v_uv.y * tileHeight) * frameH
    );

    vec4 tex = texture(u_spriteSheet, uv);
    if (tex.a < 0.01) discard;
    outColor = tex;
}
