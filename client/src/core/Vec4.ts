export class Vec4 {
    public readonly x: number;
    public readonly y: number;
    public readonly z: number;
    public readonly w: number;

    constructor(x: number, y: number, z: number, w: number) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;
    }

    add(other: Vec4): Vec4 {
        return new Vec4(this.x + other.x, this.y + other.y, this.z + other.z, this.w + other.w);
    }

    sub(other: Vec4): Vec4 {
        return new Vec4(this.x - other.x, this.y - other.y, this.z - other.z, this.w - other.w);
    }

    mul(scalar: number): Vec4 {
        return new Vec4(this.x * scalar, this.y * scalar, this.z * scalar, this.w * scalar);
    }

    div(scalar: number): Vec4 {
        return this.mul(1.0 / scalar);
    }

    length(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w);
    }

    normalize(): Vec4 {
        const len = this.length();
        if (len === 0) return new Vec4(0, 0, 0, 0);
        return this.div(len);
    }

    arr(): [number, number, number, number] {
        return [this.x, this.y, this.z, this.w];
    }

    static flat(arr: Vec4[]): number[] {
        return arr.flatMap(v => v.arr());
    }
}
