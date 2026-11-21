import type { Point } from "../Point";
import type { Decoration } from "./Decoration";
import { ComponentType } from "./Component";
import { AbstractSelectable, BoundingBox } from "../Selectable";
import { Property, Orientation, PropertyRecord } from "../Property";

export class Text extends AbstractSelectable implements Decoration {
    position: Point;
    readonly id: string = crypto.randomUUID();
    readonly type: ComponentType = ComponentType.Text;
    font: string; // type may change to an enum who knows
    isGhost: boolean;

    constructor(position: Point) {
        super(new PropertyRecord({
            'Orientation': new Property(Orientation.east),
            'Label': new Property(''),
            'Font Size': new Property(14)
        }));
        this.position = position;
        this.font = "";
        this.isGhost = false;
    }

    draw(ctx: OffscreenCanvasRenderingContext2D) {
    }

    isSelected(mousePosition: Point): boolean {
        throw new Error("Method not implemented.");
    }

    getBoundingBox(): BoundingBox {
        return new BoundingBox(4, 1); // should reflect text font size instead
    }

    /** The font size, from the Font Size property, so the panel and the drawing agree. */
    get fontSize(): number {
        return this.properties.get('Font Size')!.value as number;
    }

    protected get displayName(): string {
        return this.type;
    }
}
