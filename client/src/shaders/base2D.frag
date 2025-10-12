  #ifdef GL_ES
    precision highp float;
  #endif

  uniform vec4 uTintColor;
  uniform vec4 uColor;
  uniform sampler2D uTexture;
  uniform bool uUseTexture;
  uniform vec2 uTexOffset;
  uniform vec2 uTexScale;

  varying vec2 vTexCoord;

  void main() {
    if (uUseTexture) {
      vec2 adjustedTexCoord = uTexOffset + vTexCoord * uTexScale;
      gl_FragColor = texture2D(uTexture, adjustedTexCoord) * uColor * uTintColor;
    } else {
      gl_FragColor = uColor * uTintColor;
    }
  }
  