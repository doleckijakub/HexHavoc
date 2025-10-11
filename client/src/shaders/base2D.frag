  #ifdef GL_ES
    precision highp float;
  #endif

  uniform vec4 uColor;
  uniform sampler2D uTexture;
  uniform bool uUseTexture;

  varying vec2 vTexCoord;

  void main() {
    if (uUseTexture) {
      gl_FragColor = texture2D(uTexture, vTexCoord) * uColor;
    } else {
      gl_FragColor = uColor;
    }
  }
  