import type { Point } from "../Point";
import { Property, Orientation, PropertyRecord } from "../Property";
import { BoundingBox } from "../Selectable";
import { ComponentType, IO, Node } from "./Component";

export class Input extends IO {
    readonly type: ComponentType = ComponentType.Input;

    constructor(position: Point) {
        super(position, new PropertyRecord({
            'Orientation': new Property(Orientation.east),
            'Bus Width': new Property(1),
            'Label': new Property(''),
            'Output Value': new Property(0n),
            'Output Format': new Property('Binary')
        }));
        // TODO onodes: 1 onode;
    }

    protected drawFacingEast(ctx: OffscreenCanvasRenderingContext2D) {
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
