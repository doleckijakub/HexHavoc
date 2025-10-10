  attribute vec2 aVertexPosition;

  uniform mat3 uPos;
  uniform mat3 uWorldMatrix;

  void main() {
    gl_Position = vec4(uWorldMatrix * uPos * vec3(aVertexPosition, 1.0), 1.0);
  }
  