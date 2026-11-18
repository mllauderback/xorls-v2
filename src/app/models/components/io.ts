import type { Point } from "../Point";
import { BoundingBox } from "../Selectable";
import { ComponentType, type Component, type Node } from "./Component";

export class Input implements Component {
    position: Point;
    readonly id: string = crypto.randomUUID();
    readonly type: ComponentType = ComponentType.Input;
    inodes: Node[];
    onodes: Node[];
    isGhost: boolean;

    constructor(position: Point) {
        this.position = position;
        this.inodes = [];
        this.onodes = []; // TODO: 1 onode;
        this.isGhost = false;
    }

    draw(ctx: OffscreenCanvasRenderingContext2D) {
    }

    isSelected(mousePosition: Point): boolean {
        throw new Error("Method not implemented.");
    }

    getBoundingBox(): BoundingBox {
        return new BoundingBox(3, 2);
    }
}

export class Output implements Component {
    position: Point;
    readonly id: string = crypto.randomUUID();
    readonly type: ComponentType = ComponentType.Output;
    inodes: Node[];
    onodes: Node[];
    isGhost: boolean;

    constructor(position: Point) {
        this.position = position;
        this.inodes = []; // TODO: 1 inode;
        this.onodes = [];
        this.isGhost = false;
    }

    draw(ctx: OffscreenCanvasRenderingContext2D) {
    }

    isSelected(mousePosition: Point): boolean {
        throw new Error("Method not implemented.");
    }

    getBoundingBox(): BoundingBox {
        return new BoundingBox(3, 2);
    }

}

export class SevenSegmentDisplay implements Component {
    position: Point;
    readonly id: string = crypto.randomUUID();
    readonly type: ComponentType = ComponentType.SevenSeg;
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

    draw(ctx: OffscreenCanvasRenderingContext2D) {
    }

    isSelected(mousePosition: Point): boolean {
        throw new Error("Method not implemented.");
    }

    getBoundingBox(): BoundingBox {
        return new BoundingBox(4, 6);
    }

}
