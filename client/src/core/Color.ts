import { Vec4 } from "./Vec4";

export class Color {
    static rgb(r: number, g: number, b: number): Vec4 {
        return new Vec4(r, g, b, 1).div(255);
    }

    static rgba(r: number, g: number, b: number, a: number): Vec4 {
        return new Vec4(r, g, b, a).div(255);
    }

    static hex(hex: string): Vec4 {
        if (hex.startsWith('#')) {
            hex = hex.slice(1);
        }

        if (hex.length === 3) {
            const r = parseInt(hex[0] + hex[0], 16);
            const g = parseInt(hex[1] + hex[1], 16);
            const b = parseInt(hex[2] + hex[2], 16);
            return Color.rgb(r, g, b);
        } else if (hex.length === 6) {
            const r = parseInt(hex.slice(0, 2), 16);
            const g = parseInt(hex.slice(2, 4), 16);
            const b = parseInt(hex.slice(4, 6), 16);
            return Color.rgb(r, g, b);
        } else {
            throw new Error('Invalid hex color');
        }
    }
}
