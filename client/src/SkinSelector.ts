const TILE_SIZE = 16;
const SCALE = 5;
const ROTATION_COUNT = 8;
const FRAME_DELAY = 200;
const SKIN_COUNT = 3;

class SkinSelector {
    private container: HTMLElement;
    private canvases: HTMLCanvasElement[] = [];
    private ctxs: CanvasRenderingContext2D[] = [];
    private tilemap: HTMLImageElement;
    private rotationIndex = 0;
    private selectedIndex = 0;
    private lastFrameTime = 0;
    private hiddenInput: HTMLInputElement;

    constructor(containerId: string, tilemapSrc: string, inputName: string) {
        this.container = document.getElementById(containerId)!;

        this.hiddenInput = document.createElement('input');
        this.hiddenInput.type = 'hidden';
        this.hiddenInput.name = inputName;
        this.hiddenInput.value = '0';
        this.container.appendChild(this.hiddenInput);

        this.tilemap = new Image();
        this.tilemap.src = tilemapSrc;
        this.tilemap.onload = () => this.init();
    }

    private init() {
        for (let i = 0; i < SKIN_COUNT; i++) {
            const canvas = document.createElement('canvas');
            canvas.width = TILE_SIZE;
            canvas.height = TILE_SIZE;

            canvas.style.width = `${TILE_SIZE * SCALE}px`;
            canvas.style.height = `${TILE_SIZE * SCALE}px`;
            canvas.style.imageRendering = 'pixelated';

            canvas.style.margin = '8px';
            canvas.style.border = i === this.selectedIndex
                ? '2px solid #00ff88'
                : '2px solid #444';
            canvas.style.cursor = 'pointer';
            canvas.title = `Skin ${i + 1}`;

            canvas.addEventListener('click', () => this.selectSkin(i));

            this.container.appendChild(canvas);
            this.canvases.push(canvas);
            this.ctxs.push(canvas.getContext('2d')!);
        }

        requestAnimationFrame(this.loop.bind(this));
    }

    private selectSkin(index: number) {
        this.selectedIndex = index;
        this.hiddenInput.value = String(index);
        this.canvases.forEach((c, i) => {
            c.style.border = i === index
                ? '2px solid #00ff88'
                : '2px solid #444';
        });
    }

    private loop(timestamp: number) {
        if (timestamp - this.lastFrameTime >= FRAME_DELAY) {
            this.rotationIndex = (this.rotationIndex + 1) % ROTATION_COUNT;
            this.lastFrameTime = timestamp;
        }

        this.render();
        requestAnimationFrame(this.loop.bind(this));
    }

    private render() {
        if (!this.tilemap.complete) return;

        for (let i = 0; i < SKIN_COUNT; i++) {
            const ctx = this.ctxs[i];
            ctx.clearRect(0, 0, TILE_SIZE, TILE_SIZE);

            const sx = this.rotationIndex * TILE_SIZE;
            const sy = (4 * i + 2) * TILE_SIZE;

            ctx.drawImage(
                this.tilemap,
                sx, sy, TILE_SIZE, TILE_SIZE,
                0, 0, TILE_SIZE, TILE_SIZE
            );
        }
    }

    public getSelectedSkinIndex(): number {
        return this.selectedIndex;
    }
}

import tilemapSrc from './textures/tilemap_player.png';

if (document.readyState !== 'loading') {
    new SkinSelector('skin-selector', tilemapSrc, 'skin');
} else {
    window.addEventListener('DOMContentLoaded', () => new SkinSelector('skin-selector', tilemapSrc, 'skin'));
}
