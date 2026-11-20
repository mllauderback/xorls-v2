import { describe, it, expect } from 'vitest';
import { applyTransform, isIdentity, orient } from './orientation';
import { Orientation } from './Property';

/** A two-input gate's box, facing east: 6 x 4 cells at (0, 0). */
const gateBox = { left: 0, top: 0, width: 6, height: 4 };

describe('orient', () => {
    it('should leave a component facing east as it is', () => {
        const { transform, box } = orient(Orientation.east, { left: 1.5, top: -7, width: 6, height: 18 });

        expect(isIdentity(transform)).toBe(true);
        expect(box).toEqual({ left: 1.5, top: -7, width: 6, height: 18 });
    });

    it.each([
        // which way, the box it then covers, where the output pin (6, 2) and the first input pin (0, 1) go
        [Orientation.south, { left: 1, top: -1, width: 4, height: 6 }, { x: 3, y: 5 }, { x: 4, y: -1 }],
        [Orientation.north, { left: 1, top: -1, width: 4, height: 6 }, { x: 3, y: -1 }, { x: 2, y: 5 }],
        // mirrored, so the first input is still the top one
        [Orientation.west, { left: 0, top: 0, width: 6, height: 4 }, { x: 0, y: 2 }, { x: 6, y: 1 }],
    ])('should turn a gate to face %s around the middle of its box', (orientation, box, output, input) => {
        const turned = orient(orientation, gateBox);

        expect(turned.box).toEqual(box);
        expect(applyTransform(turned.transform, { x: 6, y: 2 })).toEqual(output);
        expect(applyTransform(turned.transform, { x: 0, y: 1 })).toEqual(input);
        // the middle stays where it is
        expect(applyTransform(turned.transform, { x: 3, y: 2 })).toEqual({ x: 3, y: 2 });
    });

    it.each(Object.values(Orientation))('should cover exactly the turned box when facing %s', orientation => {
        const { transform, box } = orient(orientation, { left: 10, top: 20, width: 6, height: 8 });
        const corners = [{ x: 10, y: 20 }, { x: 16, y: 20 }, { x: 10, y: 28 }, { x: 16, y: 28 }].map(p => applyTransform(transform, p));

        expect(Math.min(...corners.map(p => p.x))).toBe(box.left);
        expect(Math.max(...corners.map(p => p.x))).toBe(box.left + box.width);
        expect(Math.min(...corners.map(p => p.y))).toBe(box.top);
        expect(Math.max(...corners.map(p => p.y))).toBe(box.top + box.height);
    });

    it.each(Object.values(Orientation))('should keep grid points on grid points facing %s, even for a box an odd number of cells across', orientation => {
        // an input or output is 3 x 2 cells: turned around its middle, its corners would be half a cell off the grid
        const { transform, box } = orient(orientation, { left: 4, top: 8, width: 3, height: 2 });

        expect(Number.isInteger(box.left) && Number.isInteger(box.top)).toBe(true);
        for (let x = 4; x <= 7; x++) {
            for (let y = 8; y <= 10; y++) {
                const point = applyTransform(transform, { x, y });
                expect(Number.isInteger(point.x) && Number.isInteger(point.y), `${x}, ${y}`).toBe(true);
                expect(point.x >= box.left && point.x <= box.left + box.width).toBe(true);
                expect(point.y >= box.top && point.y <= box.top + box.height).toBe(true);
            }
        }
    });
});
