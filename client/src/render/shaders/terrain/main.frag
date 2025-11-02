#version 300 es

precision highp float;
precision highp usampler2DArray;
precision highp int;

flat in uint v_chunkIndex;
in vec2 v_localPosTiles;
in vec2 v_worldPos;

uniform float u_time;
uniform usampler2DArray u_chunkTiles;
uniform vec4 u_tileColors[13];

out vec4 outColor;

const int PIXELS_PER_TILE = 16;

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

/// noise from https://gist.github.com/patriciogonzalezvivo/670c22f3966e662d2f83

vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}

float snoise(vec3 v){ 
  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

// First corner
  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 =   v - i + dot(i, C.xxx) ;

// Other corners
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );

  //  x0 = x0 - 0. + 0.0 * C 
  vec3 x1 = x0 - i1 + 1.0 * C.xxx;
  vec3 x2 = x0 - i2 + 2.0 * C.xxx;
  vec3 x3 = x0 - 1. + 3.0 * C.xxx;

// Permutations
  i = mod(i, 289.0 ); 
  vec4 p = permute( permute( permute( 
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

// Gradients
// ( N*N points uniformly over a square, mapped onto an octahedron.)
  float n_ = 1.0/7.0; // N=7
  vec3  ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z *ns.z);  //  mod(p,N*N)

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)

  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );

  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);

//Normalise gradients
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

// Mix final noise value
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), 
                                dot(p2,x2), dot(p3,x3) ) );
}

/// ~noise

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
        float x = floor((v_localPosTiles.x - floor(v_localPosTiles.x)) * float(PIXELS_PER_TILE)) / float(PIXELS_PER_TILE);
        float y = floor((v_localPosTiles.y - floor(v_localPosTiles.y)) * float(PIXELS_PER_TILE)) / float(PIXELS_PER_TILE);

        float x2 = x * 2.0 - 1.0;
        float y2 = y * 2.0 - 1.0;

        float p_n = max(0.0,  y2);
        float p_s = max(0.0, -y2);
        float p_e = max(0.0,  x2);
        float p_w = max(0.0, -x2);

        float i = 1.0;
        vec4 c = baseColor;

        c += u_tileColors[int(min(1.0, float(n)))] * p_n; i += p_n;
        c += u_tileColors[int(min(1.0, float(e)))] * p_e; i += p_e;
        c += u_tileColors[int(min(1.0, float(s)))] * p_s; i += p_s;
        c += u_tileColors[int(min(1.0, float(w)))] * p_w; i += p_w;

        baseColor = c / i;

        if (!isWater(n)) {
            vec3 sideColor1 = vec3(87.0, 47.0, 12.0) / 255.0;
            vec3 sideColor2 = (2.0 * vec3(127.0, 69.0, 18.0)) / 255.0 - sideColor1;

            float sideColorDarkness = 1.0;

            if (
                (x < 1.0 / float(PIXELS_PER_TILE) && (isWater(nw) || !isWater(w) || n != nw))
                ||
                (x >= 1.0 - 1.0 / float(PIXELS_PER_TILE) && (isWater(ne) || !isWater(e) || n != ne))
            ) sideColorDarkness = 0.5;

            for (float dt = 3.0; dt >= 0.0; dt -= 1.0 / 4.0) {
                if (
                y > snoise(vec3(
                    floor(v_worldPos * float(PIXELS_PER_TILE)) / float(PIXELS_PER_TILE),
                    u_time - dt
                )) / 4.0 + 0.25 + (4.0 / float(PIXELS_PER_TILE))
                ) sideColorDarkness = 0.0; // (1.0 / 256.0); //  * (1.0 - dt);
            }

            sideColorDarkness = clamp(sideColorDarkness, 0.0, 1.0);

            vec3 sideColor = mix(mix(sideColor2, sideColor1, sideColorDarkness), u_tileColors[n].xyz, 0.2);

            float noiseRaw = snoise(vec3(
                floor(v_worldPos * float(PIXELS_PER_TILE)) / float(PIXELS_PER_TILE),
                u_time
            ));

            float noise = noiseRaw / 4.0 + 0.25;

            outColor =
                y > noise + (2.0 / float(PIXELS_PER_TILE)) ? vec4(sideColor, 1.0) :
                y > noise + (1.0 / float(PIXELS_PER_TILE)) ? vec4(1.0) :
                y > noise ? mix(vec4(1.0), baseColor, 0.5) :
                baseColor;
            return;
        }

        if (!isWater(e)) {
            float s = (snoise(vec3(
                floor(v_worldPos.x * float(PIXELS_PER_TILE)) / float(PIXELS_PER_TILE),
                floor(v_worldPos.y * float(PIXELS_PER_TILE)) / float(PIXELS_PER_TILE),
                u_time
            )) / 2.0 + 0.5) / 4.0;

            outColor =
                x > 1.0 - s ? mix(vec4(1.0), baseColor, 0.5)
                : baseColor;
            return;
        }

        // TODO: !isWater(s) ???

        if (!isWater(w)) {
            float s = (snoise(vec3(
                floor(v_worldPos.x * float(PIXELS_PER_TILE)) / float(PIXELS_PER_TILE),
                floor(v_worldPos.y * float(PIXELS_PER_TILE)) / float(PIXELS_PER_TILE),
                u_time
            )) / 2.0 + 0.5) / 4.0;

            outColor =
                x < s - 1.0 / float(PIXELS_PER_TILE) ? mix(vec4(1.0), baseColor, 0.5)
                : baseColor;
            return;
        }
        
        outColor = baseColor;
        return;
    }

    vec2 f = fract(v_localPosTiles);

    float border = 1.0 / float(PIXELS_PER_TILE);

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
