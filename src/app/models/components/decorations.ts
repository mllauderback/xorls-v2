import { Point } from "../Point";
import { Decoration } from "./Decoration";

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
    addToContext(context: CanvasRenderingContext2D): void {
    }

    isSelected(mousePosition: Point): boolean {
        throw new Error("Method not implemented.");
    }
}