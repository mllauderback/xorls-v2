import { DrawService } from "../services/draw/draw.service";
import { Observable, Subscription } from "rxjs";
import { Drawable } from "./Drawable";

export enum GridMode {
    lines,
    dots
};

export class Grid implements Drawable {

    public gridSpacing: number;
    public gridMode: GridMode;
    private _width: number;
    private _height: number;
    private _widthSubscription: Subscription;
    private _heightSubscription: Subscription;

    constructor(private _drawService: DrawService, parentWidth$: Observable<number>, parentHeight$: Observable<number>) {
        this.gridSpacing = 20;
        this.gridMode = GridMode.lines;
        this._width = this._height = 0;
        this._widthSubscription = parentWidth$.subscribe(width => this._width = width);
        this._heightSubscription = parentHeight$.subscribe(height => this._height = height);
    }

    public addToContext(context: CanvasRenderingContext2D) {
        if ((this._width & this._height) == 0) {
            throw new Error("Width and or height are zero.");
        }

        context.imageSmoothingEnabled = false;
        context.beginPath();
        context.strokeStyle = "lightgray";
        if (this.gridMode === GridMode.lines) {
            const lineWidth = 1;
            context.lineWidth = lineWidth;
            // starting offset of 0 or 0.5 depending on if pixel center doesn't fall in the middle of a line
            let startingOffset = 0.5 * (lineWidth % 2);
            for (let i = startingOffset; i < this._width; i += this.gridSpacing) {
                this._drawService.addLine(context, { x: i, y: 0 }, { x: i, y: this._height });
            }
            for (let i = startingOffset; i < this._height; i += this.gridSpacing) {
                this._drawService.addLine(context, { x: 0, y: i }, { x: this._width, y: i });
            }
        }
        else if (this.gridMode === GridMode.dots) {
            const dotStrokeWidth = 2;
            context.lineWidth = dotStrokeWidth;
            let startingOffset = 0.5 * (dotStrokeWidth % 2);
            for (let i = startingOffset; i < this._width; i += this.gridSpacing) {
                this._drawService.addLine(context, { x: i, y: 0 }, { x: i, y: this._height }, [dotStrokeWidth, this.gridSpacing]);
            }
        }
    }

    public unsubscribeAll() {
        this._widthSubscription.unsubscribe();
        this._heightSubscription.unsubscribe();
    }
}