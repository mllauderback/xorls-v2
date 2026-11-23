import type { Drawable, DrawState } from "../Drawable";
import type { Ghostable } from "../Ghostable";
import type { Point } from "../Point";
import { Orientation, Property, PropertyRecord, type PropertyField, type PropertyType } from "../Property";
import { applyTransform, isIdentity, orient } from "../orientation";
import { Selectable, BoundingBox } from "../Selectable";

export class Node extends Selectable {
    public position: Point;
    public state: bigint;

    constructor(position: Point) {
        super(new PropertyRecord({
            'Bus Width': new Property(1, true)
        }));
        this.position = { x: position.x, y: position.y };
        this.state = 0n;
    }

    getBoundingBox(): BoundingBox {
        const NODE_SIZE = 0.5;
        return new BoundingBox(NODE_SIZE, NODE_SIZE, -NODE_SIZE / 2, -NODE_SIZE / 2);
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
export abstract class Component extends Selectable implements Drawable, Ghostable {
    /**
     * Identifies this component for as long as it exists, including while it is still a ghost. The store refers to
     * a selected component by this id instead of holding the instance, so that its state is plain data.
     */
    readonly id: string = crypto.randomUUID();
    abstract readonly type: ComponentType;
    private _position!: Point;
    inodes: Node[] = [];
    onodes: Node[] = [];
    isGhost = false;
    /**
     * @param position The position of the component's top-left corner when it faces east, in diagram coordinates. The
     * component turns around the middle of its box, so the position stays the same whichever way it faces.
     * @param properties The component's properties: only the fields it has
     */
    constructor(position: Point, properties: PropertyRecord) {
        super(properties);
        this.position = position;
    }

    /**
     * The component's top-left corner when it faces east, in diagram coordinates. Moving the component moves its input
     * nodes with it.
     */
    get position(): Point {
        return this._position;
    }

    set position(position: Point) {
        this._position = position;
        this.placeNodes();
    }

    protected get displayName(): string {
        return this.type;
    }

    /**
     * Creates the component's input nodes, one for each of its inputs, each at the end of its handle for the way the
     * component faces. Set the Number of Inputs property first: the handles are laid out for it.
     */
    abstract createInputNodes(): Node[];

    /**
     * Creates the component's output nodes, one for each of its output handles, each at the end of its handle for the way
     * the component faces.
     */
    abstract createOutputNodes(): Node[];

    /**
     * Where each input node goes: the end of its handle, on the component's back, turned to face the component's
     * orientation. In the same order as getNodeHandlePositions.
     */
    abstract inputNodePositions(): Point[];

    /**
     * Where each output node goes: the end of its handle, turned to face the component's orientation. In the same
     * order as getOutputHandlePositions.
     */
    abstract outputNodePositions(): Point[];

    /**
     * Returns a list of Y coordinates for an East orientation
     * for component node handles based on the instance's number of inputs.
     */
    abstract getInputHandlePositions(): number[];

    /**
     * How many inputs the component has: its Number of Inputs property, or as many input nodes as it has if it has no
     * such property. The property changes before the nodes are made, so the handles are laid out for the new number.
     */
    protected get inputCount(): number {
        return (this.properties.get('Number of Inputs')?.value as number | undefined) ?? this.inodes.length;
    }

    /**
     * The ends of the component's output handles when it faces east, from its position. A component with no outputs
     * has none, which is the default.
     */
    abstract getOutputHandlePositions(): Point[];

    /**
     * Moves the input and output nodes to the ends of their handles, after the component moves, turns, or its box
     * changes size.
     */
    private placeNodes(): void {
        this.inputNodePositions().forEach((position, i) => {
            if (this.inodes[i]) this.inodes[i].position = position;
        });
        this.outputNodePositions().forEach((position, i) => {
            if (this.onodes[i]) this.onodes[i].position = position;
        });
    }

    /** Which way the component faces: the Orientation property, or east if it has none. */
    get orientation(): Orientation {
        return (this.properties.get('Orientation')?.value as Orientation | undefined) ?? Orientation.east;
    }

    /**
     * Draws the component facing its orientation. Every component draws itself facing east, and this turns that
     * drawing around the middle of its box. It only changes the context's transform while the component adds to the
     * path, so the layer's stroke and line width are as they were.
     */
    draw(ctx: OffscreenCanvasRenderingContext2D, state: DrawState): void {
        const { transform } = this.oriented();
        if (isIdentity(transform)) {
            this.drawFacingEast(ctx, state);
            return;
        }
        ctx.save();
        ctx.transform(transform.a, transform.b, transform.c, transform.d, transform.e, transform.f);
        this.drawFacingEast(ctx, state);
        ctx.restore();
    }

    /** Draws the component facing east, in diagram coordinates. draw turns it to face its orientation. */
    protected abstract drawFacingEast(ctx: OffscreenCanvasRenderingContext2D, state: DrawState): void;

    /** The component's footprint facing its orientation. */
    override getBoundingBox(): BoundingBox {
        const { box } = this.oriented();
        return new BoundingBox(box.width, box.height, box.top - this.position.y, box.left - this.position.x);
    }

    /** The component's footprint when it faces east. getBoundingBox turns it to face its orientation. */
    protected abstract eastBoundingBox(): BoundingBox;

    /**
     * Where a point of the component, as it is drawn facing east, is in the diagram once the component faces its
     * orientation. A pin's position comes from here, so it is wherever the drawing puts it.
     */
    toDiagram(eastPoint: Point): Point {
        return applyTransform(this.oriented().transform, eastPoint);
    }

    /** The transform from facing east to facing the component's orientation, and the box the component then covers. */
    private oriented() {
        const box = this.eastBoundingBox();
        return orient(this.orientation, {
            left: this.position.x + box.left,
            top: this.position.y + box.top,
            width: box.width,
            height: box.height,
        });
    }

    /**
     * Sets the value of one of the component's properties. Changing the number of inputs makes that many input nodes,
     * and turning the component moves its nodes to the ends of their turned handles. A subclass that has more to
     * update calls this first.
     *
     * @throws If the component doesn't have the property, it is readonly, or the field doesn't accept the value.
     * Nothing changes then.
     */
    override updateProperty(field: PropertyField, value: PropertyType): void {
        super.updateProperty(field, value);
        if (field === 'Number of Inputs') {
            this.inodes = this.createInputNodes();
            // the box, and the middle it turns around, can change with the number of inputs
            this.placeNodes();
        }
        if (field === 'Orientation') this.placeNodes();
    }
}

export abstract class Gate extends Component {

    constructor(position: Point, properties: PropertyRecord) {
        super(position, properties);
    }

    override createInputNodes(): Node[] {
        return this.inputNodePositions().map(position => new Node(position));
    }

    override createOutputNodes(): Node[] {
        return this.outputNodePositions().map(position => new Node(position));
    }

    override inputNodePositions(): Point[] {
        const { x, y } = this.position;
        return this.getInputHandlePositions().map(handleY => this.toDiagram({ x, y: y + handleY }));
    }

    override outputNodePositions(): Point[] {
        const { x, y } = this.position;
        return this.getOutputHandlePositions().map(handle => this.toDiagram({ x: x + handle.x, y: y + handle.y }));
    }

    override getOutputHandlePositions(): Point[] {
        return [];
    }

    override getInputHandlePositions(): number[] {

        const inputCount = this.inputCount;
        const handleYs: number[] = [];
        const center = 2;

        const half = Math.floor(inputCount / 2);

        for (let i = 0; i < half; i++) {
            handleYs.push(center - half + i);
        }
        if (inputCount % 2 === 1) handleYs.push(center);
        for (let i = 0; i < half; i++) {
            handleYs.push(center + 1 + i);
        }

        return handleYs;
    }
}

export abstract class IO extends Component {

    constructor(position: Point, properties: PropertyRecord) {
        super(position, properties);
    }
}
