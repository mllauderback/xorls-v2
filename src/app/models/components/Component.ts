import type { Bounded } from "../Bounded";
import type { Drawable } from "../Drawable";
import type { Ghostable } from "../Ghostable";
import type { Point } from "../Point";
import type { Selectable } from "../Selectable";

export class Node implements Selectable {
    public position: Point;
    public state: boolean;

    constructor(position: Point) {
        this.position = { x: position.x, y: position.y };
        this.state = false;
    }

    isSelected(): boolean {
        throw new Error("Method not implemented.");
    }
}

export interface Component extends Drawable, Selectable, Ghostable, Bounded {
    /**
     * Identifies this component for as long as it exists, including while it is still a ghost. The store refers to
     * a selected component by this id instead of holding the instance, so that its state is plain data.
     */
    readonly id: string;
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
