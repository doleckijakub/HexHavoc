export class Vec2 {
    public readonly x: number;
    public readonly y: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    add(other: Vec2): Vec2 {
        return new Vec2(this.x + other.x, this.y + other.y);
    }

    sub(other: Vec2): Vec2 {
        return new Vec2(this.x - other.x, this.y - other.y);
    }

    mul(scalar: number): Vec2 {
        return new Vec2(this.x * scalar, this.y * scalar);
    }

    div(scalar: number): Vec2 {
        return new Vec2(this.x / scalar, this.y / scalar);
    }

    length(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    normalize(): Vec2 {
        const len = this.length();
        if (len === 0) return new Vec2(0, 0);
        return this.div(len);
    }

    arr(): [number, number] {
        return [this.x, this.y];
    }

    static flat(arr: Vec2[]): number[] {
        return arr.flatMap(v => v.arr());
    }
}
