import type { Point } from "../Point";
import { Property, Orientation, type PropertyField } from "../Property";
import { BoundingBox } from "../Selectable";
import { ComponentType, type Component, type Node } from "./Component";

export class Input implements Component {
    position: Point;
    readonly id: string = crypto.randomUUID();
    readonly type: ComponentType = ComponentType.Input;
    inodes: Node[];
    onodes: Node[];
    isGhost: boolean;
    properties: Partial<Record<PropertyField, Property>>;

    constructor(position: Point) {
        this.position = position;
        this.inodes = [];
        this.onodes = []; // TODO: 1 onode;
        this.isGhost = false;
        this.properties = {
            'Orientation': new Property(Orientation.east),
            'Bus Width': new Property(1),
            'Label': new Property(''),
            'Output Value': new Property(0)
        };
    }

    draw(ctx: OffscreenCanvasRenderingContext2D) {
    }

    isSelected(mousePosition: Point): boolean {
        throw new Error("Method not implemented.");
    }

    getBoundingBox(): BoundingBox {
        return new BoundingBox(3, 2);
    }

    updateProperty(field: PropertyField, property: Property): void {
        if (!Object.hasOwn(this.properties, field)) throw new Error(`${this.type} does not have property ${field}`);
        this.properties[field] = property;
    }
}

export class Output implements Component {
    position: Point;
    readonly id: string = crypto.randomUUID();
    readonly type: ComponentType = ComponentType.Output;
    inodes: Node[];
    onodes: Node[];
    isGhost: boolean;
    properties: Partial<Record<PropertyField, Property>>;

    constructor(position: Point) {
        this.position = position;
        this.inodes = []; // TODO: 1 inode;
        this.onodes = [];
        this.isGhost = false;
        this.properties = {
            'Orientation': new Property(Orientation.east),
            'Bus Width': new Property(1, true),
            'Label': new Property(''),
            'Input Value': new Property(0, true)
        };
    }

    draw(ctx: OffscreenCanvasRenderingContext2D) {
    }

    isSelected(mousePosition: Point): boolean {
        throw new Error("Method not implemented.");
    }

    getBoundingBox(): BoundingBox {
        return new BoundingBox(3, 2);
    }

    updateProperty(field: PropertyField, property: Property): void {
        if (!Object.hasOwn(this.properties, field)) throw new Error(`${this.type} does not have property ${field}`);
        this.properties[field] = property;
    }
}

export class SevenSegmentDisplay implements Component {
    position: Point;
    readonly id: string = crypto.randomUUID();
    readonly type: ComponentType = ComponentType.SevenSeg;
    inodes: Node[];
    onodes: Node[];
    isGhost: boolean;
    properties: Partial<Record<PropertyField, Property>>;

    constructor(position: Point) {
        this.position = position;
        this.inodes = [];
        this.onodes = []; // TODO: 1 onode
        this.isGhost = false;
        this.properties = {
            'Orientation': new Property(Orientation.east),
            'Bus Width': new Property(1, true),
            'Label': new Property(''),
            'Input Value': new Property(0, true)
        };
    }

    draw(ctx: OffscreenCanvasRenderingContext2D) {
    }

    isSelected(mousePosition: Point): boolean {
        throw new Error("Method not implemented.");
    }

    getBoundingBox(): BoundingBox {
        return new BoundingBox(4, 6);
    }

    updateProperty(field: PropertyField, property: Property): void {
        if (!Object.hasOwn(this.properties, field)) throw new Error(`${this.type} does not have property ${field}`);
        this.properties[field] = property;
    }
}
