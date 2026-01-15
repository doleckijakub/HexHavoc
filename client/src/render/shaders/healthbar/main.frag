#version 300 es
precision highp float;

in float ar;
in vec2 uv;

uniform float u_p;

out vec4 outColor;

const float border = 0.25;

void main() {
    float bx = border / ar;
    float by = border;

    bool isBorder =
        uv.x < bx || uv.x > 1.0 - bx ||
        uv.y < by || uv.y > 1.0 - by;

    if (isBorder) {
        outColor = vec4(vec3(0.3), 1.0);
        return;
    }

    float innerX = (uv.x - bx) / (1.0 - 2.0 * bx);

    if (innerX <= clamp(u_p, 0.0, 1.0)) {
        outColor = vec4(0.1, 0.9, 0.1, 1.0);
    } else {
        outColor = vec4(0.15, 0.15, 0.15, 1.0);
    }
}
