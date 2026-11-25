import type { DrawState } from "../Drawable";
import { isIdentity } from "../orientation";
import type { Point } from "../Point";
import { Property, Orientation, PropertyRecord, IOFormat, type PropertyField, type PropertyType, formatValue, maxSignalValue } from "../Property";
import { BoundingBox } from "../Selectable";
import { Component, ComponentType, Node } from "./Component";

const VALUE_BOX_HEIGHT = 2;
const MIN_VALUE_BOX_WIDTH = 2;
const VALUE_FONT_SIZE = 1.25;
const DIGIT_WIDTH = 0.6 * VALUE_FONT_SIZE;
const VALUE_PADDING = 0.5;
const HANDLE_LENGTH = 1;
/** How far the point of an Input's box sticks out of the side its handle comes out of, in cells. */
const ARROW_HEIGHT = 0.5;

const TEXT_TURN: Readonly<Record<Orientation, number>> = {
    [Orientation.east]: 0,
    [Orientation.west]: 0,
    [Orientation.south]: Math.PI / 2,
    [Orientation.north]: -Math.PI / 2,
};

export abstract class IO extends Component {

    constructor(position: Point, properties: PropertyRecord) {
        super(position, properties);
    }

    /**
     * Draws the component lines turned to face its orientation and the IO text
     * ignores direct mirroring to read left to right.
     */
    override draw(ctx: OffscreenCanvasRenderingContext2D, state: DrawState): void {
        const { transform } = this.oriented();
        if (isIdentity(transform)) {
            this.drawFacingEast(ctx, state);
        } else {
            ctx.save();
            ctx.transform(transform.a, transform.b, transform.c, transform.d, transform.e, transform.f);
            this.drawFacingEast(ctx, state);
            ctx.restore();
        }
        this.drawText?.(ctx);
    }

    protected drawText?(ctx: OffscreenCanvasRenderingContext2D): void;

    /** How far the component's text is turned, in radians clockwise: with it facing south or north, never mirrored. */
    protected get textTurn(): number {
        return TEXT_TURN[this.orientation] ?? 0;
    }

    protected writeText(ctx: OffscreenCanvasRenderingContext2D, text: string, eastPoint: Point, fontSize: number): void {
        const at = this.toDiagram(eastPoint);
        ctx.save();
        ctx.fillStyle = ctx.strokeStyle;
        ctx.font = `${fontSize}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.translate(at.x, at.y);
        ctx.rotate(this.textTurn);
        ctx.fillText(text, 0, 0);
        ctx.restore();
    }
}

/**
 * Sets the value of an input in the diagram. It is a box with its value written in it, and one output handle out of
 * the middle of the side its orientation names, with the output node at the handle's end. The box and its value stay
 * as they are whichever way the Input faces: only the handle moves. The box is 2 x 2 cells for one digit and grows to
 * the right, two cells at a time, to hold a value with more digits, so the middle of its top and bottom, where a handle
 * comes out facing north or south, stays on a grid point.
 *
 * Its value is the Output Value property, written in the Output Format, binary by default. It holds only what its Bus
 * Width has room for: 0 or 1 for the default single bit.
 */
export class Input extends IO {
    readonly type: ComponentType = ComponentType.Input;

    constructor(position: Point) {
        super(position, new PropertyRecord({
            'Orientation': new Property(Orientation.east),
            'Bus Width': new Property(1),
            'Label': new Property(''),
            'Output Value': new Property(0n),
            'Output Format': new Property(IOFormat.binary)
        }));
        this.onodes = this.createOutputNodes();
    }

    private get format(): IOFormat {
        return this.properties.get('Output Format')!.value as IOFormat;
    }

    /**
     * How many digits the largest value the Bus Width has room for takes in the format: 4 for 4 bits in binary, 2 for
     * 8 bits in hex.
     */
    private get digitCount(): number {
        const busWidth = this.properties.get('Bus Width')!.value as number;
        return formatValue(maxSignalValue(busWidth), this.format).length;
    }

    /**
     * The value, as it is written in the box. In binary, octal and hex it is padded with zeros to as many digits as the
     * Bus Width has room for, so it shows every bit: 0 with a Bus Width of 4 is 0000 in binary. Decimal digits don't
     * line up with bits, so a decimal value isn't padded, but its box is still as wide as the largest value needs.
     */
    get displayedValue(): string {
        const value = this.properties.get('Output Value')!.value as bigint;
        const text = formatValue(value, this.format);
        return this.format === IOFormat.decimal ? text : text.padStart(this.digitCount, '0');
    }

    /**
     * How wide the box is: room for as many digits as the largest value the Bus Width has room for takes, or for the
     * value if it is longer, so the box stays the same width as the value changes.
     */
    private get valueBoxWidth(): number {
        const digits = Math.max(this.digitCount, this.displayedValue.length);
        const width = digits * DIGIT_WIDTH + 2 * VALUE_PADDING;
        return Math.max(MIN_VALUE_BOX_WIDTH, 2 * Math.ceil(width / 2));
    }

    /**
     * Where the output handle starts, at the point of the box, and ends, a whole cell out from the side of the box, so the
     * node is on a grid point.
     */
    private outputHandle(): { start: Point, end: Point } {
        const width = this.valueBoxWidth;
        const middle = { x: width / 2, y: VALUE_BOX_HEIGHT / 2 };
        switch (this.orientation) {
            case Orientation.north:
                return { start: { x: middle.x, y: -ARROW_HEIGHT }, end: { x: middle.x, y: -HANDLE_LENGTH } };
            case Orientation.south:
                return {
                    start: { x: middle.x, y: VALUE_BOX_HEIGHT + ARROW_HEIGHT },
                    end: { x: middle.x, y: VALUE_BOX_HEIGHT + HANDLE_LENGTH },
                };
            case Orientation.west:
                return { start: { x: -ARROW_HEIGHT, y: middle.y }, end: { x: -HANDLE_LENGTH, y: middle.y } };
            default:
                return { start: { x: width + ARROW_HEIGHT, y: middle.y }, end: { x: width + HANDLE_LENGTH, y: middle.y } };
        }
    }

    /**
     * The corners of the box, clockwise from its top-left, with the point of the arrow in the middle of the side the
     * handle comes out of, like the Input's icon in the palette. The handle starts at the point.
     */
    private outline(): Point[] {
        const width = this.valueBoxWidth;
        const corners: Point[] = [{ x: 0, y: 0 }, { x: width, y: 0 }, { x: width, y: VALUE_BOX_HEIGHT }, { x: 0, y: VALUE_BOX_HEIGHT }];
        // the side the point is on comes after this corner
        const side = { [Orientation.north]: 0, [Orientation.east]: 1, [Orientation.south]: 2, [Orientation.west]: 3 }[this.orientation] ?? 1;
        corners.splice(side + 1, 0, this.outputHandle().start);
        return corners;
    }

    /** Draws the box, its handle on the side the Input faces, and its value, none of them turned. */
    override draw(ctx: OffscreenCanvasRenderingContext2D): void {
        this.drawFacingEast(ctx);
        this.drawText(ctx);
    }

    /**
     * Sets a property. A value or format with a different number of digits changes the width of the box, so the output
     * node moves to the end of the handle again.
     */
    override updateProperty(field: PropertyField, value: PropertyType): void {
        super.updateProperty(field, value);
        if (field === 'Output Value' || field === 'Output Format' || field === 'Bus Width') this.placeNodes();
    }

    /** The value always reads left to right. */
    protected override get textTurn(): number {
        return 0;
    }

    /** The Input isn't turned to face its orientation, so a point of its drawing is where it is drawn. */
    override toDiagram(eastPoint: Point): Point {
        return { x: eastPoint.x, y: eastPoint.y };
    }

    /** The box, and the handle on whichever side it comes out of. */
    override getBoundingBox(): BoundingBox {
        const { end } = this.outputHandle();
        const left = Math.min(0, end.x);
        const top = Math.min(0, end.y);
        const right = Math.max(this.valueBoxWidth, end.x);
        const bottom = Math.max(VALUE_BOX_HEIGHT, end.y);
        return new BoundingBox(right - left, bottom - top, top, left);
    }

    protected override drawText(ctx: OffscreenCanvasRenderingContext2D): void {
        const { x, y } = this.position;
        this.writeText(ctx, this.displayedValue, { x: x + this.valueBoxWidth / 2, y: y + VALUE_BOX_HEIGHT / 2 }, VALUE_FONT_SIZE);
    }

    protected drawFacingEast(ctx: OffscreenCanvasRenderingContext2D) {
        const { x, y } = this.position;

        const [first, ...rest] = this.outline();
        ctx.moveTo(x + first.x, y + first.y);
        for (const corner of rest) ctx.lineTo(x + corner.x, y + corner.y);
        ctx.closePath();

        const { start, end } = this.outputHandle();
        ctx.moveTo(x + start.x, y + start.y);
        ctx.lineTo(x + end.x, y + end.y);
    }

    /** The box and the handle facing east. getBoundingBox is the footprint for the side the handle is on. */
    protected eastBoundingBox(): BoundingBox {
        return new BoundingBox(this.valueBoxWidth + HANDLE_LENGTH, VALUE_BOX_HEIGHT);
    }

    override createInputNodes(): Node[] {
        return [];
    }

    override createOutputNodes(): Node[] {
        return this.outputNodePositions().map(position => new Node(position));
    }

    override inputNodePositions(): Point[] {
        return [];
    }

    override outputNodePositions(): Point[] {
        const { x, y } = this.position;
        return this.getOutputHandlePositions().map(handle => this.toDiagram({ x: x + handle.x, y: y + handle.y }));
    }

    override getInputHandlePositions(): number[] {
        return [];
    }
    /** The end of the one output handle, from the Input's position, on whichever side it comes out of. */
    override getOutputHandlePositions(): Point[] {
        return [this.outputHandle().end];
    }
}

export class Output extends IO {
    readonly type: ComponentType = ComponentType.Output;

    constructor(position: Point) {
        super(position, new PropertyRecord({
            'Orientation': new Property(Orientation.east),
            'Bus Width': new Property(1, true),
            'Label': new Property(''),
            'Input Value': new Property(0n, true),
            'Input Format': new Property('Binary')
        }));
        // TODO inodes: 1 inode;
    }

    protected drawFacingEast(ctx: OffscreenCanvasRenderingContext2D) {
        const { x, y } = this.position;

        ctx.moveTo(x + 1, y);
        ctx.lineTo(x + 3, y);
        ctx.arc(x + 3, y + 2, 2, 1.5 * Math.PI, 0.5 * Math.PI);
        ctx.lineTo(x + 1, y + 4);
    }

    protected eastBoundingBox(): BoundingBox {
        return new BoundingBox(3, 2);
    }

    override createInputNodes(): Node[] {
        throw new Error("Method not implemented.");
    }
    override createOutputNodes(): Node[] {
        throw new Error("Method not implemented.");
    }
    override inputNodePositions(): Point[] {
        throw new Error("Method not implemented.");
    }
    override outputNodePositions(): Point[] {
        throw new Error("Method not implemented.");
    }
    override getInputHandlePositions(): number[] {
        throw new Error("Method not implemented.");
    }
    override getOutputHandlePositions(): Point[] {
        throw new Error("Method not implemented.");
    }
}

export class SevenSegmentDisplay extends IO {
    readonly type: ComponentType = ComponentType.SevenSeg;

    constructor(position: Point) {
        super(position, new PropertyRecord({
            'Orientation': new Property(Orientation.east),
            'Bus Width': new Property(1, true),
            'Label': new Property(''),
            'Input Value': new Property(0n, true),
            'Input Format': new Property('Binary')
        }));
        // TODO onodes: 1 onode
    }

    protected drawFacingEast(ctx: OffscreenCanvasRenderingContext2D) {
    }

    protected eastBoundingBox(): BoundingBox {
        return new BoundingBox(4, 6);
    }

    override createInputNodes(): Node[] {
        throw new Error("Method not implemented.");
    }
    override createOutputNodes(): Node[] {
        throw new Error("Method not implemented.");
    }
    override inputNodePositions(): Point[] {
        throw new Error("Method not implemented.");
    }
    override outputNodePositions(): Point[] {
        throw new Error("Method not implemented.");
    }
    override getInputHandlePositions(): number[] {
        throw new Error("Method not implemented.");
    }
    override getOutputHandlePositions(): Point[] {
        throw new Error("Method not implemented.");
    }
}
