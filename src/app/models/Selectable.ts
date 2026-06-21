import type { Point } from "./Point";

export interface Selectable {
    isSelected(mousePosition: Point): boolean;
}