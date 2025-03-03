import { Drawable } from "../Drawable";
import { Ghostable } from "../Ghostable";
import { Point } from "../Point";
import { Selectable } from "../Selectable";

export interface Decoration extends Drawable, Selectable, Ghostable {
    position: Point;
}