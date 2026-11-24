import type { DrawState } from "../Drawable";
import { arcFromEndPoints } from "../drawing-helpers";
import { isIdentity } from "../orientation";
import type { Point } from "../Point";
import { Property, Orientation, PropertyRecord } from "../Property";
import { BoundingBox } from "../Selectable";
import { Component, ComponentType, Node } from "./Component";

/*
 * Gates are drawn in diagram units, which are grid cells (see GRID_SPACING): a two-input gate is 6 x 4 cells and a
 * one-input gate 4 x 2. Their pins (the ends of the input and output stubs) are whole cells from their position, so
 * they land on grid points.
 */

/** The radius of the inverting bubble on NOT, NAND, NOR and XNOR gates, in cells. */
const BUBBLE_RADIUS = 0.3;
/** The width of a gate with two or more inputs, in cells: input stubs, body and output stub. */
const BODY_WIDTH = 6;
/** The width of a NOT gate or a buffer, in cells: input stub, triangle and output stub. */
const SINGLE_INPUT_BODY_WIDTH = 4;
/** The height of the triangle of a NOT gate or a buffer, in cells. */
const SINGLE_INPUT_BODY_HEIGHT = 2;
/** The radius of the curved back of OR, NOR, XOR and XNOR gates, in cells. */
const BACK_RADIUS = 4;
/** How many inputs the body of an OR, NOR, XOR or XNOR gate holds, and a full extension of its back. */
const INPUTS_PER_BACK = 5;
/** The height of a gate's body, and of a full curve of a curved back, in cells: an input fits on each whole cell, both ends included. */
const BACK_CURVE_HEIGHT = INPUTS_PER_BACK - 1;

/** A stretch of a gate's back that inputs sit on: its ends, in cells down from the gate's position. */
interface BackSegment {
    top: number;
    bottom: number;
}

/**
 * A logic gate: a body with a back that its input stubs end on, and an output stub on the right. The inputs are
 * centered on the body, with the middle cell left empty for an even number, and once they don't fit on the body the
 * back grows above and below it to hold them. Each kind of back decides how it is drawn: see StraightBackGate and
 * CurvedBackGate.
 */
export abstract class Gate extends Component {

    constructor(position: Point, properties: PropertyRecord) {
        super(position, properties);
    }

    /** A gate's whole drawing turns to face its orientation, and is mirrored facing west. */
    override draw(ctx: OffscreenCanvasRenderingContext2D, state: DrawState): void {
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

    /**
     * The width of the gate, in cells, from the left end of its input stubs to the right end of its output stub. A
     * getter, so the constructor can lay out the nodes before a subclass's fields are set.
     */
    protected get bodyWidth(): number {
        return BODY_WIDTH;
    }

    /** The height of the gate's body, in cells: the inputs are centered on it, and its back covers it. */
    protected get bodyHeight(): number {
        return BACK_CURVE_HEIGHT;
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

    override getInputHandlePositions(): number[] {

        const inputCount = this.inputCount;
        const handleYs: number[] = [];
        const center = this.bodyHeight / 2;

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

    /** The output stub ends at the right of the body, level with its middle. */
    override getOutputHandlePositions(): Point[] {
        return [{ x: this.bodyWidth, y: this.bodyHeight / 2 }];
    }

    /**
     * The footprint covers the body and the whole back: it reaches a whole cell past the outer-most inputs, so a gate
     * placed on a grid point still has its inputs on grid points, and gates stacked edge to edge keep their inputs two
     * cells apart. It is 6 x 4 cells while every input fits on the body without reaching its top or bottom. The gate's
     * position is always the body's top-left corner, so the body stays put as inputs are added, and the footprint
     * starts above it when the back reaches above the body.
     */
    protected eastBoundingBox(): BoundingBox {
        const { top, bottom } = this.footprintRows();
        return new BoundingBox(this.bodyWidth, bottom - top, top);
    }

    /** The top and bottom of the footprint, in cells down from the body's top. */
    private footprintRows(): { top: number, bottom: number } {
        const handles = this.getInputHandlePositions();
        return {
            top: Math.min(0, Math.min(...handles) - 1),
            bottom: Math.max(this.bodyHeight, Math.max(...handles) + 1),
        };
    }

    /** The segments of the back, the body's first. */
    protected abstract backSegments(): BackSegment[];

    /** Draws one segment of the back, from (x, top) down to (x, bottom), in diagram coordinates. */
    protected abstract drawBackSegment(ctx: OffscreenCanvasRenderingContext2D, x: number, top: number, bottom: number): void;

    /** How far right of the segment's ends the back is at a height, so an input stub there ends on the back. */
    protected abstract backDepth(segment: BackSegment, handleY: number): number;

    /** Draws the back, running through backX in cells from the gate's position. */
    protected drawBack(ctx: OffscreenCanvasRenderingContext2D, backX: number) {
        const { x, y } = this.position;
        const segments = [...this.backSegments()].sort((a, b) => a.top - b.top);
        segments.forEach((segment, i) => {
            this.drawBackSegment(ctx, x + backX, y + segment.top, y + segment.bottom);
            const next = segments[i + 1];
            if (next && next.top > segment.bottom) {
                ctx.moveTo(x + backX, y + segment.bottom);
                ctx.lineTo(x + backX, y + next.top);
            }
        });

        const handles = this.getInputHandlePositions();
        const top = segments[0].top;
        const bottom = segments[segments.length - 1].bottom;
        if (Math.min(...handles) === top) {
            ctx.moveTo(x + backX, y + top);
            ctx.lineTo(x + backX, y + top - 0.5);
        }
        if (Math.max(...handles) === bottom) {
            ctx.moveTo(x + backX, y + bottom);
            ctx.lineTo(x + backX, y + bottom + 0.5);
        }
    }

    /** Draws the input stubs, from the left edge to a back that runs through backX. */
    protected drawInputs(ctx: OffscreenCanvasRenderingContext2D, backX: number) {
        const { x, y } = this.position;
        const segments = this.backSegments();
        for (const handleY of this.getInputHandlePositions()) {
            const segment = segments.find(s => handleY >= s.top && handleY <= s.bottom);
            const depth = segment ? this.backDepth(segment, handleY) : 0;
            ctx.moveTo(x + backX + depth, y + handleY);
            ctx.lineTo(x, y + handleY);
        }
    }
}

/**
 * An AND or NAND gate, whose back is a straight line. It covers the body, and reaches further to cover any inputs
 * above or below it.
 */
export abstract class StraightBackGate extends Gate {

    protected backSegments(): BackSegment[] {
        const handles = this.getInputHandlePositions();
        return [{ top: Math.min(0, ...handles), bottom: Math.max(this.bodyHeight, ...handles) }];
    }

    protected drawBackSegment(ctx: OffscreenCanvasRenderingContext2D, x: number, top: number, bottom: number) {
        ctx.moveTo(x, top);
        ctx.lineTo(x, bottom);
    }

    protected backDepth(): number {
        return 0;
    }
}

/**
 * An OR, NOR, XOR or XNOR gate, whose back is a curve. The body's curve covers 5 inputs. Past that, the back grows
 * extensions above and below the body, as many inputs on each side: curves of the same radius, each holding up to 5
 * more inputs and joined to the next by a straight cell. 15 inputs is a full body with a full extension on each side.
 * Once an extension is full, the next inputs start a new one beyond it. An extension that isn't full yet ends half a
 * cell past its outer-most input, so it is only as big as it needs to be.
 */
export abstract class CurvedBackGate extends Gate {

    /** The curves of the back, the body's first, then the extensions. */
    protected backSegments(): BackSegment[] {
        const curves: BackSegment[] = [{ top: 0, bottom: BACK_CURVE_HEIGHT }];
        // the inputs that don't fit on the body: Gate places as many above it as below
        const handles = this.getInputHandlePositions();
        const above = handles.filter(handleY => handleY < 0).length;
        const below = handles.filter(handleY => handleY > BACK_CURVE_HEIGHT).length;
        for (let filled = 0; filled < above; filled += INPUTS_PER_BACK) {
            // starts a cell above the curve below it, and reaches up to its outer-most input
            const inner = -filled - 1;
            curves.push({ top: inner - extensionHeight(above - filled), bottom: inner });
        }
        for (let filled = 0; filled < below; filled += INPUTS_PER_BACK) {
            const inner = BACK_CURVE_HEIGHT + filled + 1;
            curves.push({ top: inner, bottom: inner + extensionHeight(below - filled) });
        }
        return curves;
    }

    /** Draws one curve of the back, bulging to the right. */
    protected drawBackSegment(ctx: OffscreenCanvasRenderingContext2D, x: number, top: number, bottom: number) {
        const args = arcFromEndPoints(x, top, x, bottom, BACK_RADIUS);
        if (!args) return;
        ctx.moveTo(x, top);
        ctx.arc(...args);
    }

    protected backDepth(curve: BackSegment, handleY: number): number {
        const halfHeight = (curve.bottom - curve.top) / 2;
        const fromMiddle = handleY - curve.top - halfHeight;
        return Math.sqrt(BACK_RADIUS ** 2 - fromMiddle ** 2) - Math.sqrt(BACK_RADIUS ** 2 - halfHeight ** 2);
    }
}

/**
 * How tall an extension with this many inputs left to hold is: a full curve once it has 5, otherwise from its inner-most
 * input to half a cell past its outer-most one.
 */
function extensionHeight(inputs: number): number {
    return inputs >= INPUTS_PER_BACK ? BACK_CURVE_HEIGHT : inputs - 0.5;
}

export class AndGate extends StraightBackGate {
    readonly type: ComponentType = ComponentType.AndGate;

    constructor(position: Point, iNodeSize: number) {
        super(position, new PropertyRecord({
            'Orientation': new Property(Orientation.east),
            'Number of Inputs': new Property(iNodeSize),
            'Bus Width': new Property(1),
            // for now, output value is 0.  Eventually, the simulation state will update this property
            'Output Value': new Property(0n, true),
        }));
        this.inodes = this.createInputNodes();
        this.onodes = this.createOutputNodes();
    }


    /** Draws in diagram coordinates: the layer's context transform puts it in the right place on the canvas. */
    protected drawFacingEast(ctx: OffscreenCanvasRenderingContext2D) {
        // body
        const { x, y } = this.position;

        ctx.moveTo(x + 1, y);
        ctx.lineTo(x + 3, y);
        ctx.arc(x + 3, y + 2, 2, 1.5 * Math.PI, 0.5 * Math.PI);
        ctx.lineTo(x + 1, y + 4);

        // gate back
        this.drawBack(ctx, 1);

        // output node
        ctx.moveTo(x + 5, y + 2);
        ctx.lineTo(x + 6, y + 2);

        // input nodes (the left-most drawn pixels, at x = 0)
        this.drawInputs(ctx, 1);
    }
}

export class OrGate extends CurvedBackGate {
    readonly type: ComponentType = ComponentType.OrGate;

    constructor(position: Point, iNodeSize: number) {
        super(position, new PropertyRecord({
            'Orientation': new Property(Orientation.east),
            'Number of Inputs': new Property(iNodeSize),
            'Bus Width': new Property(1),
            'Output Value': new Property(0n, true),
        }));
        this.inodes = this.createInputNodes();
        this.onodes = this.createOutputNodes();
    }

    protected drawFacingEast(ctx: OffscreenCanvasRenderingContext2D) {
        const { x, y } = this.position;

        // body
        ctx.moveTo(x + 1, y);
        ctx.lineTo(x + 2.5, y);
        ctx.bezierCurveTo(x + 2.5, y, x + 4.5, y, x + 5, y + 2);
        ctx.moveTo(x + 1, y + 4);
        ctx.lineTo(x + 2.5, y + 4);
        ctx.bezierCurveTo(x + 2.5, y + 4, x + 4.5, y + 4, x + 5, y + 2);

        // gate back
        this.drawBack(ctx, 1);

        // output node
        ctx.moveTo(x + 5, y + 2);
        ctx.lineTo(x + 6, y + 2);

        // input nodes (the left-most drawn pixels, at x = 0)
        this.drawInputs(ctx, 1);
    }
}

export class XorGate extends CurvedBackGate {
    readonly type: ComponentType = ComponentType.XorGate;

    constructor(position: Point, iNodeSize: number) {
        super(position, new PropertyRecord({
            'Orientation': new Property(Orientation.east),
            'Number of Inputs': new Property(iNodeSize),
            'Bus Width': new Property(1),
            'Output Value': new Property(0n, true),
        }));
        this.inodes = this.createInputNodes();
        this.onodes = this.createOutputNodes();
    }

    protected drawFacingEast(ctx: OffscreenCanvasRenderingContext2D) {
        const { x, y } = this.position;

        // body
        ctx.moveTo(x + 1, y);
        ctx.lineTo(x + 2.5, y);
        ctx.bezierCurveTo(x + 2.5, y, x + 4.5, y, x + 5, y + 2);
        ctx.moveTo(x + 1, y + 4);
        ctx.lineTo(x + 2.5, y + 4);
        ctx.bezierCurveTo(x + 2.5, y + 4, x + 4.5, y + 4, x + 5, y + 2);

        // gate back
        this.drawBack(ctx, 1);

        // the second back, in front of the inputs
        this.drawBack(ctx, 0.5);

        // output node
        ctx.moveTo(x + 5, y + 2);
        ctx.lineTo(x + 6, y + 2);

        // input nodes (the left-most drawn pixels, at x = 0)
        this.drawInputs(ctx, 0.5);
    }
}

/**
 * A NOT gate: a gate with a straight back and a single input. Its body is a 4 x 2 cell triangle, so Gate puts the
 * input in the middle of its back, one cell down from its position, and the output at the tip, level with it.
 */
export class NotGate extends StraightBackGate {
    readonly type: ComponentType = ComponentType.NotGate;

    constructor(position: Point) {
        super(position, new PropertyRecord({
            'Orientation': new Property(Orientation.east),
            'Number of Inputs': new Property(1, true),
            'Bus Width': new Property(1),
            'Output Value': new Property(0n, true)
        }));
        this.inodes = this.createInputNodes();
        this.onodes = this.createOutputNodes();
    }

    protected override get bodyWidth(): number {
        return SINGLE_INPUT_BODY_WIDTH;
    }

    protected override get bodyHeight(): number {
        return SINGLE_INPUT_BODY_HEIGHT;
    }

    protected drawFacingEast(ctx: OffscreenCanvasRenderingContext2D) {
        const { x, y } = this.position;

        // body: the back, then the front of the triangle
        this.drawBack(ctx, 1);

        ctx.lineTo(x + 3, y + 1);
        ctx.lineTo(x + 1, y);

        ctx.moveTo(x + 3.6, y + 1);
        ctx.arc(x + 3.3, y + 1, BUBBLE_RADIUS, 0, 2 * Math.PI);

        // output node
        ctx.moveTo(x + 3.6, y + 1);
        ctx.lineTo(x + 4, y + 1);

        // input node
        this.drawInputs(ctx, 1);
    }
}

/** A buffer: a NOT gate without the inverting bubble. */
export class Buffer extends StraightBackGate {
    readonly type: ComponentType = ComponentType.Buffer;

    constructor(position: Point) {
        super(position, new PropertyRecord({
            'Orientation': new Property(Orientation.east),
            'Number of Inputs': new Property(1, true),
            'Bus Width': new Property(1),
            'Output Value': new Property(0n, true)
        }));
        this.inodes = this.createInputNodes();
        this.onodes = this.createOutputNodes();
    }

    protected override get bodyWidth(): number {
        return SINGLE_INPUT_BODY_WIDTH;
    }

    protected override get bodyHeight(): number {
        return SINGLE_INPUT_BODY_HEIGHT;
    }

    protected drawFacingEast(ctx: OffscreenCanvasRenderingContext2D) {
        const { x, y } = this.position;

        // body: the back, then the front of the triangle
        this.drawBack(ctx, 1);

        ctx.lineTo(x + 3, y + 1);
        ctx.lineTo(x + 1, y);

        // output node
        ctx.moveTo(x + 3, y + 1);
        ctx.lineTo(x + 4, y + 1);

        // input node
        this.drawInputs(ctx, 1);
    }
}

export class NandGate extends StraightBackGate {
    readonly type: ComponentType = ComponentType.NandGate;

    constructor(position: Point, iNodeSize: number) {
        super(position, new PropertyRecord({
            'Orientation': new Property(Orientation.east),
            'Number of Inputs': new Property(iNodeSize),
            'Bus Width': new Property(1),
            'Output Value': new Property(0n, true),
        }));
        this.inodes = this.createInputNodes();
        this.onodes = this.createOutputNodes();
    }

    protected drawFacingEast(ctx: OffscreenCanvasRenderingContext2D) {
        // body
        const { x, y } = this.position;

        ctx.moveTo(x + 1, y);
        ctx.lineTo(x + 3, y);
        ctx.arc(x + 3, y + 2, 2, 1.5 * Math.PI, 0.5 * Math.PI);
        ctx.lineTo(x + 1, y + 4);

        // gate back
        this.drawBack(ctx, 1);

        // negate circle
        ctx.moveTo(x + 5.55, y + 2);
        ctx.arc(x + 5.3, y + 2, BUBBLE_RADIUS, 0, 2 * Math.PI);

        // output node
        ctx.moveTo(x + 5.55, y + 2);
        ctx.lineTo(x + 6, y + 2);

        // input nodes (the left-most drawn pixels, at x = 0)
        this.drawInputs(ctx, 1);
    }
}

export class NorGate extends CurvedBackGate {
    readonly type: ComponentType = ComponentType.NorGate;

    constructor(position: Point, iNodeSize: number) {
        super(position, new PropertyRecord({
            'Orientation': new Property(Orientation.east),
            'Number of Inputs': new Property(iNodeSize),
            'Bus Width': new Property(1),
            'Output Value': new Property(0n, true),
        }));
        this.inodes = this.createInputNodes();
        this.onodes = this.createOutputNodes();
    }

    protected drawFacingEast(ctx: OffscreenCanvasRenderingContext2D) {
        const { x, y } = this.position;

        // body
        ctx.moveTo(x + 1, y);
        ctx.lineTo(x + 2.5, y);
        ctx.bezierCurveTo(x + 2.5, y, x + 4.5, y, x + 5, y + 2);
        ctx.moveTo(x + 1, y + 4);
        ctx.lineTo(x + 2.5, y + 4);
        ctx.bezierCurveTo(x + 2.5, y + 4, x + 4.5, y + 4, x + 5, y + 2);

        // gate back
        this.drawBack(ctx, 1);

        ctx.moveTo(x + 5.55, y + 2);
        ctx.arc(x + 5.3, y + 2, BUBBLE_RADIUS, 0, 2 * Math.PI);

        // output node
        ctx.moveTo(x + 5.55, y + 2);
        ctx.lineTo(x + 6, y + 2);

        // input nodes (the left-most drawn pixels, at x = 0)
        this.drawInputs(ctx, 1);
    }
}

export class XnorGate extends CurvedBackGate {
    readonly type: ComponentType = ComponentType.XnorGate;

    constructor(position: Point, iNodeSize: number) {
        super(position, new PropertyRecord({
            'Orientation': new Property(Orientation.east),
            'Number of Inputs': new Property(iNodeSize),
            'Bus Width': new Property(1),
            'Output Value': new Property(0n, true),
        }));
        this.inodes = this.createInputNodes();
        this.onodes = this.createOutputNodes();
    }

    protected drawFacingEast(ctx: OffscreenCanvasRenderingContext2D) {
        const { x, y } = this.position;

        // body
        ctx.moveTo(x + 1, y);
        ctx.lineTo(x + 2.5, y);
        ctx.bezierCurveTo(x + 2.5, y, x + 4.5, y, x + 5, y + 2);
        ctx.moveTo(x + 1, y + 4);
        ctx.lineTo(x + 2.5, y + 4);
        ctx.bezierCurveTo(x + 2.5, y + 4, x + 4.5, y + 4, x + 5, y + 2);

        // gate back
        this.drawBack(ctx, 1);

        // the second back, in front of the inputs
        this.drawBack(ctx, 0.5);

        ctx.moveTo(x + 5.55, y + 2);
        ctx.arc(x + 5.3, y + 2, BUBBLE_RADIUS, 0, 2 * Math.PI);

        // output node
        ctx.moveTo(x + 5.55, y + 2);
        ctx.lineTo(x + 6, y + 2);

        // input nodes (the left-most drawn pixels, at x = 0)
        this.drawInputs(ctx, 0.5);
    }
}
