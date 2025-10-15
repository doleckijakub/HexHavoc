#version 300 es

precision highp float;
precision highp int;

in vec2 a_unitPos;
in vec2 a_offset;
in uint a_chunkIndex;

uniform mat3 u_vp;
uniform float u_tileSize;
uniform int u_chunkSize;

flat out uint v_chunkIndex;
out vec2 v_localPosTiles;
out vec2 v_worldPos;

void main() {
    vec2 posInTiles = ((a_unitPos + 0.5) * float(u_chunkSize)) + 1.0;
    v_localPosTiles = posInTiles;

    vec2 worldPosTiles = a_offset + (a_unitPos + 0.5) * float(u_chunkSize);
    vec2 worldPos = worldPosTiles * u_tileSize;
    v_worldPos = worldPos;

    vec3 clip = u_vp * vec3(worldPos, 1.0);
    gl_Position = vec4(clip.xy, 0.0, 1.0);

    v_chunkIndex = a_chunkIndex;
}