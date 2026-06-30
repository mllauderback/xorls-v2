import { Drawable, DrawState } from "../Drawable";

export class OffscreenCanvasLayer {
    private drawableList: Drawable[];
    private markedDrawableList: Drawable[];
    protected canvas: OffscreenCanvas;
    private ctx: OffscreenCanvasRenderingContext2D | null;
    protected forceClear: boolean;

    constructor(width: number, height: number) {
        this.canvas = new OffscreenCanvas(width, height);
        this.ctx = this.canvas.getContext('2d');
        this.drawableList = [];
        this.markedDrawableList = [];
        this.forceClear = true;
    }

    private set width(width: number) {
        this.canvas.width = width;
        this.markAllDrawablesForUpdates();
    }

    public get width() {
        return this.canvas.width;
    }

    private set height(height: number) {
        this.canvas.height = height;
        this.markAllDrawablesForUpdates();
    }

    public get height() {
        return this.canvas.height;
    }

    public resize(width: number, height: number) {
        this.canvas.width = width;
        this.canvas.height = height;
        const dpr = window.devicePixelRatio || 1;
        this.ctx?.scale(dpr, dpr);
        this.markAllDrawablesForUpdates();
    }

    public get context(): OffscreenCanvasRenderingContext2D | null {
        return this.ctx;
    }

    public add(drawable: Drawable) {
        this.drawableList.push(drawable);
        this.markedDrawableList.push(drawable);
    }

    public remove(drawable: Drawable) {
        const index = this.drawableList.indexOf(drawable);
        if (index === -1) {
            console.warn('Drawable not found in layer');
            return;
        }
        this.drawableList.splice(index, 1);
        this.markAllDrawablesForUpdates();
    }

    public getDrawablesList(): Drawable[] {
        return this.drawableList;
    }

    public getMarkedDrawablesList(): Drawable[] {
        return this.markedDrawableList;
    }

    public markforUpdate(drawable: Drawable) {
        if (!this.drawableList.includes(drawable)) {
            console.warn('Marked drawable not found, skipping.');
            return;
        }
        this.markedDrawableList.push(drawable);
    }

    public markAllDrawablesForUpdates() {
        this.markedDrawableList = this.drawableList;
    }

    public resetAllMarkedDrawables() {
        this.markedDrawableList = [];
        this.forceClear = false;
    }

    public drawToMainCanvas(ctx: CanvasRenderingContext2D | null) {
        if (ctx === null) {
            console.warn('active context is null');
            return;
        }
        console.log('repaint main canvas');
        const image = this.canvas.transferToImageBitmap();
        ctx.clearRect(0, 0, this.width, this.height);
        ctx.drawImage(image, 0, 0);
        image.close();
    }

    public refresh(drawState: DrawState): boolean {
        if (this.markedDrawableList.length === 0) return false;
        if (this.ctx === null) {
            console.warn('CanvasLayer context is null, skipping refresh.');
            return false;
        }
        if (this.forceClear) this.ctx.clearRect(0, 0, this.width, this.height);
        this.ctx.beginPath();
        this.markedDrawableList.forEach(d => d.draw(this.ctx!, drawState));
        this.ctx.stroke();
        this.resetAllMarkedDrawables();
        return true;
    }

}