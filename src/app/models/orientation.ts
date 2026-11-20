import type { Point } from "./Point";
import { Orientation } from "./Property";

/**
 * A 2D affine transform, in the order the canvas takes it: a point (x, y) goes to (a x + c y + e, b x + d y + f).
 * For an orientation, a, b, c and d are each 0, 1 or -1.
 */
export interface Affine {
    a: number;
    b: number;
    c: number;
    d: number;
    e: number;
    f: number;
}

/** A box in diagram coordinates. */
export interface Box {
    left: number;
    top: number;
    width: number;
    height: number;
}

/**
 * How each orientation turns a point around the middle of the box, as the a, b, c and d of an Affine. Every component is
 * drawn facing east. South and north turn it a quarter clockwise and anticlockwise, so its output faces down or up.
 * West mirrors it left to right rather than turning it half around, so its inputs keep their order from top to bottom.
 */
const TURNS: Readonly<Record<Orientation, Pick<Affine, 'a' | 'b' | 'c' | 'd'>>> = {
    [Orientation.east]: { a: 1, b: 0, c: 0, d: 1 },
    [Orientation.south]: { a: 0, b: 1, c: -1, d: 0 },
    [Orientation.west]: { a: -1, b: 0, c: 0, d: 1 },
    [Orientation.north]: { a: 0, b: -1, c: 1, d: 0 },
};

/**
 * Works out where a component facing east ends up when it faces another way, turned around the middle of its box.
 *
 * A box whose width and height differ by an odd number of cells would have its corners half a cell off the grid once
 * turned, and its pins with them. Its turned box moves up and to the left by that half cell instead, so its corners
 * and pins stay on the grid the east-facing box is on.
 *
 * @param orientation Which way the component faces
 * @param box The component's box when it faces east, in diagram coordinates
 * @returns The transform that takes a point of the component facing east to where it is facing this way, and the box
 * it then covers
 */
export function orient(orientation: Orientation, box: Box): { transform: Affine, box: Box } {
    const { a, b, c, d } = TURNS[orientation] ?? TURNS[Orientation.east];
    const middle = { x: box.left + box.width / 2, y: box.top + box.height / 2 };
    const width = Math.abs(a) * box.width + Math.abs(c) * box.height;
    const height = Math.abs(b) * box.width + Math.abs(d) * box.height;
    // turned around its middle, the box's corner moves by half the difference in size: a whole number of cells, or
    // a half that is dropped up and to the left
    const left = box.left + Math.floor((box.width - width) / 2);
    const top = box.top + Math.floor((box.height - height) / 2);
    const shift = { x: left - (middle.x - width / 2), y: top - (middle.y - height / 2) };
    return {
        transform: {
            a, b, c, d,
            e: middle.x + shift.x - (a * middle.x + c * middle.y) + 0,
            f: middle.y + shift.y - (b * middle.x + d * middle.y) + 0,
        },
        box: { left, top, width, height },
    };
}

/** Where a transform takes a point. */
export function applyTransform(transform: Affine, point: Point): Point {
    const { a, b, c, d, e, f } = transform;
    return { x: a * point.x + c * point.y + e + 0, y: b * point.x + d * point.y + f + 0 };
}

/** Whether a transform leaves every point where it is. */
export function isIdentity(transform: Affine): boolean {
    const { a, b, c, d, e, f } = transform;
    return a === 1 && b === 0 && c === 0 && d === 1 && e === 0 && f === 0;
}
