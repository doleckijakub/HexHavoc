#version 300 es
precision highp float;

in vec2 v_uv;

uniform sampler2D u_text;
uniform vec2 u_size;

out vec4 outColor;

void main() {
    vec4 tex = texture(u_text, v_uv);

    float outline = 0.0;

    for (float f = 1.0; f <= 4.0; f += 1.0) {
        vec2 texel = f / u_size;

        outline += texture(u_text, v_uv + vec2(texel.x, 0.0)).r;
        outline += texture(u_text, v_uv - vec2(texel.x, 0.0)).r;
        outline += texture(u_text, v_uv + vec2(0.0, texel.y)).r;
        outline += texture(u_text, v_uv - vec2(0.0, texel.y)).r;
        outline += texture(u_text, v_uv + texel).r;
        outline += texture(u_text, v_uv - texel).r;
        outline += texture(u_text, v_uv + vec2(texel.x, -texel.y)).r;
        outline += texture(u_text, v_uv + vec2(-texel.x, texel.y)).r;
    }


    if (tex.a < 0.01 && outline > 0.0) {
        outColor = vec4(0.0, 0.0, 0.0, 1.0);
    } else {
        outColor = tex;
    }
}
