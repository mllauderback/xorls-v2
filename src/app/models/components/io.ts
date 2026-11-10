import type { BoundingBox } from "../Bounded";
import type { DrawState } from "../Drawable";
import type { Point } from "../Point";
import type { Component, Node } from "./Component";

// Placeholder footprints until each component's draw() is implemented.
const IO_BOUNDING_BOX: BoundingBox = { x: 0, y: 0, width: 60, height: 40 };
const SEVEN_SEGMENT_BOUNDING_BOX: BoundingBox = { x: 0, y: 0, width: 80, height: 120 };

export class Input implements Component {
    position: Point;
    readonly id: string = crypto.randomUUID();
    inodes: Node[];
    onodes: Node[];
    isGhost: boolean;

    constructor(position: Point) {
        this.position = position;
        this.inodes = [];
        this.onodes = []; // TODO: 1 onode;
        this.isGhost = false;
    }

    draw(ctx: OffscreenCanvasRenderingContext2D, drawState: DrawState) {
    }

    isSelected(mousePosition: Point): boolean {
        throw new Error("Method not implemented.");
    }

    getBoundingBox(): BoundingBox {
        return { ...IO_BOUNDING_BOX };
    }
}

export class Output implements Component {
    position: Point;
    readonly id: string = crypto.randomUUID();
    inodes: Node[];
    onodes: Node[];
    isGhost: boolean;

    constructor(position: Point) {
        this.position = position;
        this.inodes = []; // TODO: 1 inode;
        this.onodes = [];
        this.isGhost = false;
    }

    draw(ctx: OffscreenCanvasRenderingContext2D, drawState: DrawState) {
    }

    isSelected(mousePosition: Point): boolean {
        throw new Error("Method not implemented.");
    }

    getBoundingBox(): BoundingBox {
        return { ...IO_BOUNDING_BOX };
    }

}

export class SevenSegmentDisplay implements Component {
    position: Point;
    readonly id: string = crypto.randomUUID();
    inodes: Node[];
    onodes: Node[];
    isGhost: boolean;

    busWidth: number;

    constructor(position: Point, busWidth: number) {
        this.position = position;
        this.inodes = [];
        this.onodes = []; // TODO: 1 onode
        this.isGhost = false;

        this.busWidth = busWidth;
    }

    draw(ctx: OffscreenCanvasRenderingContext2D, drawState: DrawState) {
    }

    isSelected(mousePosition: Point): boolean {
        throw new Error("Method not implemented.");
    }

    getBoundingBox(): BoundingBox {
        return { ...SEVEN_SEGMENT_BOUNDING_BOX };
    }

}
