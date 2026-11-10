import type { BoundingBox } from "../Bounded";
import type { Point } from "../Point";
import type { Decoration } from "./Decoration";
import type { DrawState } from "../Drawable";

// Placeholder footprint until Text.draw() is implemented.
const TEXT_BOUNDING_BOX: BoundingBox = { x: 0, y: 0, width: 80, height: 20 };

export class Text implements Decoration {
    position: Point;
    readonly id: string = crypto.randomUUID();
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
        return { ...TEXT_BOUNDING_BOX };
    }
}
