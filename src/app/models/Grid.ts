import { DrawService } from "../services/draw/draw.service";
import { Observable, Subscription } from "rxjs";
import { Drawable } from "./Drawable";
import { AbstractCanvasWrapper } from "./CanvasWrappers/AbstractCanvasWrapper";

export enum GridMode {
    lines,
    dots
};

export class Grid implements Drawable {

    public gridSpacing: number;
    public gridMode: GridMode;
    private _width: number;
    private _height: number;

    constructor(private _drawService: DrawService) {
        this.gridSpacing = 20;
        this.gridMode = GridMode.lines;
        this._width = this._height = 0;
    }

    private _updateDimensions(canvas: AbstractCanvasWrapper): void {
        this._width = canvas.width;
        this._height = canvas.height;
    }

    // TODO: fix width/height = 0 issue when resizing
    /**
     * Handles individual component drawing function
     * 
     * @param canvas 
     * @param forceUpdate 
     */
    public draw(canvas: AbstractCanvasWrapper) {
        const context = canvas.context;
        this._updateDimensions(canvas);

        console.log(this._width + ", " + this._height);

        if ((this._width & this._height) == 0) {
            throw new Error("Width and or height are zero.");
        }

        context.imageSmoothingEnabled = false;
        context.beginPath();
        if (this.gridMode === GridMode.lines) {
            context.strokeStyle = "lightgray";
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
            context.strokeStyle = "lightgray";
            const dotStrokeWidth = 2;
            context.lineWidth = dotStrokeWidth;
            let startingOffset = 0.5 * (dotStrokeWidth % 2);
            for (let i = startingOffset; i < this._width; i += this.gridSpacing) {
                this._drawService.addLine(context, { x: i, y: 0 }, { x: i, y: this._height }, [dotStrokeWidth, this.gridSpacing]);
            }
        }
        context.stroke();
    }
}