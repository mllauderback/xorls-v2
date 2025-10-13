import { BehaviorSubject, Observable, Observer, Subscriber } from "rxjs";

export class CanvasWrapper {

    private _canvas: HTMLCanvasElement;
    private _width: BehaviorSubject<number>;
    private _height: BehaviorSubject<number>;
    private _width$: Observable<number>;
    private _height$: Observable<number>;

    constructor(canvas: HTMLCanvasElement) {
        this._canvas = canvas;
        this._width = new BehaviorSubject<number>(this._canvas.width);
        this._height = new BehaviorSubject<number>(this._canvas.height);
        this._width$ = this._width.asObservable();
        this._height$ = this._height.asObservable();
    }

    public set width(width: number) {
        this._canvas.width = width;
        this._width.next(this._canvas.width);
    }

    public get width(): number {
        return this._canvas.width;
    }

    public set height(height: number) {
        this._canvas.height = height;
        this._height.next(this._canvas.height);
    }

    public get height(): number {
        return this._canvas.height;
    }

    public getWidthAsObservable() {
        return this._width$;
    }

    public getHeightAsObservable() {
        return this._height$;
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
}