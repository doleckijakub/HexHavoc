  attribute vec2 aVertexPosition;
  attribute vec2 aTexCoord;

  uniform mat3 uPos;
  uniform mat3 uWorldMatrix;

  varying vec2 vTexCoord;

  void main() {
    gl_Position = vec4(uWorldMatrix * uPos * vec3(aVertexPosition, 1.0), 1.0);
    vTexCoord = aTexCoord;
  }
  