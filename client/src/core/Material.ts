import { Color, Texture } from "@core";

export class Material {
  private color = Color.rgba(255, 255, 255, 1);
  private texture?: Texture;

  constructor(
    private readonly gl: WebGLRenderingContext,
    private readonly shaderProgram: WebGLProgram
  ) {}

  bind(): void {
    this.gl.useProgram(this.shaderProgram);

    if (this.texture) {
      this.gl.activeTexture(this.gl.TEXTURE0);
      this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture.getGLTexture());
      
      const uTexture = this.gl.getUniformLocation(this.shaderProgram, "uTexture");
      this.gl.uniform1i(uTexture, 0);
      
      const uUseTexture = this.gl.getUniformLocation(this.shaderProgram, "uUseTexture");
      this.gl.uniform1i(uUseTexture, 1);
    } else {
      const uUseTexture = this.gl.getUniformLocation(this.shaderProgram, "uUseTexture");
      this.gl.uniform1i(uUseTexture, 0);
    }
  }

  unbind(): void {
    this.gl.useProgram(null);
  }

  getTexture() {
    return this.texture;
  }

  setTexture(texture: Texture) {
    this.texture = texture;
  }

  getColor() {
    return this.color;
  }

  setColor(color: Color) {
    this.color = color;
  }
}
