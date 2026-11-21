import type { Point } from "../Point";
import { Property, Orientation, type PropertyField } from "../Property";
import { BoundingBox } from "../Selectable";
import { Component, ComponentType } from "./Component";

export class Input extends Component {
    readonly type: ComponentType = ComponentType.Input;
    properties: Partial<Record<PropertyField, Property>>;

    constructor(position: Point) {
        super(position);
        // TODO onodes: 1 onode;
        this.properties = {
            'Orientation': new Property(Orientation.east),
            'Bus Width': new Property(1),
            'Label': new Property(''),
            'Output Value': new Property(0)
        };
    }

    draw(ctx: OffscreenCanvasRenderingContext2D) {
    }

    getBoundingBox(): BoundingBox {
        return new BoundingBox(3, 2);
    }
}

export class Output extends Component {
    readonly type: ComponentType = ComponentType.Output;
    properties: Partial<Record<PropertyField, Property>>;

    constructor(position: Point) {
        super(position);
        // TODO inodes: 1 inode;
        this.properties = {
            'Orientation': new Property(Orientation.east),
            'Bus Width': new Property(1, true),
            'Label': new Property(''),
            'Input Value': new Property(0, true)
        };
    }

    draw(ctx: OffscreenCanvasRenderingContext2D) {
    }

    getBoundingBox(): BoundingBox {
        return new BoundingBox(3, 2);
    }
}

export class SevenSegmentDisplay extends Component {
    readonly type: ComponentType = ComponentType.SevenSeg;
    properties: Partial<Record<PropertyField, Property>>;

    constructor(position: Point) {
        super(position);
        // TODO onodes: 1 onode
        this.properties = {
            'Orientation': new Property(Orientation.east),
            'Bus Width': new Property(1, true),
            'Label': new Property(''),
            'Input Value': new Property(0, true)
        };
    }

    draw(ctx: OffscreenCanvasRenderingContext2D) {
    }

    getBoundingBox(): BoundingBox {
        return new BoundingBox(4, 6);
    }
}
