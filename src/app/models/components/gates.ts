
import type { BoundingBox } from "../Bounded";
import type { DrawState } from "../Drawable";
import type { Point } from "../Point";
import type { Component, Node } from "./Component";
import { createInputNodes } from "./Component";

// TODO: Apply drawState.origin adjustments to all other gates/components

/**
 * Footprint of AndGate.draw(): an 80x80 body with 20px pins on the left (inputs) and right (output).
 * The other gates reuse it as a placeholder until their own draw() is implemented.
 */
const GATE_BOUNDING_BOX: BoundingBox = { x: -20, y: 0, width: 120, height: 80 };

export class AndGate implements Component {
    position: Point;
    readonly id: string = crypto.randomUUID();
    inodes: Node[];
    onodes: Node[];
    isGhost: boolean;

    constructor(position: Point, iNodeSize: number) {
        this.position = position;
        this.inodes = this.getInputNodeListFromSize(iNodeSize);
        this.onodes = [];  // TODO: just 1
        this.isGhost = false;
    }

    draw(ctx: OffscreenCanvasRenderingContext2D, drawState: DrawState) {
        // console.log('And gate drawn', this.position.x, ', ', this.position.y);
        // body
        const x = this.position.x + drawState.origin.x;
        const y = this.position.y + drawState.origin.y;
        ctx.moveTo(x + 40, y);
        ctx.lineTo(x, y);
        ctx.lineTo(x, y + 80);
        ctx.lineTo(x + 40, y + 80);
        ctx.moveTo(x + 40, y);
        ctx.arc(x + 40, y + 40, 40, 1.5 * Math.PI, 0.5 * Math.PI);

        // output node
        ctx.moveTo(x + 80, y + 40);
        ctx.lineTo(x + 100, y + 40);

        // input nodes... TODO: auto create based on inodes size
        ctx.moveTo(x, y + 20);
        ctx.lineTo(x - 20, y + 20);
        ctx.moveTo(x, y + 60);
        ctx.lineTo(x - 20, y + 60);
    }

    isSelected(mousePosition: Point): boolean {
        return false;
    }

    getBoundingBox(): BoundingBox {
        return { ...GATE_BOUNDING_BOX };
    }

    /* set the number of inodes and automatically calculate their positions */
    private getInputNodeListFromSize(size: number): Node[] {
        return createInputNodes(size);
    }
}

export class OrGate implements Component {
    position: Point;
    readonly id: string = crypto.randomUUID();
    inodes: Node[];
    onodes: Node[];
    isGhost: boolean;

    constructor(position: Point, iNodeSize: number) {
        this.position = position;
        this.inodes = this.getInputNodeListFromSize(iNodeSize);
        this.onodes = [];  // TODO: just 1
        this.isGhost = false;
    }

    draw(ctx: OffscreenCanvasRenderingContext2D, drawState: DrawState) {
    }

    isSelected(mousePosition: Point): boolean {
        throw new Error("Method not implemented.");
    }

    getBoundingBox(): BoundingBox {
        return { ...GATE_BOUNDING_BOX };
    }

    /* set the number of inodes and automatically calculate their positions */
    private getInputNodeListFromSize(size: number): Node[] {
        return createInputNodes(size);
    }
}

export class XorGate implements Component {
    position: Point;
    readonly id: string = crypto.randomUUID();
    inodes: Node[];
    onodes: Node[];
    isGhost: boolean;

    constructor(position: Point, iNodeSize: number) {
        this.position = position;
        this.inodes = this.getInputNodeListFromSize(iNodeSize);
        this.onodes = []; // TODO just 1
        this.isGhost = false;
    }

    draw(ctx: OffscreenCanvasRenderingContext2D, drawState: DrawState) {
    }

    isSelected(mousePosition: Point): boolean {
        throw new Error("Method not implemented.");
    }

    getBoundingBox(): BoundingBox {
        return { ...GATE_BOUNDING_BOX };
    }

    private getInputNodeListFromSize(size: number): Node[] {
        return createInputNodes(size);
    }
}

export class NotGate implements Component {
    position: Point;
    readonly id: string = crypto.randomUUID();
    inodes: Node[];
    onodes: Node[];
    isGhost: boolean;

    constructor(position: Point) {
        this.position = position;
        this.inodes = [];  // TODO: just 1
        this.onodes = [];  // TODO: just 1
        this.isGhost = false;
    }

    draw(ctx: OffscreenCanvasRenderingContext2D, drawState: DrawState) {
    }

    isSelected(mousePosition: Point): boolean {
        throw new Error("Method not implemented.");
    }

    getBoundingBox(): BoundingBox {
        return { ...GATE_BOUNDING_BOX };
    }
}

export class Buffer implements Component {
    position: Point;
    readonly id: string = crypto.randomUUID();
    inodes: Node[];
    onodes: Node[];
    isGhost: boolean;

    constructor(position: Point) {
        this.position = position;
        this.inodes = [];
        this.onodes = [];
        this.isGhost = false;
    }

    draw(ctx: OffscreenCanvasRenderingContext2D, drawState: DrawState) {
    }

    isSelected(mousePosition: Point): boolean {
        throw new Error("Method not implemented.");
    }

    getBoundingBox(): BoundingBox {
        return { ...GATE_BOUNDING_BOX };
    }
}

export class NandGate implements Component {
    position: Point;
    readonly id: string = crypto.randomUUID();
    inodes: Node[];
    onodes: Node[];
    isGhost: boolean;

    constructor(position: Point, iNodeSize: number) {
        this.position = position;
        this.inodes = this.getInputNodeListFromSize(iNodeSize);
        this.onodes = []; // TODO just 1
        this.isGhost = false;
    }

    draw(ctx: OffscreenCanvasRenderingContext2D, drawState: DrawState) {
    }

    isSelected(mousePosition: Point): boolean {
        throw new Error("Method not implemented.");
    }

    getBoundingBox(): BoundingBox {
        return { ...GATE_BOUNDING_BOX };
    }

    private getInputNodeListFromSize(size: number): Node[] {
        return createInputNodes(size);
    }
}

export class NorGate implements Component {
    position: Point;
    readonly id: string = crypto.randomUUID();
    inodes: Node[];
    onodes: Node[];
    isGhost: boolean;

    constructor(position: Point, iNodeSize: number) {
        this.position = position;
        this.inodes = this.getInputNodeListFromSize(iNodeSize);
        this.onodes = []; // TODO just 1
        this.isGhost = false;
    }

    draw(ctx: OffscreenCanvasRenderingContext2D, drawState: DrawState) {
    }

    isSelected(mousePosition: Point): boolean {
        throw new Error("Method not implemented.");
    }

    getBoundingBox(): BoundingBox {
        return { ...GATE_BOUNDING_BOX };
    }

    private getInputNodeListFromSize(size: number): Node[] {
        return createInputNodes(size);
    }
}

export class XnorGate implements Component {
    position: Point;
    readonly id: string = crypto.randomUUID();
    inodes: Node[];
    onodes: Node[];
    isGhost: boolean;

    constructor(position: Point, iNodeSize: number) {
        this.position = position;
        this.inodes = this.getInputNodeListFromSize(iNodeSize);
        this.onodes = []; // TODO just 1
        this.isGhost = false;
    }

    draw(ctx: OffscreenCanvasRenderingContext2D, drawState: DrawState) {
    }

    isSelected(mousePosition: Point): boolean {
        throw new Error("Method not implemented.");
    }

    getBoundingBox(): BoundingBox {
        return { ...GATE_BOUNDING_BOX };
    }

    private getInputNodeListFromSize(size: number): Node[] {
        return createInputNodes(size);
    }
}
