import { Drawable } from "../Drawable";
import { Ghostable } from "../Ghostable";
import { Point } from "../Point";
import { Selectable } from "../Selectable";
import { AndGate, OrGate } from "./gates";

export class Node implements Selectable {
    public position: Point;
    public state: boolean;

    constructor() {
        this.position = { x: 0, y: 0 };
        this.state = false;
    }

    isSelected(): boolean {
        throw new Error("Method not implemented.");
    }
}

export interface Component extends Drawable, Selectable, Ghostable {
    position: Point;
    inodes: Node[];
    onodes: Node[];
}

export function createComponent(componentName: string, mousePosition: Point): Component {
    switch(componentName) {
        case AndGate.name:
            return new AndGate(mousePosition, 2); // iNodeSize will be pulled from properties panel
        
        case OrGate.name:
            return new OrGate(mousePosition, 2);

        default:
            throw new Error("Component name not recognized.");
    }
}