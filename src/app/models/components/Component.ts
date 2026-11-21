import type { Drawable, DrawState } from "../Drawable";
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

/**
 * The base of every component that can be placed in a diagram. It holds what all components share, and the default
 * behaviour a subclass overrides when it needs something different.
 */
export abstract class Component implements Drawable, Selectable, Ghostable {
    /**
     * Identifies this component for as long as it exists, including while it is still a ghost. The store refers to
     * a selected component by this id instead of holding the instance, so that its state is plain data.
     */
    readonly id: string = crypto.randomUUID();
    abstract readonly type: ComponentType;
    position: Point;
    inodes: Node[] = [];
    onodes: Node[] = [];
    isGhost = false;
    abstract properties: Partial<Record<PropertyField, Property>>;

    /**
     * @param position The position of the component's top-left corner, in diagram coordinates
     */
    constructor(position: Point) {
        this.position = position;
    }

    abstract draw(ctx: OffscreenCanvasRenderingContext2D, state: DrawState): void;

    abstract getBoundingBox(): BoundingBox;

    /** True when the point is inside the component's bounding box, edges included. */
    isSelected(mousePosition: Point): boolean {
        return this.getBoundingBox().containsPoint(mousePosition, this.position);
    }

    /**
     * Replaces one of the component's properties.
     * @throws If the component doesn't have that property
     */
    updateProperty(field: PropertyField, property: Property): void {
        if (!Object.hasOwn(this.properties, field)) throw new Error(`${this.type} does not have property ${field}`);
        this.properties[field] = property;
    }
}

/**
 * Creates `size` input nodes.
 * Node positions are placeholders until each gate lays out its own nodes.
 */
export function createInputNodes(size: number): Node[] {
    return Array.from({ length: size }, () => new Node({ x: 0, y: 0 }));
}