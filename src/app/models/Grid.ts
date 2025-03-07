import { DrawService } from "../services/draw/draw.service";
import { BufferedCanvas } from "./BufferedCanvas";
import { Drawable } from "./Drawable";
import { Point } from "./Point";
import { inject } from "@angular/core";

export enum GridMode {
    lines,
    dots
};

export class Grid implements Drawable {
    private drawService: DrawService;
    public gridSpacing: number;
    public gridMode: GridMode;

    constructor() {
        this.drawService = inject(DrawService);
        this.gridSpacing = 20;
        this.gridMode = GridMode.lines;
    }

    draw(origin: Point, canvas: BufferedCanvas, forceUpdate?: boolean): void {
        let width = canvas.getScrollWidth();
        let height = canvas.getScrollHeight();

        if (this.gridMode === GridMode.lines) {
            this.drawService.setLineDash(canvas, []);
            this.drawService.beginPath(canvas, "lightgray", 1);
            for (let i = 0; i < width; i += this.gridSpacing) {
                this.drawService.addLine(origin, canvas, { x: i, y: 0 }, { x: i, y: height });
            }
            for (let j = 0; j < height; j += this.gridSpacing) {
                this.drawService.addLine(origin, canvas, { x: 0, y: j }, { x: width, y: j});
            }
        }
        else if (this.gridMode === GridMode.dots) {
            let dotStrokeWidth = 2;
            this.drawService.beginPath(canvas, "lightgray", dotStrokeWidth);
            this.drawService.setLineDash(canvas, [dotStrokeWidth - 0.5, this.gridSpacing - 0.5]);
            for (let i = 0; i < width; i += this.gridSpacing) {
                this.drawService.addLine(origin, canvas, { x: i, y: 0 }, { x: i, y: height });
            }
        }

        this.drawService.drawToBuffer(canvas);
        if (forceUpdate) this.drawService.forceChanges = true;
    }
    
}