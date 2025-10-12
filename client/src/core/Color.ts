import type { TColor } from "@type";

export class Color {
    public readonly r: number;
    public readonly g: number;
    public readonly b: number;
    public readonly a: number;

    static random(): TColor {
        const r = Math.floor(Math.random() * 256) / 255;
        const g = Math.floor(Math.random() * 256) / 255;
        const b = Math.floor(Math.random() * 256) / 255;
        return [r, g, b, 1];
    }

    static rgb(r: number, g: number, b: number): TColor {
        return [r / 255, g / 255, b / 255, 1];
    }

    static rgba(r: number, g: number, b: number, a: number): TColor {
        return [r / 255, g / 255, b / 255, a];
    }

    static hex(hex: string): TColor {
        if (hex.startsWith('#')) {
            hex = hex.slice(1);
        }
        if (hex.length === 3) {
            const r = parseInt(hex[0] + hex[0], 16) / 255;
            const g = parseInt(hex[1] + hex[1], 16) / 255;
            const b = parseInt(hex[2] + hex[2], 16) / 255;
            return [r / 255, g / 255, b / 255, 1];
        } else if (hex.length === 6) {
            const r = parseInt(hex.slice(0, 2), 16);
            const g = parseInt(hex.slice(2, 4), 16);
            const b = parseInt(hex.slice(4, 6), 16);
            return [r / 255, g / 255, b / 255, 1];
        } else {
            throw new Error('Invalid hex color');
        }
    }
}
