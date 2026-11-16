import { describe, it, expect } from 'vitest';
import type { DrawState } from '../Drawable';
import type { Point } from '../Point';
import type { Component } from './Component';
import * as gates from './gates';
import { GRID_SPACING } from '../../components/canvas-layers/grid-canvas-layer/Grid';

/**
 * A stand-in for a canvas context that records points along every path a component draws: the end points of lines,
 * and samples along arcs and bezier curves.
 */
function recordPath(component: Component): Point[] {
    const points: Point[] = [];
    let current: Point = { x: 0, y: 0 };
    function at(x: number, y: number) {
        current = { x, y };
        points.push(current);
    }
    const ctx = {
        moveTo: at,
        lineTo: at,
        bezierCurveTo(c1x: number, c1y: number, c2x: number, c2y: number, x: number, y: number) {
            const p0 = current;
            for (let i = 1; i <= 20; i++) {
                const t = i / 20, u = 1 - t;
                at(
                    u ** 3 * p0.x + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t ** 3 * x,
                    u ** 3 * p0.y + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t ** 3 * y,
                );
            }
        },
        arc(cx: number, cy: number, r: number, start: number, end: number, ccw = false) {
            let sweep = end - start;
            if (!ccw && sweep < 0) sweep += 2 * Math.PI;
            if (ccw && sweep > 0) sweep -= 2 * Math.PI;
            if (Math.abs(end - start) >= 2 * Math.PI) sweep = ccw ? -2 * Math.PI : 2 * Math.PI;
            for (let i = 0; i <= 40; i++) {
                const angle = start + sweep * i / 40;
                at(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
            }
        },
    } as unknown as OffscreenCanvasRenderingContext2D;
    component.draw(ctx, {} as DrawState);
    return points;
}

const position = { x: 5, y: 10 };
const allGates: [string, Component][] = [
    ['AndGate', new gates.AndGate({ ...position }, 2)],
    ['OrGate', new gates.OrGate({ ...position }, 2)],
    ['XorGate', new gates.XorGate({ ...position }, 2)],
    ['NotGate', new gates.NotGate({ ...position })],
    ['Buffer', new gates.Buffer({ ...position })],
    ['NandGate', new gates.NandGate({ ...position }, 2)],
    ['NorGate', new gates.NorGate({ ...position }, 2)],
    ['XnorGate', new gates.XnorGate({ ...position }, 2)],
];

describe('gates', () => {
    describe.each(allGates)('%s', (_, gate) => {
        const points = recordPath(gate);
        const minX = Math.min(...points.map(p => p.x));
        const minY = Math.min(...points.map(p => p.y));
        const maxX = Math.max(...points.map(p => p.x));
        const maxY = Math.max(...points.map(p => p.y));
        const epsilon = 1e-9;

        it('should draw its left-most pixel at its position x', () => {
            expect(minX).toBeCloseTo(position.x);
        });

        it('should draw its top-most pixel at its position y', () => {
            expect(minY).toBeCloseTo(position.y);
        });

        it('should draw nothing outside its bounding box', () => {
            const box = gate.getBoundingBox();
            expect(maxX).toBeLessThanOrEqual(position.x + box.width + epsilon);
            expect(maxY).toBeLessThanOrEqual(position.y + box.height + epsilon);
        });

        it('should reach the right and bottom edges of its bounding box', () => {
            const box = gate.getBoundingBox();
            expect(maxX).toBeCloseTo(position.x + box.width);
            expect(maxY).toBeCloseTo(position.y + box.height);
        });
    });

    describe('getBoundingBox', () => {
        /** Every gate with the size of its footprint in grid cells: input pins, body and output pin. */
        const footprints: [string, (position: Point) => Component, { width: number, height: number }][] = [
            ['AndGate', p => new gates.AndGate(p, 2), { width: 6, height: 4 }],
            ['OrGate', p => new gates.OrGate(p, 2), { width: 6, height: 4 }],
            ['XorGate', p => new gates.XorGate(p, 2), { width: 6, height: 4 }],
            ['NotGate', p => new gates.NotGate(p), { width: 4, height: 2 }],
            ['Buffer', p => new gates.Buffer(p), { width: 4, height: 2 }],
            ['NandGate', p => new gates.NandGate(p, 2), { width: 6, height: 4 }],
            ['NorGate', p => new gates.NorGate(p, 2), { width: 6, height: 4 }],
            ['XnorGate', p => new gates.XnorGate(p, 2), { width: 6, height: 4 }],
        ];

        it('should cover every gate', () => {
            expect(footprints.map(([name]) => name)).toEqual(allGates.map(([name]) => name));
        });

        describe.each(footprints)('%s', (_, create, cells) => {
            it(`should be ${cells.width} x ${cells.height} grid cells`, () => {
                const box = create({ x: 0, y: 0 }).getBoundingBox();

                expect(box.width).toBe(cells.width * GRID_SPACING);
                expect(box.height).toBe(cells.height * GRID_SPACING);
            });

            it('should be whole grid cells, so a gate placed on a grid point has its corners on grid points', () => {
                const box = create({ x: 0, y: 0 }).getBoundingBox();

                expect(box.width % GRID_SPACING).toBe(0);
                expect(box.height % GRID_SPACING).toBe(0);
            });

            it('should not depend on where the gate is', () => {
                const atOrigin = create({ x: 0, y: 0 }).getBoundingBox();
                const elsewhere = create({ x: -340, y: 1260 }).getBoundingBox();
                const moved = create({ x: 0, y: 0 });
                moved.position = { x: 80, y: -40 };

                expect(elsewhere).toEqual(atOrigin);
                expect(moved.getBoundingBox()).toEqual(atOrigin);
            });

            it('should return a new box each time, so changing one does not change the gate', () => {
                const gate = create({ x: 0, y: 0 });
                const box = gate.getBoundingBox();

                box.width = 1;
                box.height = 1;

                expect(gate.getBoundingBox()).not.toBe(box);
                expect(gate.getBoundingBox().width).toBe(cells.width * GRID_SPACING);
                expect(gate.getBoundingBox().height).toBe(cells.height * GRID_SPACING);
            });

            it('should be what isSelected tests: its corners are in, a tenth of a cell outside each side is out', () => {
                const position = { x: 5, y: 10 };
                const gate = create(position);
                const { width, height } = gate.getBoundingBox();
                const right = position.x + width;
                const bottom = position.y + height;
                const middle = { x: position.x + width / 2, y: position.y + height / 2 };

                for (const corner of [position, { x: right, y: position.y }, { x: position.x, y: bottom }, { x: right, y: bottom }]) {
                    expect(gate.isSelected(corner), JSON.stringify(corner)).toBe(true);
                }
                expect(gate.isSelected(middle)).toBe(true);
                expect(gate.isSelected({ x: position.x - 0.1, y: middle.y })).toBe(false);
                expect(gate.isSelected({ x: middle.x, y: position.y - 0.1 })).toBe(false);
                expect(gate.isSelected({ x: right + 0.1, y: middle.y })).toBe(false);
                expect(gate.isSelected({ x: middle.x, y: bottom + 0.1 })).toBe(false);
            });
        });
    });

    describe('isSelected', () => {
        const gate = new gates.AndGate({ x: 5, y: 10 }, 2); // box 6 x 4 cells

        it('should be true for points inside the bounding box, edges included', () => {
            expect(gate.isSelected({ x: 5, y: 10 })).toBe(true);
            expect(gate.isSelected({ x: 8, y: 12 })).toBe(true);
            expect(gate.isSelected({ x: 11, y: 14 })).toBe(true);
        });

        it('should be false for points left of, above, right of or below the bounding box', () => {
            expect(gate.isSelected({ x: 4.9, y: 12 })).toBe(false);
            expect(gate.isSelected({ x: 8, y: 9.9 })).toBe(false);
            expect(gate.isSelected({ x: 11.1, y: 12 })).toBe(false);
            expect(gate.isSelected({ x: 8, y: 14.1 })).toBe(false);
        });
    });
});
