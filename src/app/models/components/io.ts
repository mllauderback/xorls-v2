import type { Point } from "../Point";
import { Property, Orientation, PropertyRecord } from "../Property";
import { BoundingBox } from "../Selectable";
import { Component, ComponentType } from "./Component";

export class Input extends Component {
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

    draw(ctx: OffscreenCanvasRenderingContext2D) {
    }

    getBoundingBox(): BoundingBox {
        return new BoundingBox(3, 2);
    }
}

export class Output extends Component {
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

    draw(ctx: OffscreenCanvasRenderingContext2D) {
    }

    getBoundingBox(): BoundingBox {
        return new BoundingBox(3, 2);
    }
}

export class SevenSegmentDisplay extends Component {
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

    draw(ctx: OffscreenCanvasRenderingContext2D) {
    }

    getBoundingBox(): BoundingBox {
        return new BoundingBox(4, 6);
    }
}
