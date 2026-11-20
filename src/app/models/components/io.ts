import type { Point } from "../Point";
import { Property, Orientation, PropertyRecord } from "../Property";
import { BoundingBox } from "../Selectable";
import { ComponentType, IO } from "./Component";

export class Input extends IO {
    readonly type: ComponentType = ComponentType.Input;

    constructor(position: Point) {
        super(position, new PropertyRecord({
            'Orientation': new Property(Orientation.east),
            'Bus Width': new Property(1),
            'Label': new Property(''),
            'Output Value': new Property(0n)
        }));
        // TODO onodes: 1 onode;
    }

    protected drawFacingEast(ctx: OffscreenCanvasRenderingContext2D) {
    }

    protected eastBoundingBox(): BoundingBox {
        return new BoundingBox(3, 2);
    }
}

export class Output extends IO {
    readonly type: ComponentType = ComponentType.Output;

    constructor(position: Point) {
        super(position, new PropertyRecord({
            'Orientation': new Property(Orientation.east),
            'Bus Width': new Property(1, true),
            'Label': new Property(''),
            'Input Value': new Property(0n, true)
        }));
        // TODO inodes: 1 inode;
    }

    protected drawFacingEast(ctx: OffscreenCanvasRenderingContext2D) {
    }

    protected eastBoundingBox(): BoundingBox {
        return new BoundingBox(3, 2);
    }
}

export class SevenSegmentDisplay extends IO {
    readonly type: ComponentType = ComponentType.SevenSeg;

    constructor(position: Point) {
        super(position, new PropertyRecord({
            'Orientation': new Property(Orientation.east),
            'Bus Width': new Property(1, true),
            'Label': new Property(''),
            'Input Value': new Property(0n, true)
        }));
        // TODO onodes: 1 onode
    }

    protected drawFacingEast(ctx: OffscreenCanvasRenderingContext2D) {
    }

    protected eastBoundingBox(): BoundingBox {
        return new BoundingBox(4, 6);
    }
}
