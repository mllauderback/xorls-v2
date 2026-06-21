import type { Drawable, DrawState } from "./Drawable";

export type GridMode = 'lines' | 'dots';
export class Grid implements Drawable {

    public gridSpacing: number;
    public gridMode: GridMode;
    private _width: number;
    private _height: number;

    constructor(gridSpacing: number, gridMode: GridMode) {
        this.gridSpacing = gridSpacing;
        this.gridMode = gridMode;
        this._width = this._height = 0;
    }

    private _updateDimensions(ctx: CanvasRenderingContext2D): void {
        this._width = ctx.canvas.width;
        this._height = ctx.canvas.height;
    }

    // TODO: fix width/height = 0 issue when resizing
    /**
     * Handles individual component drawing function
     * 
     * @param ctx The 2D context on which to draw
     * @param forceUpdate Global draw state information
     */
    public draw(ctx: CanvasRenderingContext2D, _drawState: DrawState) {
        this._updateDimensions(ctx);

        // console.log('Grid drawn, ', this._width + ", " + this._height);

        if (this._width === 0 && this._height === 0) {
            throw new Error("Width and or height are zero.");
        }

        ctx.imageSmoothingEnabled = false;
        if (this.gridMode === 'lines') {
            ctx.strokeStyle = "lightgray";
            const lineWidth = 1;
            ctx.lineWidth = lineWidth;
            ctx.setLineDash([]);
            // starting offset of 0 or 0.5 depending on if pixel center doesn't fall in the middle of a line
            const startingOffset = 0.5 * (lineWidth % 2);
            for (let i = startingOffset; i < this._width; i += this.gridSpacing) {
                ctx.moveTo(i, 0);
                ctx.lineTo(i, this._height);
            }
            for (let i = startingOffset; i < this._height; i += this.gridSpacing) {
                ctx.moveTo(0, i);
                ctx.lineTo(this._width, i);
            }
        }
        else if (this.gridMode === 'dots') {
            ctx.strokeStyle = "lightgray";
            const dotStrokeWidth = 2;
            ctx.lineWidth = dotStrokeWidth;
            ctx.setLineDash([dotStrokeWidth, this.gridSpacing - dotStrokeWidth]);
            const startingXOffset = 0.5 * (dotStrokeWidth % 2);
            const startingYOffset = dotStrokeWidth / -2;
            for (let i = startingXOffset; i < this._width; i += this.gridSpacing) {
                ctx.moveTo(i, startingYOffset);
                ctx.lineTo(i, this._height);
            }
        }
    }
}