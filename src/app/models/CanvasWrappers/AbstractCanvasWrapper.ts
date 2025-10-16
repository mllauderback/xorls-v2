import { Drawable } from "../Drawable";

export abstract class AbstractCanvasWrapper {

    protected _canvas: HTMLCanvasElement;
    private _drawableList: Drawable[];

    constructor(canvas: HTMLCanvasElement) {
        this._canvas = canvas;
        this._drawableList = [];
    }

    public set width(width: number) {
        this._canvas.width = width;
    }

    public get width(): number {
        return this._canvas.width;
    }

    public set height(height: number) {
        this._canvas.height = height;
    }

    public get height(): number {
        return this._canvas.height;
    }

    public get context(): CanvasRenderingContext2D {
        let context = this._canvas.getContext('2d');
        if (!context) {
            throw new Error("Null canvas context");
        }
        return context;
    }

    public hasValidContext(): boolean {
        return !!this._canvas.getContext('2d');
    }

    public add(drawable: Drawable) {
        this._drawableList.push(drawable);
    }

    public removeByIndex(index: number) {
        if (index < 0 || index >= this._drawableList.length) {
            throw new Error("Index out of bounds")
        }
        this._drawableList.splice(index, 1);
    }

    public removeDrawable(drawable: Drawable) {
        const index = this._drawableList.indexOf(drawable);
        this.removeByIndex(index);
    }

    public getDrawableList(): Drawable[] {
        return this._drawableList;
    }

    /**
     * Custom draw logic for CanvasWrapper instance to define on creation
     */
    public abstract draw(): void;
}