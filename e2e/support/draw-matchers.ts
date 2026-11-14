import { expect as baseExpect } from '@playwright/test';
import type { Drawn, Point } from './diagram-workspace';
import { DEFAULT_GRID_SPACING } from './diagram-workspace';

/** How far antialiasing can move the edge of a drawing in pixels */
const ANTIALIASING = 1;

const SIDES = ['left', 'top', 'right', 'bottom'] as const;

const formatPoint = (point: Point) => `(${point.x}, ${point.y})`;

/**
 * Mathers for what is drawn on the diagram's canvases.
 */
export const expect = baseExpect.extend({
    /**
     * The middle of a drawing is on a point, give or take the snap to the grid and antialiasing.
     * 
     * @param received The middle of the drawing, or null
     * @param pointer The point location
     * @param spacing The grid's cell size
     */
    toBeCenteredOn(received: Point | null, pointer: Point, spacing: number = DEFAULT_GRID_SPACING) {
        const name = 'toBeCenteredOn';
        const tolerance = spacing / 2 + ANTIALIASING;
        const offset = received && { x: received.x - pointer.x, y: received.y - pointer.y };
        const pass = !!offset && Math.abs(offset.x) <= tolerance && Math.abs(offset.y) <= tolerance;

        const message = () => {
            const hint = this.utils.matcherHint(name, 'center', 'pointer', { isNot: this.isNot });
            if (!received || !offset) return `${hint}\n\nNothing is drawn: there is no center.`;
            return `${hint}\n\n` +
                `Expected the center ${this.isNot ? 'not ' : ''}to be within ${tolerance}px of the pointer on both axes ` +
                `(half of a ${spacing}px grid cell, plus ${ANTIALIASING}px).\n` +
                `Center:  ${formatPoint(received)}\n` +
                `Pointer: ${formatPoint(pointer)}\n` +
                `Off by:  ${formatPoint(offset)}`;
        };

        return { pass, message, name, expected: pointer, actual: received };
    },

    /**
     * Two drawings cover the same box on the page, give or take antialiasing.
     * 
     * @param received 
     * @param expected 
     */
    toCoverSameBoxAs(received: Drawn | null, expected: Drawn) {
        const name = 'toCoverSameBoxAs';
        const differences = received
            ? SIDES.filter(side => Math.abs(received[side] - expected[side]) > ANTIALIASING)
            : [...SIDES];
        const pass = differences.length === 0;

        const message = () => {
            const hint = this.utils.matcherHint(name, 'drawing', 'other', { isNot: this.isNot });
            if (!received) return `${hint}\n\nNothing is drawn: there is no box.`;
            if (this.isNot) {
                return `${hint}\n\nExpected the boxes to differ by more htan ${ANTIALIASING}px on some side, but they don't.`;
            }
            const lines = differences.map(side =>
                `\t${side.padEnd(6)} ${this.utils.printReceived(received[side])}, expected ${this.utils.printExpected(expected[side])}`
            );
            return `${hint}\n\nExpected every side within ${ANTIALIASING}px.  Off:\n${lines.join('\n')}`;
        };

        const box = (drawn: Drawn | null) => drawn && Object.fromEntries(SIDES.map(side => [side, drawn[side]]));
        return { pass, message, name, expected: box(expected), actual: box(received) };
    },

    /**
     * A distance is an even multiple of the grid's cell size give or take antialiasing.
     * 
     * @param received A distance in pixels
     * @param spacing The grid's cell size
     * @returns 
     */
    toBeWholeCells(received: number, spacing: number = DEFAULT_GRID_SPACING) {
        const name = 'toBeWholeCells';
        const remainder = Math.abs(received) % spacing;
        const pass = remainder <= ANTIALIASING || spacing - remainder <= ANTIALIASING;

        const message = () =>
            `${this.utils.matcherHint(name, 'distance', 'spacing', { isNot: this.isNot })}\n\n` +
            `Expected ${this.utils.printReceived(received)}px ${this.isNot ? 'not ' : ''}to be a whole number of ` +
            `${this.utils.printExpected(spacing)}px cells (within ${ANTIALIASING}px).\n` +
            `That is ${(received / spacing).toFixed(2)} cells.`;

        return { pass, message, name, expected: spacing, actual: received };
    }
});