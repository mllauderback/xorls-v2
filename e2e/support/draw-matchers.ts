import { expect as baseExpect } from '@playwright/test';
import type { Color, ColorCount, Drawn } from './canvas-layer';
import { DEFAULT_GRID_SPACING } from './diagram-workspace';
import { PinDirection, Point } from './draw-helpers';

/** How far antialiasing can move the edge of a drawing in pixels */
const ANTIALIASING = 1;

const SIDES = ['left', 'top', 'right', 'bottom'] as const;

const CHANNELS = ['r', 'g', 'b'] as const;

/**
 * How far a pixel's alpha can differ between a drawing and its mirror image, 0-255. The canvas antialiases a curve a
 * little differently when it is mirrored: the gates differ by up to 16. A missing or misplaced line differs by about 255.
 */
const MIRROR_ALPHA_TOLERANCE = 32;

/** The grid lines shown in the workspace, in client coordinates: the columns' x and the rows' y. */
export interface GridLines {
    x: number[];
    y: number[];
}

function formatPoint(point: Point) {
    return `(${point.x}, ${point.y})`;
}

/**
 * How far a color channel read back from a canvas can be from what was drawn. A canvas stores colors multiplied by
 * their alpha, so reading back a partly transparent pixel loses precision, more the fainter it is, and browsers
 * round it differently. An opaque pixel reads back exactly.
 */
function channelTolerance(alpha: number) {
    return alpha === 255 ? 0 : Math.ceil(255 / alpha);
}

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

        const { isNot, utils } = this;
        function message() {
            const hint = utils.matcherHint(name, 'center', 'pointer', { isNot });
            if (!received || !offset) return `${hint}\n\nNothing is drawn: there is no center.`;
            return `${hint}\n\n` +
                `Expected the center ${isNot ? 'not ' : ''}to be within ${tolerance}px of the pointer on both axes ` +
                `(half of a ${spacing}px grid cell, plus ${ANTIALIASING}px).\n` +
                `Center:  ${formatPoint(received)}\n` +
                `Pointer: ${formatPoint(pointer)}\n` +
                `Off by:  ${formatPoint(offset)}`;
        }

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

        const { isNot, utils } = this;
        function message() {
            const hint = utils.matcherHint(name, 'drawing', 'other', { isNot });
            if (!received) return `${hint}\n\nNothing is drawn: there is no box.`;
            if (isNot) {
                return `${hint}\n\nExpected the boxes to differ by more htan ${ANTIALIASING}px on some side, but they don't.`;
            }
            const lines = differences.map(side =>
                `\t${side.padEnd(6)} ${utils.printReceived(received[side])}, expected ${utils.printExpected(expected[side])}`
            );
            return `${hint}\n\nExpected every side within ${ANTIALIASING}px.  Off:\n${lines.join('\n')}`;
        }

        function box(drawn: Drawn | null) {
            return drawn && Object.fromEntries(SIDES.map(side => [side, drawn[side]]));
        }
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

        const { isNot, utils } = this;
        function message() {
            return `${utils.matcherHint(name, 'distance', 'spacing', { isNot })}\n\n` +
                `Expected ${utils.printReceived(received)}px ${isNot ? 'not ' : ''}to be a whole number of ` +
                `${utils.printExpected(spacing)}px cells (within ${ANTIALIASING}px).\n` +
                `That is ${(received / spacing).toFixed(2)} cells.`;
        }

        return { pass, message, name, expected: spacing, actual: received };
    },

    /**
     * A gate's pins are on grid lines. Facing east or west ('across'), its pins end on the columns of its left and
     * right sides, and its middle is on a grid row: between its two inputs, or on the pin of a one-input gate. Facing
     * north or south ('down'), its pins end on the rows of its top and bottom sides, and its middle is on a column.
     * A pin that starts a run of pixels starts on the line's column or row; one that ends a run ends just before the line.
     *
     * @param received What the gate draws
     * @param lines The grid lines, which have to be drawn in lines mode
     * @param direction Which way the gate's pins point
     */
    toHavePinsOnGridLines(received: Drawn, lines: GridLines, direction: PinDirection = 'horizontal') {
        const name = 'toHavePinsOnGridLines';
        const isHorizontal = direction === 'horizontal';
        const [ends, endLines] = isHorizontal
            ? [[received.left, received.right + 1], lines.x]
            : [[received.top, received.bottom + 1], lines.y];
        const [middle, middleLines] = isHorizontal
            ? [(received.top + received.bottom) / 2, lines.y]
            : [(received.left + received.right) / 2, lines.x];
        const offLine = ends.filter(end => !endLines.includes(end));
        const middleOff = Math.min(...middleLines.map(line => Math.abs(line - middle)));
        const pass = offLine.length === 0 && middleOff <= ANTIALIASING;

        const { isNot, utils } = this;
        function message() {
            const [endAxis, middleAxis] = isHorizontal ? ['columns', 'row'] : ['rows', 'column'];
            return `${utils.matcherHint(name, 'drawing', 'lines', { isNot })}\n\n` +
                `Expected the pins ${isNot ? 'not ' : ''}to end on grid ${endAxis} and the middle to be on a grid ` +
                `${middleAxis} (within ${ANTIALIASING}px).\n` +
                `Pin ends: ${ends.join(', ')}${offLine.length ? `, off the lines: ${offLine.join(', ')}` : ''}\n` +
                `Middle:   ${middle}, ${middleOff}px from the nearest ${middleAxis}`;
        }

        return { pass, message, name, expected: true, actual: { ends, middle } };
    },

    /**
     * One drawing is another mirrored left to right: the same size, and every pixel's alpha within
     * MIRROR_ALPHA_TOLERANCE of the pixel on the other side.
     *
     * @param received The alpha of every pixel of a drawing, row by row
     * @param expected The alpha of every pixel of the drawing it should mirror, row by row
     */
    toMirror(received: number[][], expected: number[][]) {
        const name = 'toMirror';
        const size = (pixels: number[][]) => `${pixels[0]?.length ?? 0}x${pixels.length}`;
        const sameSize = size(received) === size(expected);
        let worst = { x: 0, y: 0, alpha: 0, mirrored: 0, difference: 0 };
        if (sameSize) {
            received.forEach((row, y) => row.forEach((alpha, x) => {
                const mirrored = expected[y][row.length - 1 - x];
                const difference = Math.abs(alpha - mirrored);
                if (difference > worst.difference) worst = { x, y, alpha, mirrored, difference };
            }));
        }
        const pass = sameSize && worst.difference <= MIRROR_ALPHA_TOLERANCE;

        const { isNot, utils } = this;
        function message() {
            const hint = utils.matcherHint(name, 'drawing', 'other', { isNot });
            if (!sameSize) return `${hint}\n\nThe drawings are different sizes: ${size(received)} and ${size(expected)}.`;
            return `${hint}\n\n` +
                `Expected every pixel ${isNot ? 'not ' : ''}to be within ${MIRROR_ALPHA_TOLERANCE} alpha of its mirror image.\n` +
                `Worst at (${worst.x}, ${worst.y}) from the top-left: alpha ${worst.alpha}, mirrored ${worst.mirrored}, ` +
                `off by ${worst.difference}`;
        }

        return { pass, message, name, expected: MIRROR_ALPHA_TOLERANCE, actual: worst.difference };
    },

    /**
     * Every color read from a canvas layer is the expected red, green and blue. Opaque pixels have to match
     * exactly; partly transparent ones are allowed the precision lost in reading them back. The alpha channel
     * is not checked.
     *
     * @param received The colors of a layer's drawn pixels, from CanvasLayer.colors()
     * @param expected The red, green and blue every one of them should be, 0-255
     */
    toMatchColor(received: ColorCount[], expected: Color) {
        const name = 'toMatchColor';
        function isOff(color: Color) {
            return CHANNELS.some(channel => Math.abs(color[channel] - expected[channel]) > channelTolerance(color.a));
        }
        const off = received.filter(colorCount => isOff(colorCount.color));
        const pass = received.length > 0 && off.length === 0;

        const { isNot, utils } = this;
        function message() {
            const hint = utils.matcherHint(name, 'colors', 'expected', { isNot });
            const color = `rgb(${expected.r}, ${expected.g}, ${expected.b})`;
            if (received.length === 0) return `${hint}\n\nNothing is drawn: there are no colors.`;
            if (isNot) return `${hint}\n\nExpected some color not to be ${color}, but they all are.`;
            const shown = off.slice(0, 5).map(c =>
                `\trgba(${c.color.r}, ${c.color.g}, ${c.color.b}, ${c.color.a}) on ${c.count} pixels, allowed to be off by ${channelTolerance(c.color.a)}`
            );
            const more = off.length > shown.length ? `\n\t...and ${off.length - shown.length} more` : '';
            return `${hint}\n\nExpected every color to be ${color}.  Off:\n${shown.join('\n')}${more}`;
        }

        return { pass, message, name, expected, actual: off };
    }
});