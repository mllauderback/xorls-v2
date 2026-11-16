import type { Point } from "../Point";
import type { Decoration } from "./Decoration";
import type { DrawState } from "../Drawable";
import { ComponentType } from "./Component";
import { BoundingBox } from "../Selectable";

export class Text implements Decoration {
    position: Point;
    readonly id: string = crypto.randomUUID();
    readonly type: ComponentType = ComponentType.Text;
    font: string; // type may change to an enum who knows
    size: number;
    isGhost: boolean;

    constructor(position: Point) {
        this.position = position;
        this.font = "";
        this.size = 12;
        this.isGhost = false;
    }

    draw(ctx: OffscreenCanvasRenderingContext2D, drawState: DrawState) {
    }

    isSelected(mousePosition: Point): boolean {
        throw new Error("Method not implemented.");
    }

    getBoundingBox(): BoundingBox {
        return new BoundingBox(4, 1); // should reflect text font size instead
    }
}
