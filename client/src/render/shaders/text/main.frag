#version 300 es

precision highp float;

in vec2 v_uv;

uniform sampler2D u_text;

out vec4 outColor;

void main() {
    float alpha = texture(u_text, v_uv).a;
    if (alpha < 0.01) discard;
    outColor = texture(u_text, v_uv);
}
