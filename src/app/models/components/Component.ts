import type { Drawable } from "../Drawable";
import type { Ghostable } from "../Ghostable";
import type { Point } from "../Point";
import { Property, type PropertyField } from "../Property";
import type { Selectable } from "../Selectable";
import { BoundingBox } from "../Selectable";

export class Node implements Selectable {
    public position: Point;
    public state: BigInt;
    properties: Partial<Record<PropertyField, Property>>;

    constructor(position: Point) {
        this.position = { x: position.x, y: position.y };
        this.state = 0n;
        this.properties = {
            'Bus Width': new Property(1, true),
        };
    }

    isSelected(): boolean {
        return false;
    }

    getBoundingBox(): BoundingBox {
        // this will change
        return new BoundingBox(0, 0);
    }

    updateProperty(field: PropertyField = 'Bus Width', property: Property): void {
        if (!Object.hasOwn(this.properties, field)) throw new Error(`Node does not have property ${field}`);
        this.properties[field] = property;
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