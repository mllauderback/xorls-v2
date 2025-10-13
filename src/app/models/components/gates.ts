import { DrawService } from "../../services/draw/draw.service";
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

    getPath2D(): Path2D {
        let path = new Path2D();
        return path;
    }

    isSelected(mousePosition: Point): boolean {
        return false;
    }

    /* set the number of inodes and automatically calculate their positions */
    private getInputNodeListFromSize(size: number): Node[] {
        throw new Error("Method not implemented.");
        // return [];
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

    getPath2D(): Path2D {
        let path = new Path2D();
        return path;
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

    getPath2D(): Path2D {
        let path = new Path2D();
        return path;
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

    getPath2D(): Path2D {
        let path = new Path2D();
        return path;
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

    getPath2D(): Path2D {
        let path = new Path2D();
        return path;
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

    getPath2D(): Path2D {
        let path = new Path2D();
        return path;
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

    getPath2D(): Path2D {
        let path = new Path2D();
        return path;
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

    getPath2D(): Path2D {
        let path = new Path2D();
        return path;
    }

    isSelected(mousePosition: Point): boolean {
        throw new Error("Method not implemented.");
    }

    private getInputNodeListFromSize(size: number): Node[] {
        throw new Error("Method not implemented.");
    }
}