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
    // the current point before the transform, which is what curves continue from
    let current: Point = { x: 0, y: 0 };
    let matrix = [1, 0, 0, 1, 0, 0];
    const saved: number[][] = [];
    function at(x: number, y: number) {
        current = { x, y };
        const [a, b, c, d, e, f] = matrix;
        points.push({ x: a * x + c * y + e, y: b * x + d * y + f });
    }
    const ctx = {
        save: () => saved.push(matrix),
        restore: () => { matrix = saved.pop()!; },
        transform(a: number, b: number, c: number, d: number, e: number, f: number) {
            const [ma, mb, mc, md, me, mf] = matrix;
            matrix = [ma * a + mc * b, mb * a + md * b, ma * c + mc * d, mb * c + md * d, ma * e + mc * f + me, mb * e + md * f + mf];
        },
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
const allGates: [string, gates.Gate][] = [
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

/** Where the body's top is in the diagram: always the gate's position, wherever its footprint starts. */
function bodyTop(gate: Component): number {
    return gate.position.y;
}

describe('gates with two or more inputs', () => {
    const extendedBacks: [string, (inputs: number) => gates.Gate][] = [
        ['AndGate', n => new gates.AndGate({ ...position }, n)],
        ['NandGate', n => new gates.NandGate({ ...position }, n)],
        ['OrGate', n => new gates.OrGate({ ...position }, n)],
        ['NorGate', n => new gates.NorGate({ ...position }, n)],
        ['XorGate', n => new gates.XorGate({ ...position }, n)],
        ['XnorGate', n => new gates.XnorGate({ ...position }, n)],
    ];

    describe.each(extendedBacks)('%s', (_, create) => {
        it.each([
            // inputs, then the height of the footprint: a whole cell past the outer-most inputs
            [2, 4],
            [3, 4],
            [4, 6],
            [5, 6],
            [6, 8],
            [7, 8],
            [10, 12],
            [15, 16],
            [16, 18],
            [25, 26],
            [32, 34],
        ])('should have a 6 cell wide footprint that covers everything it draws with %s inputs, %s cells high', (inputs, height) => {
            const gate = create(inputs);
            const box = gate.getBoundingBox();
            const points = recordPath(gate);
            const ys = points.map(p => p.y);
            // the back ends half a cell past an outer-most input, unless every input is inside the body
            const margin = inputs > 3 ? 0.5 : 0;

            expect(box.width).toBe(6 * GRID_SPACING);
            expect(box.height).toBe(height * GRID_SPACING);
            expect(Math.min(...points.map(p => p.x))).toBeCloseTo(position.x);
            expect(Math.max(...points.map(p => p.x))).toBeCloseTo(position.x + box.width);
            // the footprint reaches as far above the body as below it
            expect(box.top).toBe((4 - height) / 2 * GRID_SPACING);
            expect(Math.min(...ys)).toBeCloseTo(position.y + box.top + margin);
            expect(Math.max(...ys)).toBeCloseTo(position.y + box.top + box.height - margin);
        });

        it('should keep its body where it is when inputs are added', () => {
            const gate = create(2);
            const before = recordPath(gate).filter(p => p.x > position.x + 1.5);

            gate.updateProperty('Number of Inputs', 16);

            // the output stub and the front of the body are drawn in the same place
            expect(recordPath(gate).filter(p => p.x > position.x + 1.5)).toEqual(expect.arrayContaining(before));
            expect(gate.position).toEqual(position);
        });

        it('should be selected on its back above and below the body, and not past its footprint', () => {
            // 16 inputs: the footprint runs from 7 cells above the body to 11 below its top
            const gate = create(16);

            expect(gate.isSelected({ x: position.x + 1, y: position.y - 6.5 })).toBe(true);
            expect(gate.isSelected({ x: position.x + 1, y: position.y + 10.5 })).toBe(true);
            expect(gate.isSelected({ x: position.x + 1, y: position.y - 7.1 })).toBe(false);
            expect(gate.isSelected({ x: position.x + 1, y: position.y + 11.1 })).toBe(false);
        });

        it('should keep its inputs on grid points when it is placed on one', () => {
            const gate = create(16);
            const box = gate.getBoundingBox();
            const handles = gate.getInputHandlePositions();

            expect(handles.every(Number.isInteger)).toBe(true);
            expect(Number.isInteger(box.top)).toBe(true);
            expect(Math.min(...handles)).toBe(box.top + 1);
            expect(Math.max(...handles)).toBe(box.top + box.height - 1);
        });
    });
});

describe('gates with a curved back', () => {
    const curvedBacks: [string, (inputs: number) => gates.CurvedBackGate][] = [
        ['OrGate', n => new gates.OrGate({ ...position }, n)],
        ['NorGate', n => new gates.NorGate({ ...position }, n)],
        ['XorGate', n => new gates.XorGate({ ...position }, n)],
        ['XnorGate', n => new gates.XnorGate({ ...position }, n)],
    ];

    describe.each(curvedBacks)('%s', (_, create) => {
        it.each([
            [2, [1, 3]],
            [5, [0, 1, 2, 3, 4]],
            [6, [-1, 0, 1, 3, 4, 5]],
            [7, [-1, 0, 1, 2, 3, 4, 5]],
            [15, [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9]],
            [16, [-6, -5, -4, -3, -2, -1, 0, 1, 3, 4, 5, 6, 7, 8, 9, 10]],
        ])('should put %s inputs on %j', (inputs, handles) => {
            expect(create(inputs).getInputHandlePositions()).toEqual(handles);
        });

        it.each([
            // inputs, then the top and bottom of the back, in cells from the top of the body
            [3, 0, 4],
            // an input on the very end of the back gets half a cell of straight back past it
            [4, -0.5, 4.5],
            [5, -0.5, 4.5],
            // an extension that isn't full ends half a cell past its outer-most input
            [6, -1.5, 5.5],
            [7, -1.5, 5.5],
            [10, -3.5, 7.5],
            [15, -5.5, 9.5],
            [16, -6.5, 10.5],
            [25, -10.5, 14.5],
            [32, -14.5, 18.5],
        ])('should give %s inputs a back from %s to %s', (inputs, top, bottom) => {
            const gate = create(inputs);
            const ys = recordPath(gate).map(p => p.y);

            expect(Math.min(...ys)).toBeCloseTo(bodyTop(gate) + top);
            expect(Math.max(...ys)).toBeCloseTo(bodyTop(gate) + bottom);
        });

        it.each([10, 15, 16, 32])('should start every input stub on the back with %s inputs', inputs => {
            const gate = create(inputs);
            const points = recordPath(gate);

            for (const handle of gate.getInputHandlePositions()) {
                const y = bodyTop(gate) + handle;
                const stub = points.find((p, i) => p.x === position.x && p.y === y && i > 0 && points[i - 1].y === y)!;
                const start = points[points.indexOf(stub) - 1];
                // the back, sampled near that height, passes where the stub starts
                const onBack = points.filter(p => p !== start && p !== stub && Math.abs(p.y - y) < 0.1);
                expect(onBack.some(p => Math.abs(p.x - start.x) < 0.05), `input at ${handle}`).toBe(true);
            }
        });
    });
});

describe('gates with a straight back', () => {
    const straightBacks: [string, (inputs: number) => gates.StraightBackGate][] = [
        ['AndGate', n => new gates.AndGate({ ...position }, n)],
        ['NandGate', n => new gates.NandGate({ ...position }, n)],
    ];

    describe.each(straightBacks)('%s', (_, create) => {
        it.each([
            // inputs, then the top and bottom of the back, in cells from the top of the body
            [2, 0, 4],
            [3, 0, 4],
            // an input on the very end of the back gets half a cell of straight back past it
            [4, -0.5, 4.5],
            [6, -1.5, 5.5],
            [15, -5.5, 9.5],
            [16, -6.5, 10.5],
            [32, -14.5, 18.5],
        ])('should give %s inputs a back from %s to %s', (inputs, top, bottom) => {
            const gate = create(inputs);
            const ys = recordPath(gate).map(p => p.y);

            expect(Math.min(...ys)).toBeCloseTo(bodyTop(gate) + top);
            expect(Math.max(...ys)).toBeCloseTo(bodyTop(gate) + bottom);
        });

        it('should draw every input stub from the back to the left edge', () => {
            const gate = create(16);
            const points = recordPath(gate);

            for (const handle of gate.getInputHandlePositions()) {
                const y = bodyTop(gate) + handle;
                const stub = points.findIndex((p, i) => p.x === position.x && p.y === y && i > 0 && points[i - 1].y === y);
                expect(points[stub - 1], `input at ${handle}`).toEqual({ x: position.x + 1, y });
            }
        });
    });
});

describe('gates with a single input', () => {
    const singleInputGates: [string, () => gates.StraightBackGate][] = [
        ['NotGate', () => new gates.NotGate({ ...position })],
        ['Buffer', () => new gates.Buffer({ ...position })],
    ];

    describe.each(singleInputGates)('%s', (_, create) => {
        it('should be a gate with a straight back', () => {
            expect(create()).toBeInstanceOf(gates.StraightBackGate);
        });

        it('should keep its one input in the middle of its back, which can\'t be changed', () => {
            const gate = create();

            expect(gate.getInputHandlePositions()).toEqual([1]);
            expect(gate.getOutputHandlePositions()).toEqual([{ x: 4, y: 1 }]);
            expect(() => gate.updateProperty('Number of Inputs', 2)).toThrow();
            expect(gate.inodes).toHaveLength(1);
        });

        it('should draw its back from the top to the bottom of the triangle, and its input stub from there to the left edge', () => {
            const points = recordPath(create());

            expect(points.slice(0, 2)).toEqual([{ x: position.x + 1, y: position.y }, { x: position.x + 1, y: position.y + 2 }]);
            expect(points.slice(-2)).toEqual([{ x: position.x + 1, y: position.y + 1 }, { x: position.x, y: position.y + 1 }]);
        });
    });
});

describe('gates facing another way', () => {
    const facingGates: [string, () => gates.Gate][] = [
        ['AndGate', () => new gates.AndGate({ ...position }, 2)],
        ['NandGate with 16 inputs', () => new gates.NandGate({ ...position }, 16)],
        ['OrGate with 7 inputs', () => new gates.OrGate({ ...position }, 7)],
        ['XnorGate with 4 inputs', () => new gates.XnorGate({ ...position }, 4)],
        ['NotGate', () => new gates.NotGate({ ...position })],
    ];

    describe.each(facingGates)('%s', (_, create) => {
        it.each(['South', 'West', 'North'])('should draw inside its turned box, reaching every edge, facing %s', orientation => {
            const gate = create();
            const east = gate.getBoundingBox();
            gate.updateProperty('Orientation', orientation);
            const box = gate.getBoundingBox();
            const points = recordPath(gate);
            const xs = points.map(p => p.x);
            const ys = points.map(p => p.y);
            const left = position.x + box.left, top = position.y + box.top;
            // what reaches the east box's left and right edges, the input and output stubs, reaches the turned box's
            const [along, across] = orientation === 'West' ? [xs, ys] : [ys, xs];
            const [from, size] = orientation === 'West' ? [left, box.width] : [top, box.height];

            expect(size).toBe(east.width);
            expect(Math.min(...along)).toBeCloseTo(from);
            expect(Math.max(...along)).toBeCloseTo(from + size);
            const [acrossFrom, acrossSize] = orientation === 'West' ? [top, box.height] : [left, box.width];
            expect(Math.min(...across)).toBeGreaterThanOrEqual(acrossFrom - 1e-9);
            expect(Math.max(...across)).toBeLessThanOrEqual(acrossFrom + acrossSize + 1e-9);
        });

        it('should be selected inside its turned box and not outside it', () => {
            const gate = create();
            gate.updateProperty('Orientation', 'South');
            const box = gate.getBoundingBox();
            const left = position.x + box.left, top = position.y + box.top;

            expect(gate.isSelected({ x: left + box.width / 2, y: top + box.height - 0.1 })).toBe(true);
            expect(gate.isSelected({ x: left - 0.1, y: top + box.height / 2 })).toBe(false);
            expect(gate.isSelected({ x: left + box.width / 2, y: top + box.height + 0.1 })).toBe(false);
        });

        it('should keep its position whichever way it faces', () => {
            const gate = create();

            for (const orientation of ['South', 'West', 'North', 'East']) gate.updateProperty('Orientation', orientation);

            expect(gate.position).toEqual(position);
        });
    });

    it.each([
        // the output pin of a two-input AND gate, at (6, 2) from the body when it faces east
        ['East', { x: 6, y: 2 }],
        ['South', { x: 3, y: 5 }],
        ['West', { x: 0, y: 2 }],
        ['North', { x: 3, y: -1 }],
    ])('should put a pin where the drawing puts it, facing %s', (orientation, pin) => {
        const gate = new gates.AndGate({ ...position }, 2);
        gate.updateProperty('Orientation', orientation);

        expect(gate.toDiagram({ x: position.x + 6, y: position.y + 2 })).toEqual({ x: position.x + pin.x, y: position.y + pin.y });
        // the output stub ends there
        expect(recordPath(gate)).toContainEqual({ x: position.x + pin.x, y: position.y + pin.y });
    });
});

describe('input nodes', () => {
    const multiInputGates: [string, (inputs: number) => gates.Gate][] = [
        ['AndGate', inputs => new gates.AndGate({ ...position }, inputs)],
        ['NandGate', inputs => new gates.NandGate({ ...position }, inputs)],
        ['OrGate', inputs => new gates.OrGate({ ...position }, inputs)],
        ['NorGate', inputs => new gates.NorGate({ ...position }, inputs)],
        ['XorGate', inputs => new gates.XorGate({ ...position }, inputs)],
        ['XnorGate', inputs => new gates.XnorGate({ ...position }, inputs)],
    ];
    const orientations = ['East', 'South', 'West', 'North'];

    describe.each(multiInputGates)('%s', (_, create) => {
        it.each([2, 5, 16])('should put each of %s input nodes at the end of its handle when it faces east', inputs => {
            const gate = create(inputs);

            expect(gate.inodes.map(node => node.position)).toEqual(
                gate.getInputHandlePositions().map(handleY => ({ x: position.x, y: position.y + handleY })));
        });

        it.each(orientations)('should put the input nodes at the ends of the handles it draws, facing %s', orientation => {
            const gate = create(7);
            gate.updateProperty('Orientation', orientation);
            const path = recordPath(gate);
            const box = gate.getBoundingBox();
            const left = position.x + box.left, top = position.y + box.top;
            // the back is the edge the inputs come in at
            const back: Partial<Point> = { East: { x: left }, West: { x: left + box.width }, South: { y: top }, North: { y: top + box.height } }[orientation]!;

            expect(gate.inodes).toHaveLength(7);
            for (const node of gate.inodes) {
                expect(path).toContainEqual(node.position);
                expect(node.position).toMatchObject(back);
            }
        });

        it('should keep the first input first, at the top when it faces east or west and at the right facing south', () => {
            const gate = create(3);
            const order = (axis: 'x' | 'y') => gate.inodes.map(node => node.position[axis]);

            expect(order('y')).toEqual([...order('y')].sort((a, b) => a - b));
            gate.updateProperty('Orientation', 'West');
            expect(order('y')).toEqual([...order('y')].sort((a, b) => a - b));
            gate.updateProperty('Orientation', 'South');
            expect(order('x')).toEqual([...order('x')].sort((a, b) => b - a));
            gate.updateProperty('Orientation', 'North');
            expect(order('x')).toEqual([...order('x')].sort((a, b) => a - b));
        });

        it('should move the same nodes when it turns or moves', () => {
            const gate = create(4);
            const inodes = [...gate.inodes];

            gate.updateProperty('Orientation', 'South');
            gate.position = { x: 20, y: 30 };

            expect(gate.inodes).toEqual(inodes);
            gate.inodes.forEach((node, i) => expect(node).toBe(inodes[i]));
            expect(gate.inodes.map(node => node.position)).toEqual(gate.inputNodePositions());
            expect(recordPath(gate)).toEqual(expect.arrayContaining(gate.inodes.map(node => node.position)));
        });

        it('should lay out new nodes for a new number of inputs, turned around its new box', () => {
            const gate = create(2);
            gate.updateProperty('Orientation', 'South');

            // 16 inputs reach above and below the body, so the box, and the middle it turns around, change too
            gate.updateProperty('Number of Inputs', 16);

            expect(gate.inodes).toHaveLength(16);
            const path = recordPath(gate);
            for (const node of gate.inodes) expect(path).toContainEqual(node.position);
            expect(new Set(gate.inodes.map(node => node.position.x)).size).toBe(16);
        });
    });
});

describe.each([
    ['NotGate', () => new gates.NotGate({ ...position })],
    ['Buffer', () => new gates.Buffer({ ...position })],
])('the input node of a %s', (_, create) => {
    it('should be at the end of its handle, in the middle of its back, when it faces east', () => {
        const gate = create();

        expect(gate.inodes).toHaveLength(1);
        expect(gate.inodes[0].position).toEqual({ x: position.x, y: position.y + 1 });
    });

    it.each([
        ['South', { x: 2, y: -1 }],
        ['West', { x: 4, y: 1 }],
        ['North', { x: 2, y: 3 }],
    ])('should be at the end of the handle it draws, facing %s', (orientation, end) => {
        const gate = create();
        const inode = gate.inodes[0];

        gate.updateProperty('Orientation', orientation);

        expect(gate.inodes[0]).toBe(inode);
        expect(inode.position).toEqual({ x: position.x + end.x, y: position.y + end.y });
        expect(recordPath(gate)).toContainEqual(inode.position);
    });

    it('should move with the gate', () => {
        const gate = create();

        gate.position = { x: 20, y: 30 };

        expect(gate.inodes[0].position).toEqual({ x: 20, y: 31 });
    });
});

describe('output nodes', () => {
    const allGates: [string, () => gates.Gate, Point][] = [
        // the end of the output stub when the gate faces east, from its position
        ['AndGate', () => new gates.AndGate({ ...position }, 2), { x: 6, y: 2 }],
        ['NandGate', () => new gates.NandGate({ ...position }, 16), { x: 6, y: 2 }],
        ['OrGate', () => new gates.OrGate({ ...position }, 7), { x: 6, y: 2 }],
        ['NorGate', () => new gates.NorGate({ ...position }, 3), { x: 6, y: 2 }],
        ['XorGate', () => new gates.XorGate({ ...position }, 4), { x: 6, y: 2 }],
        ['XnorGate', () => new gates.XnorGate({ ...position }, 25), { x: 6, y: 2 }],
        ['NotGate', () => new gates.NotGate({ ...position }), { x: 4, y: 1 }],
        ['Buffer', () => new gates.Buffer({ ...position }), { x: 4, y: 1 }],
    ];

    describe.each(allGates)('of a %s', (_, create, east) => {
        it('should be one node at the end of the output stub when it faces east', () => {
            const gate = create();

            expect(gate.onodes).toHaveLength(1);
            expect(gate.onodes[0].position).toEqual({ x: position.x + east.x, y: position.y + east.y });
            expect(recordPath(gate)).toContainEqual(gate.onodes[0].position);
        });

        it.each(['South', 'West', 'North'])('should be at the end of the output stub it draws, on the front of its box, facing %s', orientation => {
            const gate = create();
            const onode = gate.onodes[0];

            gate.updateProperty('Orientation', orientation);
            const box = gate.getBoundingBox();
            const left = position.x + box.left, top = position.y + box.top;
            // the front is the edge opposite the back the inputs come in at
            const front: Partial<Point> = { West: { x: left }, South: { y: top + box.height }, North: { y: top } }[orientation]!;

            expect(gate.onodes[0]).toBe(onode);
            expect(onode.position).toEqual(gate.toDiagram({ x: position.x + east.x, y: position.y + east.y }));
            expect(onode.position).toMatchObject(front);
            expect(recordPath(gate)).toContainEqual(onode.position);
        });

        it('should move with the gate', () => {
            const gate = create();
            gate.updateProperty('Orientation', 'North');

            gate.position = { x: 20, y: 30 };

            expect(gate.onodes[0].position).toEqual(gate.outputNodePositions()[0]);
            expect(recordPath(gate)).toContainEqual(gate.onodes[0].position);
        });
    });

    it('should stay at the end of the output stub when a turned gate grows its back', () => {
        const gate = new gates.OrGate({ ...position }, 2);
        gate.updateProperty('Orientation', 'South');
        const onode = gate.onodes[0];

        // the box grows above and below the body
        gate.updateProperty('Number of Inputs', 16);

        expect(gate.onodes[0]).toBe(onode);
        expect(onode.position).toEqual(gate.toDiagram({ x: position.x + 6, y: position.y + 2 }));
        expect(recordPath(gate)).toContainEqual(onode.position);
    });
});
