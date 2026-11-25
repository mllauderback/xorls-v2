import type { DrawState } from "../Drawable";
import { isIdentity } from "../orientation";
import type { Point } from "../Point";
import { Property, Orientation, PropertyRecord, IOFormat, Enable, type PropertyField, type PropertyType, formatValue, maxSignalValue } from "../Property";
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

/**
 * Shows the value on a wire in the diagram, drawn like an Input: a box with its value written in it, facing east
 * whichever way it faces. Its box points the way it faces, and its input handle comes out of the middle of the opposite
 * side, with the input node at the handle's end, like the Output's icon in the palette.
 *
 * Its value is the Input Value property, written in the Input Format, binary by default, and padded to its Bus Width
 * like an Input's. The value and the Bus Width are readonly: the simulation will set the value, and the wire connected
 * to the input node the Bus Width, which is 1 until then.
 */
export class Output extends IO {
    readonly type: ComponentType = ComponentType.Output;

    constructor(position: Point) {
        super(position, new PropertyRecord({
            'Orientation': new Property(Orientation.east),
            'Bus Width': new Property(1, true),
            'Label': new Property(''),
            'Input Value': new Property(0n, true),
            'Input Format': new Property(IOFormat.binary)
        }));
        this.inodes = this.createInputNodes();
    }

    private get format(): IOFormat {
        return this.properties.get('Input Format')!.value as IOFormat;
    }

    /** How many bits the value has. It is 1 until the wire connected to the input node sets it. */
    private get busWidth(): number {
        return this.properties.get('Bus Width')!.value as number;
    }

    /** How many digits the largest value the Bus Width has room for takes in the format. */
    private get digitCount(): number {
        return formatValue(maxSignalValue(this.busWidth), this.format).length;
    }

    /**
     * The value, as it is written in the box: padded with zeros to the Bus Width in binary, octal and hex, and not
     * padded in decimal, like an Input's.
     */
    get displayedValue(): string {
        const value = this.properties.get('Input Value')!.value as bigint;
        const text = formatValue(value, this.format);
        return this.format === IOFormat.decimal ? text : text.padStart(this.digitCount, '0');
    }

    /** How wide the box is: room for the largest value the Bus Width has room for, two cells at a time. */
    private get valueBoxWidth(): number {
        const digits = Math.max(this.digitCount, this.displayedValue.length);
        const width = digits * DIGIT_WIDTH + 2 * VALUE_PADDING;
        return Math.max(MIN_VALUE_BOX_WIDTH, 2 * Math.ceil(width / 2));
    }

    /** The point of the box, half a cell out from the middle of the side the Output faces. */
    private arrowPoint(): Point {
        const width = this.valueBoxWidth;
        const middle = { x: width / 2, y: VALUE_BOX_HEIGHT / 2 };
        switch (this.orientation) {
            case Orientation.north:
                return { x: middle.x, y: -ARROW_HEIGHT };
            case Orientation.south:
                return { x: middle.x, y: VALUE_BOX_HEIGHT + ARROW_HEIGHT };
            case Orientation.west:
                return { x: -ARROW_HEIGHT, y: middle.y };
            default:
                return { x: width + ARROW_HEIGHT, y: middle.y };
        }
    }

    /**
     * Where the input handle starts, on the middle of the side opposite the point, and ends, a whole cell out from it,
     * so the node is on a grid point.
     */
    private inputHandle(): { start: Point, end: Point } {
        const width = this.valueBoxWidth;
        const middle = { x: width / 2, y: VALUE_BOX_HEIGHT / 2 };
        switch (this.orientation) {
            case Orientation.north:
                return { start: { x: middle.x, y: VALUE_BOX_HEIGHT }, end: { x: middle.x, y: VALUE_BOX_HEIGHT + HANDLE_LENGTH } };
            case Orientation.south:
                return { start: { x: middle.x, y: 0 }, end: { x: middle.x, y: -HANDLE_LENGTH } };
            case Orientation.west:
                return { start: { x: width, y: middle.y }, end: { x: width + HANDLE_LENGTH, y: middle.y } };
            default:
                return { start: { x: 0, y: middle.y }, end: { x: -HANDLE_LENGTH, y: middle.y } };
        }
    }

    /** The corners of the box, clockwise from its top-left, with its point in the middle of the side it faces. */
    private outline(): Point[] {
        const width = this.valueBoxWidth;
        const corners: Point[] = [{ x: 0, y: 0 }, { x: width, y: 0 }, { x: width, y: VALUE_BOX_HEIGHT }, { x: 0, y: VALUE_BOX_HEIGHT }];
        // the side the point is on comes after this corner
        const side = { [Orientation.north]: 0, [Orientation.east]: 1, [Orientation.south]: 2, [Orientation.west]: 3 }[this.orientation] ?? 1;
        corners.splice(side + 1, 0, this.arrowPoint());
        return corners;
    }

    /** Draws the box, its point, its handle and its value, none of them turned. */
    override draw(ctx: OffscreenCanvasRenderingContext2D): void {
        this.drawFacingEast(ctx);
        this.drawText(ctx);
    }

    /** A format with a different number of digits changes the width of the box, so the node moves with it. */
    override updateProperty(field: PropertyField, value: PropertyType): void {
        super.updateProperty(field, value);
        if (field === 'Input Format') this.placeNodes();
    }

    /** The value always reads left to right. */
    protected override get textTurn(): number {
        return 0;
    }

    /** The Output isn't turned to face its orientation, so a point of its drawing is where it is drawn. */
    override toDiagram(eastPoint: Point): Point {
        return { x: eastPoint.x, y: eastPoint.y };
    }

    /** The box, its point and its handle, out to whole cells, since the point is half a cell out from the box. */
    override getBoundingBox(): BoundingBox {
        const points = [{ x: 0, y: 0 }, { x: this.valueBoxWidth, y: VALUE_BOX_HEIGHT }, this.arrowPoint(), this.inputHandle().end];
        const left = Math.floor(Math.min(...points.map(p => p.x)));
        const top = Math.floor(Math.min(...points.map(p => p.y)));
        const right = Math.ceil(Math.max(...points.map(p => p.x)));
        const bottom = Math.ceil(Math.max(...points.map(p => p.y)));
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

        const { start, end } = this.inputHandle();
        ctx.moveTo(x + start.x, y + start.y);
        ctx.lineTo(x + end.x, y + end.y);
    }

    /** The box, its point and its handle facing east. getBoundingBox is the footprint for the way it faces. */
    protected eastBoundingBox(): BoundingBox {
        return new BoundingBox(this.valueBoxWidth + 2 * HANDLE_LENGTH, VALUE_BOX_HEIGHT, 0, -HANDLE_LENGTH);
    }

    override createInputNodes(): Node[] {
        return this.inputNodePositions().map(position => new Node(position));
    }

    override createOutputNodes(): Node[] {
        return [];
    }

    override inputNodePositions(): Point[] {
        const { x, y } = this.position;
        const { end } = this.inputHandle();
        return [{ x: x + end.x, y: y + end.y }];
    }

    override outputNodePositions(): Point[] {
        return [];
    }

    /** The height of the end of the one input handle, from the Output's position. */
    override getInputHandlePositions(): number[] {
        return [this.inputHandle().end.y];
    }

    override getOutputHandlePositions(): Point[] {
        return [];
    }
}

/** How wide the body of a seven-segment display is for each digit, in cells. */
const DIGIT_BODY_WIDTH = 4;
/** How tall the body of a seven-segment display is, in cells. */
const DISPLAY_HEIGHT = 8;
/** How many bits each digit of a seven-segment display takes: one for each segment. */
const SEGMENT_COUNT = 7;
/** How thick a segment is, in cells. */
const SEGMENT_THICKNESS = 0.4;

/**
 * Where each segment of a digit is, as a rectangle in cells from the digit's top-left corner, in the order of its bits:
 * a (top), b (top right), c (bottom right), d (bottom), e (bottom left), f (top left) and g (middle), like the seven-segment
 * display's icon in the palette.
 */
const SEGMENTS: readonly { x: number, y: number, width: number, height: number }[] = (() => {
    const t = SEGMENT_THICKNESS;
    const left = 1, right = 3, top = 1, middle = 4, bottom = 7;
    const across = (y: number) => ({ x: left + t / 2, y: y - t / 2, width: right - left - t, height: t });
    const down = (x: number, from: number, to: number) => ({ x: x - t / 2, y: from + t / 2, width: t, height: to - from - t });
    return [
        across(top),
        down(right, top, middle),
        down(right, middle, bottom),
        across(bottom),
        down(left, middle, bottom),
        down(left, top, middle),
        across(middle),
    ];
})();

/**
 * Shows digits in the diagram, one seven-segment digit for each of its Digits, side by side in a body 4 cells wide for
 * each digit and 8 cells tall. Like an Output, the body faces east whichever way the display faces, and its input
 * handles come out of the side opposite the way it faces, one for each digit, with a 7 bit input node at each handle's
 * end. Facing east, they are on its left like the display's icon in the palette. They are laid out like a gate's
 * inputs: a cell apart and centered, with the middle cell left empty for an even number of digits.
 *
 * Its segments come from the Input Value: the rightmost digit takes its 7 lowest bits, and each digit takes the next 7
 * bits to the left. In each digit the lowest bit is segment a, up to segment g. The Enable property picks which level
 * turns a segment on: with Low, the default, a segment is on when its bit is 0, and with High, when it is 1. A segment
 * that is on is solid, and one that is off isn't drawn. The simulation will set the value: until then it is 0, so with
 * Low every segment is on.
 */
export class SevenSegmentDisplay extends IO {
    readonly type: ComponentType = ComponentType.SevenSeg;

    constructor(position: Point) {
        super(position, new PropertyRecord({
            'Orientation': new Property(Orientation.east),
            'Digits': new Property(1),
            'Enable': new Property(Enable.low),
            'Bus Width': new Property(SEGMENT_COUNT, true),
            'Label': new Property(''),
            'Input Value': new Property(0n, true),
            'Input Format': new Property(IOFormat.binary)
        }));
        this.inodes = this.createInputNodes();
    }

    private get digits(): number {
        return this.properties.get('Digits')!.value as number;
    }

    private get bodyWidth(): number {
        return this.digits * DIGIT_BODY_WIDTH;
    }

    /** The side of the body the handles come out of: the one opposite the way the display faces. */
    private get handleSide(): Orientation {
        switch (this.orientation) {
            case Orientation.north: return Orientation.south;
            case Orientation.south: return Orientation.north;
            case Orientation.west: return Orientation.east;
            default: return Orientation.west;
        }
    }

    /**
     * Where each digit's handle starts, on the body, and ends, a cell out from it, from the display's position. They are
     * laid out like a gate's inputs: a cell apart, centered on the side, with the middle cell left empty for an even
     * number of digits. The first digit's is at the top, or at the left on the top or bottom.
     */
    private inputHandles(): { start: Point, end: Point }[] {
        const side = this.handleSide;
        const along = side === Orientation.north || side === Orientation.south;
        const center = (along ? this.bodyWidth : DISPLAY_HEIGHT) / 2;
        const half = Math.floor(this.digits / 2);
        const offsets: number[] = [];
        for (let i = 0; i < half; i++) offsets.push(center - half + i);
        if (this.digits % 2 === 1) offsets.push(center);
        for (let i = 0; i < half; i++) offsets.push(center + 1 + i);

        const edge = { [Orientation.north]: 0, [Orientation.south]: DISPLAY_HEIGHT, [Orientation.west]: 0, [Orientation.east]: this.bodyWidth }[side];
        const out = side === Orientation.north || side === Orientation.west ? -HANDLE_LENGTH : HANDLE_LENGTH;
        return offsets.map(offset => along
            ? { start: { x: offset, y: edge }, end: { x: offset, y: edge + out } }
            : { start: { x: edge, y: offset }, end: { x: edge + out, y: offset } });
    }

    /** Which segments of a digit are on, from the Input Value: bit 0 for segment a up to bit 6 for segment g. */
    private segmentsOn(digit: number): boolean[] {
        const value = this.properties.get('Input Value')!.value as bigint;
        const onWhen = this.properties.get('Enable')!.value === Enable.high ? 1n : 0n;
        const fromRight = this.digits - 1 - digit;
        const bits = (value >> BigInt(fromRight * SEGMENT_COUNT)) & ((1n << BigInt(SEGMENT_COUNT)) - 1n);
        return SEGMENTS.map((_, segment) => ((bits >> BigInt(segment)) & 1n) === onWhen);
    }

    /** Draws the body, its handles and the segments that are on, none of them turned. */
    override draw(ctx: OffscreenCanvasRenderingContext2D): void {
        this.drawFacingEast(ctx);
        this.drawSegments(ctx);
    }

    /**
     * Fills the segments that are on, in the colour the layer strokes in, so a ghost's are grey like the rest of it.
     * Filling doesn't add to the path the layer strokes.
     */
    private drawSegments(ctx: OffscreenCanvasRenderingContext2D): void {
        const { x, y } = this.position;
        ctx.save();
        ctx.fillStyle = ctx.strokeStyle;
        for (let digit = 0; digit < this.digits; digit++) {
            const left = x + digit * DIGIT_BODY_WIDTH;
            this.segmentsOn(digit).forEach((on, segment) => {
                if (!on) return;
                const { x: sx, y: sy, width, height } = SEGMENTS[segment];
                ctx.fillRect(left + sx, y + sy, width, height);
            });
        }
        ctx.restore();
    }

    /** Changing the number of digits makes a handle and a node for each, and widens the body. */
    override updateProperty(field: PropertyField, value: PropertyType): void {
        super.updateProperty(field, value);
        if (field === 'Digits') {
            this.inodes = this.createInputNodes();
            this.placeNodes();
        }
    }

    /** The display isn't turned to face its orientation, so a point of its drawing is where it is drawn. */
    override toDiagram(eastPoint: Point): Point {
        return { x: eastPoint.x, y: eastPoint.y };
    }

    /** The body and its handles, on whichever side they come out of. */
    override getBoundingBox(): BoundingBox {
        const ends = this.inputHandles().map(handle => handle.end);
        const left = Math.min(0, ...ends.map(p => p.x));
        const top = Math.min(0, ...ends.map(p => p.y));
        const right = Math.max(this.bodyWidth, ...ends.map(p => p.x));
        const bottom = Math.max(DISPLAY_HEIGHT, ...ends.map(p => p.y));
        return new BoundingBox(right - left, bottom - top, top, left);
    }

    protected drawFacingEast(ctx: OffscreenCanvasRenderingContext2D) {
        const { x, y } = this.position;

        ctx.moveTo(x, y);
        ctx.lineTo(x + this.bodyWidth, y);
        ctx.lineTo(x + this.bodyWidth, y + DISPLAY_HEIGHT);
        ctx.lineTo(x, y + DISPLAY_HEIGHT);
        ctx.closePath();

        for (const { start, end } of this.inputHandles()) {
            ctx.moveTo(x + start.x, y + start.y);
            ctx.lineTo(x + end.x, y + end.y);
        }
    }

    /** The body and the handles facing east. getBoundingBox is the footprint for the way it faces. */
    protected eastBoundingBox(): BoundingBox {
        return new BoundingBox(this.bodyWidth + HANDLE_LENGTH, DISPLAY_HEIGHT, 0, -HANDLE_LENGTH);
    }

    /** A 7 bit node for each digit, one for each segment. */
    override createInputNodes(): Node[] {
        return this.inputNodePositions().map(position => new Node(position, SEGMENT_COUNT));
    }

    override createOutputNodes(): Node[] {
        return [];
    }

    override inputNodePositions(): Point[] {
        const { x, y } = this.position;
        return this.inputHandles().map(({ end }) => ({ x: x + end.x, y: y + end.y }));
    }

    override outputNodePositions(): Point[] {
        return [];
    }

    /** The height of the end of each input handle, from the display's position. */
    override getInputHandlePositions(): number[] {
        return this.inputHandles().map(({ end }) => end.y);
    }

    override getOutputHandlePositions(): Point[] {
        return [];
    }
}
