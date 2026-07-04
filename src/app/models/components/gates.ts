
import type { DrawState } from "../Drawable";
import type { Point } from "../Point";
import type { Component } from "./Component";
import { Node } from "./Component";

// TODO: Apply drawState.origin adjustments to all other gates/components

export class AndGate implements Component {
    position: Point;
    inodes: Node[];
    onodes: Node[];
    isGhost: boolean;

    constructor(position: Point, iNodeSize: number) {
        this.position = position;
        this.inodes = this.getInputNodeListFromSize(iNodeSize);
        this.onodes = [];  // TODO: just 1
        this.isGhost = false;
    }

    draw(ctx: CanvasRenderingContext2D, drawState: DrawState) {
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

    /* set the number of inodes and automatically calculate their positions */
    private getInputNodeListFromSize(size: number): Node[] {
        const iNodeList = [];
        for (let i = 0; i < size; i++) {
            iNodeList.push(new Node({ x: 0, y: 0 }));
        }
        return [];
    }
}

export class OrGate implements Component {
    position: Point;
    inodes: Node[];
    onodes: Node[];
    isGhost: boolean;

    constructor(position: Point, iNodeSize: number) {
        this.position = position;
        this.inodes = this.getInputNodeListFromSize(iNodeSize);
        this.onodes = [];  // TODO: just 1
        this.isGhost = false;
    }

    draw(ctx: CanvasRenderingContext2D, drawState: DrawState) {
    }

    isSelected(mousePosition: Point): boolean {
        throw new Error("Method not implemented.");
    }

    /* set the number of inodes and automatically calculate their positions */
    private getInputNodeListFromSize(size: number): Node[] {
        throw new Error("Method not implemented.");
    }
}

export class XorGate implements Component {
    position: Point;
    inodes: Node[];
    onodes: Node[];
    isGhost: boolean;

    constructor(position: Point, iNodeSize: number) {
        this.position = position;
        this.inodes = this.getInputNodeListFromSize(iNodeSize);
        this.onodes = []; // TODO just 1
        this.isGhost = false;
    }

    draw(ctx: CanvasRenderingContext2D, drawState: DrawState) {
    }

    isSelected(mousePosition: Point): boolean {
        throw new Error("Method not implemented.");
    }

    private getInputNodeListFromSize(size: number): Node[] {
        throw new Error("Method not implemented.");
    }
}

export class NotGate implements Component {
    position: Point;
    inodes: Node[];
    onodes: Node[];
    isGhost: boolean;

    constructor(position: Point) {
        this.position = position;
        this.inodes = [];  // TODO: just 1
        this.onodes = [];  // TODO: just 1
        this.isGhost = false;
    }

    draw(ctx: CanvasRenderingContext2D, drawState: DrawState) {
    }

    isSelected(mousePosition: Point): boolean {
        throw new Error("Method not implemented.");
    }
}

export class Buffer implements Component {
    position: Point;
    inodes: Node[];
    onodes: Node[];
    isGhost: boolean;

    constructor(position: Point) {
        this.position = position;
        this.inodes = [];
        this.onodes = [];
        this.isGhost = false;
    }

    draw(ctx: CanvasRenderingContext2D, drawState: DrawState) {
    }

    isSelected(mousePosition: Point): boolean {
        throw new Error("Method not implemented.");
    }
}

export class NandGate implements Component {
    position: Point;
    inodes: Node[];
    onodes: Node[];
    isGhost: boolean;

    constructor(position: Point, iNodeSize: number) {
        this.position = position;
        this.inodes = this.getInputNodeListFromSize(iNodeSize);
        this.onodes = []; // TODO just 1
        this.isGhost = false;
    }

    draw(ctx: CanvasRenderingContext2D, drawState: DrawState) {
    }

    isSelected(mousePosition: Point): boolean {
        throw new Error("Method not implemented.");
    }

    private getInputNodeListFromSize(size: number): Node[] {
        throw new Error("Method not implemented.");
    }
}

export class NorGate implements Component {
    position: Point;
    inodes: Node[];
    onodes: Node[];
    isGhost: boolean;

    constructor(position: Point, iNodeSize: number) {
        this.position = position;
        this.inodes = this.getInputNodeListFromSize(iNodeSize);
        this.onodes = []; // TODO just 1
        this.isGhost = false;
    }

    draw(ctx: CanvasRenderingContext2D, drawState: DrawState) {
    }

    isSelected(mousePosition: Point): boolean {
        throw new Error("Method not implemented.");
    }

    private getInputNodeListFromSize(size: number): Node[] {
        throw new Error("Method not implemented.");
    }
}

export class XnorGate implements Component {
    position: Point;
    inodes: Node[];
    onodes: Node[];
    isGhost: boolean;

    constructor(position: Point, iNodeSize: number) {
        this.position = position;
        this.inodes = this.getInputNodeListFromSize(iNodeSize);
        this.onodes = []; // TODO just 1
        this.isGhost = false;
    }

    draw(ctx: CanvasRenderingContext2D, drawState: DrawState) {
    }

    isSelected(mousePosition: Point): boolean {
        throw new Error("Method not implemented.");
    }

    private getInputNodeListFromSize(size: number): Node[] {
        throw new Error("Method not implemented.");
    }
}