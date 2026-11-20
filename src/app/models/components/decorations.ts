import type { Point } from "../Point";
import type { Decoration } from "./Decoration";
import { ComponentType } from "./Component";
import { BoundingBox } from "../Selectable";
import { Property, Orientation, type PropertyField } from "../Property";

export class Text implements Decoration {
    position: Point;
    readonly id: string = crypto.randomUUID();
    readonly type: ComponentType = ComponentType.Text;
    font: string; // type may change to an enum who knows
    size: number;
    isGhost: boolean;
    properties: Partial<Record<PropertyField, Property>>;

    constructor(position: Point) {
        this.position = position;
        this.font = "";
        this.size = 12;
        this.isGhost = false;
        this.properties = {
            'Orientation': new Property(Orientation.east),
            'Label': new Property(''),
            'Font Size': new Property(14)
        };
    }

    draw(ctx: OffscreenCanvasRenderingContext2D) {
    }

    isSelected(mousePosition: Point): boolean {
        throw new Error("Method not implemented.");
    }

    getBoundingBox(): BoundingBox {
        return new BoundingBox(4, 1); // should reflect text font size instead
    }
}
