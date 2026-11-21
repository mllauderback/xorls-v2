import type { Drawable, DrawState } from "../Drawable";
import type { Ghostable } from "../Ghostable";
import type { Point } from "../Point";
import { Property, PropertyRecord, type PropertyField, type PropertyType } from "../Property";
import { AbstractSelectable, BoundingBox } from "../Selectable";

export class Node extends AbstractSelectable {
    public position: Point;
    public state: bigint;
    properties: PropertyRecord;

    constructor(position: Point) {
        super();
        this.position = { x: position.x, y: position.y };
        this.state = 0n;
        // this.properties = {
        //     'Bus Width': new Property(1, true),
        // };
        this.properties = new PropertyRecord({
            'Bus Width': new Property(1, true)
        });
    }

    isSelected(): boolean {
        return false;
    }

    getBoundingBox(): BoundingBox {
        // this will change
        return new BoundingBox(0, 0);
    }

    protected readonly displayName = 'Node';
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
export abstract class Component extends AbstractSelectable implements Drawable, Ghostable {
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
    abstract override properties: PropertyRecord;

    /**
     * @param position The position of the component's top-left corner, in diagram coordinates
     */
    constructor(position: Point) {
        super();
        this.position = position;
    }

    protected get displayName(): string {
        return this.type;
    }

    abstract draw(ctx: OffscreenCanvasRenderingContext2D, state: DrawState): void;

    abstract override getBoundingBox(): BoundingBox;

    /** True when the point is inside the component's bounding box, edges included. */
    override isSelected(mousePosition: Point): boolean {
        return this.getBoundingBox().containsPoint(mousePosition, this.position);
    }

    /**
     * Sets the value of one of the component's properties. Changing the number of inputs makes that many input nodes.
     * A subclass that has more to update calls this first.
     *
     * @throws If the component doesn't have the property, it is readonly, or the field doesn't accept the value.
     * Nothing changes then.
     */
    override updateProperty(field: PropertyField, value: PropertyType): void {
        super.updateProperty(field, value);
        if (field === 'Number of Inputs') this.inodes = createInputNodes(value as number);
    }
}

/**
 * Creates `size` input nodes.
 * Node positions are placeholders until each gate lays out its own nodes.
 */
export function createInputNodes(size: number): Node[] {
    return Array.from({ length: size }, () => new Node({ x: 0, y: 0 }));
}