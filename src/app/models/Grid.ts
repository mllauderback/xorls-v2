// import { DrawService } from "../services/draw/draw.service";
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

    constructor(parentWidth$: Observable<number>, parentHeight$: Observable<number>) {
        this.gridSpacing = 20;
        this.gridMode = GridMode.lines;
        this._width = this._height = 0;
        this._widthSubscription = parentWidth$.subscribe(width => this._width = width);
        this._heightSubscription = parentHeight$.subscribe(height => this._height = height);
    }

    public getPath2D(): Path2D {
        if ((this._width & this._height) == 0) {
            throw new Error("Width and or height are zero.");
        }
        let path = new Path2D();

        if (this.gridMode === GridMode.lines) {

        }

        return path;
    }

    // draw(origin: Point, canvas: BufferedCanvas, forceUpdate?: boolean): void {
    //     let width = canvas.getScrollWidth();
    //     let height = canvas.getScrollHeight();

    //     if (this.gridMode === GridMode.lines) {
    //         this.drawService.setLineDash(canvas, []);
    //         this.drawService.beginPath(canvas, "lightgray", 1);
    //         for (let i = 0; i < width; i += this.gridSpacing) {
    //             this.drawService.addLine(origin, canvas, { x: i, y: 0 }, { x: i, y: height });
    //         }
    //         for (let j = 0; j < height; j += this.gridSpacing) {
    //             this.drawService.addLine(origin, canvas, { x: 0, y: j }, { x: width, y: j});
    //         }
    //     }
    //     else if (this.gridMode === GridMode.dots) {
    //         let dotStrokeWidth = 2;
    //         this.drawService.beginPath(canvas, "lightgray", dotStrokeWidth);
    //         this.drawService.setLineDash(canvas, [dotStrokeWidth - 0.5, this.gridSpacing - 0.5]);
    //         for (let i = 0; i < width; i += this.gridSpacing) {
    //             this.drawService.addLine(origin, canvas, { x: i, y: 0 }, { x: i, y: height });
    //         }
    //     }

    //     this.drawService.drawToBuffer(canvas);
    //     if (forceUpdate) this.drawService.forceChanges = true;
    // }

    public unsubscribeAll() {
        this._widthSubscription.unsubscribe();
        this._heightSubscription.unsubscribe();
    }
}