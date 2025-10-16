#version 300 es

precision highp float;

in vec2 v_uv;

uniform sampler2D u_text;
uniform vec2 u_size;

out vec4 outColor;

void main() {
    vec4 tex = texture(u_text, v_uv);

    float alpha = smoothstep(0.25, 0.75, tex.a);

    float outline = 0.0;
    float steps = 4.0;
    for (float y = -steps; y <= steps; y++) {
        for (float x = -steps; x <= steps; x++) {
            vec2 offset = vec2(x, y) / u_size;
            outline = max(outline, texture(u_text, v_uv + offset).a);
        }
    }

    if (alpha < 0.5 && outline > 0.5) {
        outColor = vec4(vec3(0.0), 1.0);
    } else {
        outColor = vec4(tex.rgb, alpha);
    }
}
