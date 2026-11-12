import type { Bounded } from "../Bounded";
import type { Drawable } from "../Drawable";
import type { Ghostable } from "../Ghostable";
import type { Point } from "../Point";
import type { Selectable } from "../Selectable";
import type { ComponentType } from "./Component";

export interface Decoration extends Drawable, Selectable, Ghostable, Bounded {
    /**
     * Identifies this component for as long as it exists, including while it is still a ghost. The store refers to
     * a selected component by this id instead of holding the instance, so that its state is plain data.
     */
    readonly id: string;
    readonly type: ComponentType;
    position: Point;
}
