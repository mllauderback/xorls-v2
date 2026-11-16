
import type { DrawState } from "../Drawable";
import { arcFromEndPoints } from "../drawing-helpers";
import type { Point } from "../Point";
import { BoundingBox } from "../Selectable";
import type { Component, Node } from "./Component";
import { ComponentType, createInputNodes } from "./Component";

/*
 * Gates are drawn in diagram units, which are grid cells (see GRID_SPACING): a two-input gate is 6 x 4 cells and a
 * one-input gate 4 x 2. Their pins (the ends of the input and output stubs) are whole cells from their position, so
 * they land on grid points.
 */

/** The radius of the inverting bubble on NOT, NAND, NOR and XNOR gates, in cells. */
const BUBBLE_RADIUS = 0.3;


export class AndGate implements Component {
    position: Point;
    readonly id: string = crypto.randomUUID();
    readonly type: ComponentType = ComponentType.AndGate;
    inodes: Node[];
    onodes: Node[];
    isGhost: boolean;

    constructor(position: Point, iNodeSize: number) {
        this.position = position;
        this.inodes = this.getInputNodeListFromSize(iNodeSize);
        this.onodes = [];  // TODO: just 1
        this.isGhost = false;
    }

    /** Draws in diagram coordinates: the layer's context transform puts it in the right place on the canvas. */
    draw(ctx: OffscreenCanvasRenderingContext2D, drawState: DrawState) {
        // body
        const { x, y } = this.position;
        ctx.moveTo(x + 3, y);
        ctx.lineTo(x + 1, y);
        ctx.lineTo(x + 1, y + 4);
        ctx.lineTo(x + 3, y + 4);
        ctx.moveTo(x + 3, y);
        ctx.arc(x + 3, y + 2, 2, 1.5 * Math.PI, 0.5 * Math.PI);

        // output node
        ctx.moveTo(x + 5, y + 2);
        ctx.lineTo(x + 6, y + 2);

        // input nodes (the left-most drawn pixels, at x = 0)... TODO: auto create based on inodes size
        ctx.moveTo(x + 1, y + 1);
        ctx.lineTo(x, y + 1);
        ctx.moveTo(x + 1, y + 3);
        ctx.lineTo(x, y + 3);
    }

    isSelected(mousePosition: Point): boolean {
        return this.getBoundingBox().containsPoint(mousePosition, this.position);
    }

    getBoundingBox(): BoundingBox {
        return new BoundingBox(6, 4);
    }

    /* set the number of inodes and automatically calculate their positions */
    private getInputNodeListFromSize(size: number): Node[] {
        return createInputNodes(size);
    }
}

export class OrGate implements Component {
    position: Point;
    readonly id: string = crypto.randomUUID();
    readonly type: ComponentType = ComponentType.OrGate;
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
        const { x, y } = this.position;
        const backArgs = arcFromEndPoints(x + 1, y, x + 1, y + 4, 4);
        if (!backArgs) return;

        // body
        ctx.moveTo(x + 2.5, y);
        ctx.lineTo(x + 1, y);
        ctx.arc(...backArgs);
        ctx.lineTo(x + 2.5, y + 4);
        ctx.bezierCurveTo(x + 2.5, y + 4, x + 4.5, y + 4, x + 5, y + 2);
        ctx.moveTo(x + 2.5, y);
        ctx.bezierCurveTo(x + 2.5, y, x + 4.5, y, x + 5, y + 2);

        // output node
        ctx.moveTo(x + 5, y + 2);
        ctx.lineTo(x + 6, y + 2);

        // input nodes (the left-most drawn pixels, at x = 0)... TODO: auto create based on inodes size
        ctx.moveTo(x + 1.35, y + 1);
        ctx.lineTo(x, y + 1);
        ctx.moveTo(x + 1.35, y + 3);
        ctx.lineTo(x, y + 3);
    }

    isSelected(mousePosition: Point): boolean {
        return this.getBoundingBox().containsPoint(mousePosition, this.position);
    }

    getBoundingBox(): BoundingBox {
        return new BoundingBox(6, 4);
    }

    /* set the number of inodes and automatically calculate their positions */
    private getInputNodeListFromSize(size: number): Node[] {
        return createInputNodes(size);
    }
}

export class XorGate implements Component {
    position: Point;
    readonly id: string = crypto.randomUUID();
    readonly type: ComponentType = ComponentType.XorGate;
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
        const { x, y } = this.position;
        const backArgs = arcFromEndPoints(x + 1, y, x + 1, y + 4, 4);
        const doubleArgs = arcFromEndPoints(x + 0.5, y, x + 0.5, y + 4, 4);
        if (!backArgs || !doubleArgs) return;

        // body
        ctx.moveTo(x + 2.5, y);
        ctx.lineTo(x + 1, y);
        ctx.arc(...backArgs);
        ctx.lineTo(x + 2.5, y + 4);
        ctx.bezierCurveTo(x + 2.5, y + 4, x + 4.5, y + 4, x + 5, y + 2);
        ctx.moveTo(x + 2.5, y);
        ctx.bezierCurveTo(x + 2.5, y, x + 4.5, y, x + 5, y + 2);

        ctx.moveTo(x + 0.5, y);
        ctx.arc(...doubleArgs);

        // output node
        ctx.moveTo(x + 5, y + 2);
        ctx.lineTo(x + 6, y + 2);

        // input nodes (the left-most drawn pixels, at x = 0)... TODO: auto create based on inodes size
        ctx.moveTo(x + 0.85, y + 1);
        ctx.lineTo(x, y + 1);
        ctx.moveTo(x + 0.85, y + 3);
        ctx.lineTo(x, y + 3);
    }

    isSelected(mousePosition: Point): boolean {
        return this.getBoundingBox().containsPoint(mousePosition, this.position);
    }

    getBoundingBox(): BoundingBox {
        return new BoundingBox(6, 4);
    }

    private getInputNodeListFromSize(size: number): Node[] {
        return createInputNodes(size);
    }
}

export class NotGate implements Component {
    position: Point;
    readonly id: string = crypto.randomUUID();
    readonly type: ComponentType = ComponentType.NotGate;
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
        // body
        const { x, y } = this.position;
        ctx.moveTo(x + 1, y);
        ctx.lineTo(x + 1, y + 2);
        ctx.lineTo(x + 3, y + 1);
        ctx.lineTo(x + 1, y);

        ctx.moveTo(x + 3.6, y + 1);
        ctx.arc(x + 3.3, y + 1, BUBBLE_RADIUS, 0, 2 * Math.PI);

        // output node
        ctx.moveTo(x + 3.6, y + 1);
        ctx.lineTo(x + 4, y + 1);

        // input node
        ctx.moveTo(x + 1, y + 1);
        ctx.lineTo(x, y + 1);
    }

    isSelected(mousePosition: Point): boolean {
        return this.getBoundingBox().containsPoint(mousePosition, this.position);
    }

    getBoundingBox(): BoundingBox {
        return new BoundingBox(4, 2);
    }
}

export class Buffer implements Component {
    position: Point;
    readonly id: string = crypto.randomUUID();
    readonly type: ComponentType = ComponentType.Buffer;
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
        // body
        const { x, y } = this.position;
        ctx.moveTo(x + 1, y);
        ctx.lineTo(x + 1, y + 2);
        ctx.lineTo(x + 3, y + 1);
        ctx.lineTo(x + 1, y);

        // output node
        ctx.moveTo(x + 3, y + 1);
        ctx.lineTo(x + 4, y + 1);

        // input node
        ctx.moveTo(x + 1, y + 1);
        ctx.lineTo(x, y + 1);
    }

    isSelected(mousePosition: Point): boolean {
        return this.getBoundingBox().containsPoint(mousePosition, this.position);
    }

    getBoundingBox(): BoundingBox {
        return new BoundingBox(4, 2);
    }
}

export class NandGate implements Component {
    position: Point;
    readonly id: string = crypto.randomUUID();
    readonly type: ComponentType = ComponentType.NandGate;
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
        // body
        const { x, y } = this.position;
        ctx.moveTo(x + 3, y);
        ctx.lineTo(x + 1, y);
        ctx.lineTo(x + 1, y + 4);
        ctx.lineTo(x + 3, y + 4);
        ctx.moveTo(x + 3, y);
        ctx.arc(x + 3, y + 2, 2, 1.5 * Math.PI, 0.5 * Math.PI);

        ctx.moveTo(x + 5.55, y + 2);
        ctx.arc(x + 5.3, y + 2, BUBBLE_RADIUS, 0, 2 * Math.PI);

        // output node
        ctx.moveTo(x + 5.55, y + 2);
        ctx.lineTo(x + 6, y + 2);

        // input nodes (the left-most drawn pixels, at x = 0)... TODO: auto create based on inodes size
        ctx.moveTo(x + 1, y + 1);
        ctx.lineTo(x, y + 1);
        ctx.moveTo(x + 1, y + 3);
        ctx.lineTo(x, y + 3);
    }

    isSelected(mousePosition: Point): boolean {
        return this.getBoundingBox().containsPoint(mousePosition, this.position);
    }

    getBoundingBox(): BoundingBox {
        return new BoundingBox(6, 4);
    }

    private getInputNodeListFromSize(size: number): Node[] {
        return createInputNodes(size);
    }
}

export class NorGate implements Component {
    position: Point;
    readonly id: string = crypto.randomUUID();
    readonly type: ComponentType = ComponentType.NorGate;
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
        const { x, y } = this.position;
        const backArgs = arcFromEndPoints(x + 1, y, x + 1, y + 4, 4);
        if (!backArgs) return;

        // body
        ctx.moveTo(x + 2.5, y);
        ctx.lineTo(x + 1, y);
        ctx.arc(...backArgs);
        ctx.lineTo(x + 2.5, y + 4);
        ctx.bezierCurveTo(x + 2.5, y + 4, x + 4.5, y + 4, x + 5, y + 2);
        ctx.moveTo(x + 2.5, y);
        ctx.bezierCurveTo(x + 2.5, y, x + 4.5, y, x + 5, y + 2);

        ctx.moveTo(x + 5.55, y + 2);
        ctx.arc(x + 5.3, y + 2, BUBBLE_RADIUS, 0, 2 * Math.PI);

        // output node
        ctx.moveTo(x + 5.55, y + 2);
        ctx.lineTo(x + 6, y + 2);

        // input nodes (the left-most drawn pixels, at x = 0)... TODO: auto create based on inodes size
        ctx.moveTo(x + 1.35, y + 1);
        ctx.lineTo(x, y + 1);
        ctx.moveTo(x + 1.35, y + 3);
        ctx.lineTo(x, y + 3);
    }

    isSelected(mousePosition: Point): boolean {
        return this.getBoundingBox().containsPoint(mousePosition, this.position);
    }

    getBoundingBox(): BoundingBox {
        return new BoundingBox(6, 4);
    }

    private getInputNodeListFromSize(size: number): Node[] {
        return createInputNodes(size);
    }
}

export class XnorGate implements Component {
    position: Point;
    readonly id: string = crypto.randomUUID();
    readonly type: ComponentType = ComponentType.XnorGate;
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
        const { x, y } = this.position;
        const backArgs = arcFromEndPoints(x + 1, y, x + 1, y + 4, 4);
        const doubleArgs = arcFromEndPoints(x + 0.5, y, x + 0.5, y + 4, 4);
        if (!backArgs || !doubleArgs) return;

        // body
        ctx.moveTo(x + 2.5, y);
        ctx.lineTo(x + 1, y);
        ctx.arc(...backArgs);
        ctx.lineTo(x + 2.5, y + 4);
        ctx.bezierCurveTo(x + 2.5, y + 4, x + 4.5, y + 4, x + 5, y + 2);
        ctx.moveTo(x + 2.5, y);
        ctx.bezierCurveTo(x + 2.5, y, x + 4.5, y, x + 5, y + 2);

        ctx.moveTo(x + 0.5, y);
        ctx.arc(...doubleArgs);

        ctx.moveTo(x + 5.55, y + 2);
        ctx.arc(x + 5.3, y + 2, BUBBLE_RADIUS, 0, 2 * Math.PI);

        // output node
        ctx.moveTo(x + 5.55, y + 2);
        ctx.lineTo(x + 6, y + 2);

        // input nodes (the left-most drawn pixels, at x = 0)... TODO: auto create based on inodes size
        ctx.moveTo(x + 0.85, y + 1);
        ctx.lineTo(x, y + 1);
        ctx.moveTo(x + 0.85, y + 3);
        ctx.lineTo(x, y + 3);
    }

    isSelected(mousePosition: Point): boolean {
        return this.getBoundingBox().containsPoint(mousePosition, this.position);
    }

    getBoundingBox(): BoundingBox {
        return new BoundingBox(6, 4);
    }

    private getInputNodeListFromSize(size: number): Node[] {
        return createInputNodes(size);
    }
}
