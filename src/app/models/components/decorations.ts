import type { Point } from "../Point";
import type { Decoration } from "./Decoration";
import type { DrawState } from "../Drawable";

export class Text implements Decoration {
    position: Point;
    font: string; // type may change to an enum who knows
    size: number;
    isGhost: boolean;

    constructor(position: Point) {
        this.position = position;
        this.font = "";
        this.size = 12;
        this.isGhost = false;
    }
    
    draw(ctx: CanvasRenderingContext2D, drawState: DrawState) {
    }

    isSelected(mousePosition: Point): boolean {
        throw new Error("Method not implemented.");
    }
}