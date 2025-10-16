import { Drawable } from "../Drawable";
import { AbstractCanvasWrapper } from "./AbstractCanvasWrapper";


export class GridCanvasWrapper extends AbstractCanvasWrapper {

    private _triggerDraw: boolean;
    
    constructor(canvas: HTMLCanvasElement) {
        super(canvas);
        this._triggerDraw = false;
    }

    public override set width(width: number) {
        this._canvas.width = width;
        this._triggerDraw = true;
    }

    public override get width(): number {
        return this._canvas.width;
    }

    public override set height(height: number) {
        this._canvas.height = height;
        this._triggerDraw = true;
    }

    public override get height(): number {
        return this._canvas.height;
    }

    public override draw(): void {
        const drawables: Drawable[] = this.getDrawableList();
        if (this._triggerDraw) {
            for (let drawable of drawables) {
                drawable.draw(this, true);
            }
        }
        this._triggerDraw = false;
    }
}