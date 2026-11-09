import type { Bounded } from "../Bounded";
import type { Drawable } from "../Drawable";
import type { Ghostable } from "../Ghostable";
import type { Point } from "../Point";
import type { Selectable } from "../Selectable";

export interface Decoration extends Drawable, Selectable, Ghostable, Bounded {
    position: Point;
}
