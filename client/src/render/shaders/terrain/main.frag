#version 300 es

precision highp float;
precision highp usampler2DArray;
precision highp int;

flat in uint v_chunkIndex;
in vec2 v_localPosTiles;

uniform usampler2DArray u_chunkTiles;
uniform vec4 u_tileColors[13];

out vec4 outColor;

uint getTile(int dx, int dy) {
    ivec2 tileCoord = ivec2(floor(v_localPosTiles));

    return texelFetch(
        u_chunkTiles,
        ivec3(tileCoord + ivec2(dx, dy), int(v_chunkIndex)),
        0
    ).r;
}

bool isWater(uint tile) {
    return tile < 2u;
}

void main() {
    ivec2 tileCoord = ivec2(floor(v_localPosTiles));
    
    uint tileId = getTile(0, 0);
    const uint PALETTE_SIZE = 13u;
    uint idx = min(tileId, PALETTE_SIZE - 1u);
    vec4 baseColor = u_tileColors[int(idx)];

    uint n  = getTile( 0,  1);
    uint s  = getTile( 0, -1);
    uint e  = getTile( 1,  0);
    uint w  = getTile(-1,  0);
    uint ne = getTile( 1,  1);
    uint nw = getTile(-1,  1);
    uint se = getTile( 1, -1);
    uint sw = getTile(-1, -1);

    if (isWater(tileId)) {
        float i = 1.0;
        if (isWater(n))  { baseColor += u_tileColors[n];  i += 1.0; }
        if (isWater(e))  { baseColor += u_tileColors[e];  i += 1.0; }
        if (isWater(s))  { baseColor += u_tileColors[s];  i += 1.0; }
        if (isWater(w))  { baseColor += u_tileColors[w];  i += 1.0; }
        if (isWater(ne)) { baseColor += u_tileColors[ne]; i += 1.0; }
        if (isWater(nw)) { baseColor += u_tileColors[nw]; i += 1.0; }
        if (isWater(se)) { baseColor += u_tileColors[se]; i += 1.0; }
        if (isWater(sw)) { baseColor += u_tileColors[sw]; i += 1.0; }

        baseColor /= i;
        
        outColor = baseColor;
        return;
    }

    vec2 f = fract(v_localPosTiles);

    float border = 0.1;

    bool nearLeft   = f.x < border;
    bool nearRight  = f.x > 1.0 - border;
    bool nearBottom = f.y < border;
    bool nearTop    = f.y > 1.0 - border;

    bool nearTL = nearTop && nearLeft;
    bool nearTR = nearTop && nearRight;
    bool nearBL = nearBottom && nearLeft;
    bool nearBR = nearBottom && nearRight;

    bool diffLeft   = (w  != tileId);
    bool diffRight  = (e  != tileId);
    bool diffTop    = (n  != tileId);
    bool diffBottom = (s  != tileId);
    bool diffTL     = (nw != tileId);
    bool diffTR     = (ne != tileId);
    bool diffBL     = (sw != tileId);
    bool diffBR     = (se != tileId);

    float mask = 0.0;
    mask += float(nearLeft   && diffLeft);
    mask += float(nearRight  && diffRight);
    mask += float(nearTop    && diffTop);
    mask += float(nearBottom && diffBottom);
    mask += float(nearTL     && diffTL);
    mask += float(nearTR     && diffTR);
    mask += float(nearBL     && diffBL);
    mask += float(nearBR     && diffBR);

    outColor = mask == 0.0 ? baseColor : baseColor / 2.0;
}
