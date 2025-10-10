export class Mat3 {
  private elements: Float32Array;

  constructor() {
    this.elements = new Float32Array(9);
    this.identity();
  }

  identity(): Mat3 {
    const e = this.elements;
    e[0] = 1; e[1] = 0; e[2] = 0;
    e[3] = 0; e[4] = 1; e[5] = 0;
    e[6] = 0; e[7] = 0; e[8] = 1;
    return this;
  }
  
  translate(tx: number, ty: number): Mat3 {
    const e = this.elements;
    e[6] += tx;
    e[7] += ty;
    return this;
  }

  arr(): Float32Array {
    return this.elements;
  }
}
