import { Point } from "../Point";
import { Component, Node } from "./Component";

export class Input implements Component {
    position: Point;
    inodes: Node[];
    onodes: Node[];
    isGhost: boolean;

    constructor(position: Point) {
        this.position = position;
        this.inodes = [];
        this.onodes = []; // TODO: 1 onode;
        this.isGhost = false;
    }

    draw(): void {
        throw new Error("Method not implemented.");
    }
    isSelected(mousePosition: Point): boolean {
        throw new Error("Method not implemented.");
    }
}

export class Output implements Component {
    position: Point;
    inodes: Node[];
    onodes: Node[];
    isGhost: boolean;

    constructor(position: Point) {
        this.position = position;
        this.inodes = []; // TODO: 1 inode;
        this.onodes = [];
        this.isGhost = false;
    }

    draw(): void {
        throw new Error("Method not implemented.");
    }
    isSelected(mousePosition: Point): boolean {
        throw new Error("Method not implemented.");
    }
    
}

export class SevenSegmentDisplay implements Component {
    position: Point;
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

    draw(): void {
        throw new Error("Method not implemented.");
    }
    isSelected(mousePosition: Point): boolean {
        throw new Error("Method not implemented.");
    }
    
}