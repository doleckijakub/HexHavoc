export class Texture {
  private texture: WebGLTexture;

  constructor(
    private readonly gl: WebGLRenderingContext,
    img: ImageBitmap,
  ) {
    this.texture = this.gl.createTexture();
    if (!this.texture) throw new Error("Failed to create texture");

    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
    this.gl.texImage2D(
      WebGLRenderingContext.TEXTURE_2D,
      0,
      WebGLRenderingContext.RGBA,
      WebGLRenderingContext.RGBA,
      WebGLRenderingContext.UNSIGNED_BYTE,
      img,
    );
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
    this.gl.bindTexture(this.gl.TEXTURE_2D, null);
  }

  static async load(gl: WebGLRenderingContext, url: string): Promise<Texture> {
    const res = await fetch(url);
    const blob = await res.blob();
    const imageBitmap = await createImageBitmap(blob);
    return new Texture(gl, imageBitmap);
  }

  getGLTexture(): WebGLTexture {
    return this.texture;
  }
}
