import { arcFromEndPoints } from "../drawing-helpers";
import type { Point } from "../Point";
import { Property, Orientation, type PropertyField } from "../Property";
import { BoundingBox } from "../Selectable";
import { Component, ComponentType, createInputNodes } from "./Component";

/*
 * Gates are drawn in diagram units, which are grid cells (see GRID_SPACING): a two-input gate is 6 x 4 cells and a
 * one-input gate 4 x 2. Their pins (the ends of the input and output stubs) are whole cells from their position, so
 * they land on grid points.
 */

/** The radius of the inverting bubble on NOT, NAND, NOR and XNOR gates, in cells. */
const BUBBLE_RADIUS = 0.3;


export class AndGate extends Component {
    readonly type: ComponentType = ComponentType.AndGate;
    properties: Partial<Record<PropertyField, Property>>;

    constructor(position: Point, iNodeSize: number) {
        super(position);
        this.inodes = createInputNodes(iNodeSize);
        // TODO onodes: just 1
        this.properties = {
            'Orientation': new Property(Orientation.east),
            'Number of Inputs': new Property(iNodeSize),
            'Bus Width': new Property(1),
            // for now, output value is 0.  Eventually, the simulation state will upadte this property
            'Output Value': new Property(0n, true),
        };
    }

    /** Draws in diagram coordinates: the layer's context transform puts it in the right place on the canvas. */
    draw(ctx: OffscreenCanvasRenderingContext2D) {
        // body
        const { x, y } = this.position;
        ctx.moveTo(x + 3, y);
        ctx.lineTo(x + 1, y);
        ctx.lineTo(x + 1, y + 4);
        ctx.lineTo(x + 3, y + 4);
        ctx.moveTo(x + 3, y);
        ctx.arc(x + 3, y + 2, 2, 1.5 * Math.PI, 0.5 * Math.PI);

        // output node
        ctx.moveTo(x + 5, y + 2);
        ctx.lineTo(x + 6, y + 2);

        // input nodes (the left-most drawn pixels, at x = 0)... TODO: auto create based on inodes size
        ctx.moveTo(x + 1, y + 1);
        ctx.lineTo(x, y + 1);
        ctx.moveTo(x + 1, y + 3);
        ctx.lineTo(x, y + 3);
    }

    getBoundingBox(): BoundingBox {
        return new BoundingBox(6, 4);
    }
}

export class OrGate extends Component {
    readonly type: ComponentType = ComponentType.OrGate;
    properties: Partial<Record<PropertyField, Property>>;

    constructor(position: Point, iNodeSize: number) {
        super(position);
        this.inodes = createInputNodes(iNodeSize);
        // TODO onodes: just 1
        this.properties = {
            'Orientation': new Property(Orientation.east),
            'Number of Inputs': new Property(iNodeSize),
            'Bus Width': new Property(1),
            'Output Value': new Property(0n, true),
        };
    }

    draw(ctx: OffscreenCanvasRenderingContext2D) {
        const { x, y } = this.position;
        const backArgs = arcFromEndPoints(x + 1, y, x + 1, y + 4, 4);
        if (!backArgs) return;

        // body
        ctx.moveTo(x + 2.5, y);
        ctx.lineTo(x + 1, y);
        ctx.arc(...backArgs);
        ctx.lineTo(x + 2.5, y + 4);
        ctx.bezierCurveTo(x + 2.5, y + 4, x + 4.5, y + 4, x + 5, y + 2);
        ctx.moveTo(x + 2.5, y);
        ctx.bezierCurveTo(x + 2.5, y, x + 4.5, y, x + 5, y + 2);

        // output node
        ctx.moveTo(x + 5, y + 2);
        ctx.lineTo(x + 6, y + 2);

        // input nodes (the left-most drawn pixels, at x = 0)... TODO: auto create based on inodes size
        ctx.moveTo(x + 1.35, y + 1);
        ctx.lineTo(x, y + 1);
        ctx.moveTo(x + 1.35, y + 3);
        ctx.lineTo(x, y + 3);
    }

    getBoundingBox(): BoundingBox {
        return new BoundingBox(6, 4);
    }
}

export class XorGate extends Component {
    readonly type: ComponentType = ComponentType.XorGate;
    properties: Partial<Record<PropertyField, Property>>;

    constructor(position: Point, iNodeSize: number) {
        super(position);
        this.inodes = createInputNodes(iNodeSize);
        // TODO onodes: just 1
        this.properties = {
            'Orientation': new Property(Orientation.east),
            'Number of Inputs': new Property(iNodeSize),
            'Bus Width': new Property(1),
            'Output Value': new Property(0n, true),
        };
    }

    draw(ctx: OffscreenCanvasRenderingContext2D) {
        const { x, y } = this.position;
        const backArgs = arcFromEndPoints(x + 1, y, x + 1, y + 4, 4);
        const doubleArgs = arcFromEndPoints(x + 0.5, y, x + 0.5, y + 4, 4);
        if (!backArgs || !doubleArgs) return;

        // body
        ctx.moveTo(x + 2.5, y);
        ctx.lineTo(x + 1, y);
        ctx.arc(...backArgs);
        ctx.lineTo(x + 2.5, y + 4);
        ctx.bezierCurveTo(x + 2.5, y + 4, x + 4.5, y + 4, x + 5, y + 2);
        ctx.moveTo(x + 2.5, y);
        ctx.bezierCurveTo(x + 2.5, y, x + 4.5, y, x + 5, y + 2);

        ctx.moveTo(x + 0.5, y);
        ctx.arc(...doubleArgs);

        // output node
        ctx.moveTo(x + 5, y + 2);
        ctx.lineTo(x + 6, y + 2);

        // input nodes (the left-most drawn pixels, at x = 0)... TODO: auto create based on inodes size
        ctx.moveTo(x + 0.85, y + 1);
        ctx.lineTo(x, y + 1);
        ctx.moveTo(x + 0.85, y + 3);
        ctx.lineTo(x, y + 3);
    }

    getBoundingBox(): BoundingBox {
        return new BoundingBox(6, 4);
    }
}

export class NotGate extends Component {
    readonly type: ComponentType = ComponentType.NotGate;
    properties: Partial<Record<PropertyField, Property>>;

    constructor(position: Point) {
        super(position);
        // TODO inodes: just 1
        // TODO onodes: just 1
        this.properties = {
            'Orientation': new Property(Orientation.east),
            'Number of Inputs': new Property(1),
            'Bus Width': new Property(1),
            'Output Value': new Property(0n, true),
        };
    }

    draw(ctx: OffscreenCanvasRenderingContext2D) {
        // body
        const { x, y } = this.position;
        ctx.moveTo(x + 1, y);
        ctx.lineTo(x + 1, y + 2);
        ctx.lineTo(x + 3, y + 1);
        ctx.lineTo(x + 1, y);

        ctx.moveTo(x + 3.6, y + 1);
        ctx.arc(x + 3.3, y + 1, BUBBLE_RADIUS, 0, 2 * Math.PI);

        // output node
        ctx.moveTo(x + 3.6, y + 1);
        ctx.lineTo(x + 4, y + 1);

        // input node
        ctx.moveTo(x + 1, y + 1);
        ctx.lineTo(x, y + 1);
    }

    getBoundingBox(): BoundingBox {
        return new BoundingBox(4, 2);
    }
}

export class Buffer extends Component {
    readonly type: ComponentType = ComponentType.Buffer;
    properties: Partial<Record<PropertyField, Property>>;

    constructor(position: Point) {
        super(position);
        this.properties = {
            'Orientation': new Property(Orientation.east),
            'Number of Inputs': new Property(1),
            'Bus Width': new Property(1),
            'Output Value': new Property(0n, true),
        };
    }

    draw(ctx: OffscreenCanvasRenderingContext2D) {
        // body
        const { x, y } = this.position;
        ctx.moveTo(x + 1, y);
        ctx.lineTo(x + 1, y + 2);
        ctx.lineTo(x + 3, y + 1);
        ctx.lineTo(x + 1, y);

        // output node
        ctx.moveTo(x + 3, y + 1);
        ctx.lineTo(x + 4, y + 1);

        // input node
        ctx.moveTo(x + 1, y + 1);
        ctx.lineTo(x, y + 1);
    }

    getBoundingBox(): BoundingBox {
        return new BoundingBox(4, 2);
    }
}

export class NandGate extends Component {
    readonly type: ComponentType = ComponentType.NandGate;
    properties: Partial<Record<PropertyField, Property>>;

    constructor(position: Point, iNodeSize: number) {
        super(position);
        this.inodes = createInputNodes(iNodeSize);
        // TODO onodes: just 1
        this.properties = {
            'Orientation': new Property(Orientation.east),
            'Number of Inputs': new Property(iNodeSize),
            'Bus Width': new Property(1),
            'Output Value': new Property(0n, true),
        };
    }

    draw(ctx: OffscreenCanvasRenderingContext2D) {
        // body
        const { x, y } = this.position;
        ctx.moveTo(x + 3, y);
        ctx.lineTo(x + 1, y);
        ctx.lineTo(x + 1, y + 4);
        ctx.lineTo(x + 3, y + 4);
        ctx.moveTo(x + 3, y);
        ctx.arc(x + 3, y + 2, 2, 1.5 * Math.PI, 0.5 * Math.PI);

        ctx.moveTo(x + 5.55, y + 2);
        ctx.arc(x + 5.3, y + 2, BUBBLE_RADIUS, 0, 2 * Math.PI);

        // output node
        ctx.moveTo(x + 5.55, y + 2);
        ctx.lineTo(x + 6, y + 2);

        // input nodes (the left-most drawn pixels, at x = 0)... TODO: auto create based on inodes size
        ctx.moveTo(x + 1, y + 1);
        ctx.lineTo(x, y + 1);
        ctx.moveTo(x + 1, y + 3);
        ctx.lineTo(x, y + 3);
    }

    getBoundingBox(): BoundingBox {
        return new BoundingBox(6, 4);
    }
}

export class NorGate extends Component {
    readonly type: ComponentType = ComponentType.NorGate;
    properties: Partial<Record<PropertyField, Property>>;

    constructor(position: Point, iNodeSize: number) {
        super(position);
        this.inodes = createInputNodes(iNodeSize);
        // TODO onodes: just 1
        this.properties = {
            'Orientation': new Property(Orientation.east),
            'Number of Inputs': new Property(iNodeSize),
            'Bus Width': new Property(1),
            'Output Value': new Property(0n, true),
        };
    }

    draw(ctx: OffscreenCanvasRenderingContext2D) {
        const { x, y } = this.position;
        const backArgs = arcFromEndPoints(x + 1, y, x + 1, y + 4, 4);
        if (!backArgs) return;

        // body
        ctx.moveTo(x + 2.5, y);
        ctx.lineTo(x + 1, y);
        ctx.arc(...backArgs);
        ctx.lineTo(x + 2.5, y + 4);
        ctx.bezierCurveTo(x + 2.5, y + 4, x + 4.5, y + 4, x + 5, y + 2);
        ctx.moveTo(x + 2.5, y);
        ctx.bezierCurveTo(x + 2.5, y, x + 4.5, y, x + 5, y + 2);

        ctx.moveTo(x + 5.55, y + 2);
        ctx.arc(x + 5.3, y + 2, BUBBLE_RADIUS, 0, 2 * Math.PI);

        // output node
        ctx.moveTo(x + 5.55, y + 2);
        ctx.lineTo(x + 6, y + 2);

        // input nodes (the left-most drawn pixels, at x = 0)... TODO: auto create based on inodes size
        ctx.moveTo(x + 1.35, y + 1);
        ctx.lineTo(x, y + 1);
        ctx.moveTo(x + 1.35, y + 3);
        ctx.lineTo(x, y + 3);
    }

    getBoundingBox(): BoundingBox {
        return new BoundingBox(6, 4);
    }
}

export class XnorGate extends Component {
    readonly type: ComponentType = ComponentType.XnorGate;
    properties: Partial<Record<PropertyField, Property>>;

    constructor(position: Point, iNodeSize: number) {
        super(position);
        this.inodes = createInputNodes(iNodeSize);
        // TODO onodes: just 1
        this.properties = {
            'Orientation': new Property(Orientation.east),
            'Number of Inputs': new Property(iNodeSize),
            'Bus Width': new Property(1),
            'Output Value': new Property(0n, true),
        };
    }

    draw(ctx: OffscreenCanvasRenderingContext2D) {
        const { x, y } = this.position;
        const backArgs = arcFromEndPoints(x + 1, y, x + 1, y + 4, 4);
        const doubleArgs = arcFromEndPoints(x + 0.5, y, x + 0.5, y + 4, 4);
        if (!backArgs || !doubleArgs) return;

        // body
        ctx.moveTo(x + 2.5, y);
        ctx.lineTo(x + 1, y);
        ctx.arc(...backArgs);
        ctx.lineTo(x + 2.5, y + 4);
        ctx.bezierCurveTo(x + 2.5, y + 4, x + 4.5, y + 4, x + 5, y + 2);
        ctx.moveTo(x + 2.5, y);
        ctx.bezierCurveTo(x + 2.5, y, x + 4.5, y, x + 5, y + 2);

        ctx.moveTo(x + 0.5, y);
        ctx.arc(...doubleArgs);

        ctx.moveTo(x + 5.55, y + 2);
        ctx.arc(x + 5.3, y + 2, BUBBLE_RADIUS, 0, 2 * Math.PI);

        // output node
        ctx.moveTo(x + 5.55, y + 2);
        ctx.lineTo(x + 6, y + 2);

        // input nodes (the left-most drawn pixels, at x = 0)... TODO: auto create based on inodes size
        ctx.moveTo(x + 0.85, y + 1);
        ctx.lineTo(x, y + 1);
        ctx.moveTo(x + 0.85, y + 3);
        ctx.lineTo(x, y + 3);
    }

    getBoundingBox(): BoundingBox {
        return new BoundingBox(6, 4);
    }
}
