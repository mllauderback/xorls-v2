import type { Drawable } from "../Drawable";
import type { Ghostable } from "../Ghostable";
import type { Point } from "../Point";
import type { BoundingBox, Selectable } from "../Selectable";

export class Node implements Selectable {
    public position: Point;
    public state: boolean;

    constructor(position: Point) {
        this.position = { x: position.x, y: position.y };
        this.state = false;
    }

    isSelected(): boolean {
        return this.state
    }

    getBoundingBox(): BoundingBox {
        // this will change
        return { x: this.position.x, y: this.position.y, width: 0, height: 0 };
    }
}

export enum ComponentType {
    AndGate = "AndGate",
    OrGate = "OrGate",
    XorGate = "XorGate",
    NotGate = "NotGate",
    NandGate = "NandGate",
    NorGate = "NorGate",
    XnorGate = "XnorGate",
    Buffer = "Buffer",
    Input = "Input",
    Output = "Output",
    SevenSeg = "SevenSegmentDisplay",
    Text = "Text"
}

export interface Component extends Drawable, Selectable, Ghostable {
    /**
     * Identifies this component for as long as it exists, including while it is still a ghost. The store refers to
     * a selected component by this id instead of holding the instance, so that its state is plain data.
     */
    readonly id: string;
    readonly type: ComponentType;
    position: Point;
    inodes: Node[];
    onodes: Node[];
}

/**
 * Creates `size` input nodes.
 * Node positions are placeholders until each gate lays out its own nodes.
 */
export function createInputNodes(size: number): Node[] {
    return Array.from({ length: size }, () => new Node({ x: 0, y: 0 }));
}
