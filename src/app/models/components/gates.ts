import { Point } from "../Point";
import { Component, Node } from "./Component";

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

    draw(): void {
        throw new Error("Method not implemented.");
    }

    isSelected(mousePosition: Point): boolean {
        return false;
    }

    /* set the number of inodes and automatically calculate their positions */
    private getInputNodeListFromSize(size: number): Node[] {
        throw new Error("Method not implemented.");
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

    draw(): void {
        throw new Error("Method not implemented.");
    }
    isSelected(mousePosition: Point): boolean {
        throw new Error("Method not implemented.");
    }

    /* set the number of inodes and automatically calculate their positions */
    private getInputNodeListFromSize(size: number): Node[] {
        throw new Error("Method not implemented.");
    }
}

export class NotGate implements Component {
    position: Point;
    inodes: Node[];
    onodes: Node[];
    isGhost: boolean;

    constructor(position: Point, iNodeSize: number) {
        this.position = position;
        this.inodes = [];  // TODO: just 1
        this.onodes = [];  // TODO: just 1
        this.isGhost = false;
    }

    draw(): void {
        throw new Error("Method not implemented.");
    }
    isSelected(mousePosition: Point): boolean {
        throw new Error("Method not implemented.");
    }
}