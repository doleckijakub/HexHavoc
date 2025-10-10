export class Color {
    public readonly r: number;
    public readonly g: number;
    public readonly b: number;
    public readonly a: number;

    constructor(r: number, g: number, b: number, a: number = 1) {
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;
    }

    static rgb(r: number, g: number, b: number): Color {
        return new Color(r, g, b);
    }

    static rgba(r: number, g: number, b: number, a: number): Color {
        return new Color(r, g, b, a);
    }

    static hex(hex: string): Color {
        if (hex.startsWith('#')) {
            hex = hex.slice(1);
        }
        if (hex.length === 3) {
            const r = parseInt(hex[0] + hex[0], 16);
            const g = parseInt(hex[1] + hex[1], 16);
            const b = parseInt(hex[2] + hex[2], 16);
            return new Color(r, g, b);
        } else if (hex.length === 6) {
            const r = parseInt(hex.slice(0, 2), 16);
            const g = parseInt(hex.slice(2, 4), 16);
            const b = parseInt(hex.slice(4, 6), 16);
            return new Color(r, g, b);
        } else {
            throw new Error('Invalid hex color');
        }
    }

    arr(): [number, number, number, number] {
        return [this.r / 255, this.g / 255, this.b / 255, this.a];
    }
}
