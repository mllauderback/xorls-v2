import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { RenderService } from './render.service';
import { canvasToDiagram, diagramToCanvas } from './view-transform';
import { DEFAULT_GRID_SPACING } from '../../store/settings/feature';
import type { AbstractCanvasLayerComponent } from '../../components/canvas-layers/abstract-canvas-layer.component';
import type { Drawable, DrawState } from '../../models/Drawable';

function buildMockLayer(overrides = {}): AbstractCanvasLayerComponent {
    return ({
        context: {
            scale: vi.fn(),
        } as unknown as CanvasRenderingContext2D,
        resize: vi.fn(),
        refresh: vi.fn(),
        width: 800,
        height: 600,
        ...overrides,
    } as unknown as AbstractCanvasLayerComponent);
}

describe('RenderService', () => {
    let service: RenderService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(RenderService);

        vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => {
            return 1; // return a fake animation id without invoking the callback
        });
        vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(vi.fn());
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('add', () => {
        it('should return the service instance from add and remove, for chaining', () => {
            expect(service.add('diagramA', [buildMockLayer()]).add('diagramB', [buildMockLayer()]).remove('diagramA')).toBe(service);
        });

        it('should register the layers under the given id', () => {
            const layers = [buildMockLayer(), buildMockLayer()];
            service.add('diagramA', layers);
            expect(service['diagramsCanvasLayerMap'].get('diagramA')).toBe(layers);
        });

        it('should overwrite layers when the same id is added twice', () => {
            const original = [buildMockLayer()];
            const replacement = [buildMockLayer(), buildMockLayer()];
            service.add('diagramA', original).add('diagramA', replacement);
            expect(service['diagramsCanvasLayerMap'].get('diagramA')).toBe(replacement);
        });
    });

    describe('remove', () => {
        it('should remove the entry for the given id', () => {
            service.add('diagramA', [buildMockLayer()]);
            service.remove('diagramA');
            expect(service['diagramsCanvasLayerMap'].has('diagramA')).toBe(false);
        });

        it('should keep other diagram entries when removing one id', () => {
            service.add('diagramA', [buildMockLayer()]);
            service.add('diagramB', [buildMockLayer()]);
            service.remove('diagramA');
            expect(service['diagramsCanvasLayerMap'].has('diagramB')).toBe(true);
        });

        it('should warn when removing an id that was never added', () => {
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(vi.fn());
            service.remove('nonexistent');
            expect(warnSpy).toHaveBeenCalledTimes(2);
        });
    });

    describe('activeId', () => {
        it('should initialize activeId to an empty string', () => {
            expect(service.activeId).toBe('');
        });

        it('should update activeId after setting it', () => {
            service.add('diagramA', [buildMockLayer()]);
            service.activeId = 'diagramA';
            expect(service.activeId).toBe('diagramA');
        });

        it('should set activeLayers to the layers registered under the given id', () => {
            const layers = [buildMockLayer(), buildMockLayer()];
            service.add('diagramA', layers);
            service.activeId = 'diagramA';
            expect(service['activeLayers']).toBe(layers);
        });

        it('should set activeLayers to an empty array when the id is not registered', () => {
            service.activeId = 'nonexistent';
            expect(service['activeLayers']).toEqual([]);
        });

        it('should warn when setting an id that is not registered', () => {
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(vi.fn());
            service.activeId = 'nonexistent';
            expect(warnSpy).toHaveBeenCalledTimes(2);
        });
    });

    describe('getActiveDiagramWidth', () => {
        it('should return -1 when no active diagram is set', () => {
            expect(service.getActiveDiagramWidth()).toBe(-1);
        });

        it('should return -1 when the active id is not registered', () => {
            service.activeId = 'nonexistent';
            expect(service.getActiveDiagramWidth()).toBe(-1);
        });

        it('should return the width of the first layer in the active diagram', () => {
            const layer = buildMockLayer({ width: 1280 });
            service.add('diagramA', [layer]);
            service.activeId = 'diagramA';
            expect(service.getActiveDiagramWidth()).toBe(1280);
        });
    });

    describe('getActiveDiagramHeight', () => {
        it('should return -1 when no active diagram is set', () => {
            expect(service.getActiveDiagramHeight()).toBe(-1);
        });

        it('should return -1 when the active id is not registered', () => {
            service.activeId = 'nonexistent';
            expect(service.getActiveDiagramHeight()).toBe(-1);
        });

        it('should return the height of the first layer in the active diagram', () => {
            const layer = buildMockLayer({ height: 960 });
            service.add('diagramA', [layer]);
            service.activeId = 'diagramA';
            expect(service.getActiveDiagramHeight()).toBe(960);
        });
    });

    describe('drawDrawables', () => {
        const drawState: DrawState = { origin: { x: 0, y: 0 }, scale: 1, version: 0 };
        const LAYER_STYLE = { strokeStyle: 'blue', lineWidth: 4 };

        /** Records the stroke style, alpha and width that were active when each drawable drew. */
        function buildContext() {
            const ctx = {
                strokeStyle: '',
                lineWidth: 0,
                globalAlpha: 1,
                beginPath: vi.fn(),
                stroke: vi.fn(),
            };
            return ctx as typeof ctx & OffscreenCanvasRenderingContext2D;
        }
        function buildDrawable(ctx: { strokeStyle: unknown, globalAlpha: number, lineWidth: number }, isGhost?: boolean) {
            const seen: { strokeStyle: unknown, globalAlpha: number, lineWidth: number }[] = [];
            const drawable = {
                draw: vi.fn(() => seen.push({ strokeStyle: ctx.strokeStyle, globalAlpha: ctx.globalAlpha, lineWidth: ctx.lineWidth })),
                ...(isGhost === undefined ? {} : { isGhost }),
            } as unknown as Drawable;
            return { drawable, seen };
        }

        it('should draw a non-ghost drawable in the layer style', () => {
            const ctx = buildContext();
            const { drawable, seen } = buildDrawable(ctx, false);

            service.drawDrawables(ctx, [drawable], drawState, LAYER_STYLE);

            expect(seen).toEqual([{ strokeStyle: 'blue', globalAlpha: 1, lineWidth: 4 }]);
        });

        it('should draw a drawable that is not ghostable in the layer style', () => {
            const ctx = buildContext();
            const { drawable, seen } = buildDrawable(ctx);

            service.drawDrawables(ctx, [drawable], drawState, LAYER_STYLE);

            expect(seen).toEqual([{ strokeStyle: 'blue', globalAlpha: 1, lineWidth: 4 }]);
        });

        it('should draw a ghost in the ghost style instead of the layer style, keeping the line width', () => {
            const ctx = buildContext();
            const { drawable, seen } = buildDrawable(ctx, true);

            service.drawDrawables(ctx, [drawable], drawState, LAYER_STYLE);

            expect(seen).toEqual([{ strokeStyle: service.GHOST_STROKE_STYLE, globalAlpha: service.GHOST_ALPHA, lineWidth: 4 }]);
            expect(service.GHOST_ALPHA).toBeLessThan(1);
        });

        it('should stroke ghosts and non-ghosts separately and restore full alpha afterwards', () => {
            const ctx = buildContext();
            const solid = buildDrawable(ctx, false);
            const ghost = buildDrawable(ctx, true);

            service.drawDrawables(ctx, [ghost.drawable, solid.drawable], drawState, LAYER_STYLE);

            expect(ctx.stroke).toHaveBeenCalledTimes(2);
            expect(solid.seen[0].strokeStyle).toBe('blue');
            expect(ghost.seen[0].strokeStyle).toBe(service.GHOST_STROKE_STYLE);
            expect(ctx.globalAlpha).toBe(1);
        });

        it('should give the line width in canvas pixels, converted to diagram units, whatever the scale', () => {
            const ctx = buildContext();
            const solid = buildDrawable(ctx, false);
            const ghost = buildDrawable(ctx, true);
            const scaled: DrawState = { origin: { x: 0, y: 0 }, scale: 20, version: 0 };

            service.drawDrawables(ctx, [ghost.drawable, solid.drawable], scaled, LAYER_STYLE);

            // 4px with 20px cells is a fifth of a cell
            expect(solid.seen[0].lineWidth).toBeCloseTo(4 / 20);
            expect(ghost.seen[0].lineWidth).toBeCloseTo(4 / 20);
        });

        it('should pass the draw state to each drawable', () => {
            const ctx = buildContext();
            const { drawable } = buildDrawable(ctx, true);

            service.drawDrawables(ctx, [drawable], drawState, LAYER_STYLE);

            expect(drawable.draw).toHaveBeenCalledWith(ctx, drawState);
        });

        it('should not touch the context when there is nothing to draw', () => {
            const ctx = buildContext();

            service.drawDrawables(ctx, [], drawState, LAYER_STYLE);

            expect(ctx.beginPath).not.toHaveBeenCalled();
            expect(ctx.stroke).not.toHaveBeenCalled();
        });
    });

    describe('start', () => {
        it('should call requestAnimationFrame', () => {
            service.add('diagramA', [buildMockLayer()]);
            service.activeId = 'diagramA';
            service.start();
            expect(window.requestAnimationFrame).toHaveBeenCalledTimes(1);
        });

        it('should leave the layer contexts alone: layers set their own transform each time they draw', () => {
            const layerA = buildMockLayer();
            const layerB = buildMockLayer();
            service.add('diagramA', [layerA, layerB]);
            service.activeId = 'diagramA';
            service.start();

            expect(layerA.context!.scale).not.toHaveBeenCalled();
            expect(layerB.context!.scale).not.toHaveBeenCalled();
        });

        it('should start even when a layer has no context yet', () => {
            const nullLayer = buildMockLayer({ context: null });
            service.add('diagramA', [nullLayer]);
            service.activeId = 'diagramA';

            expect(() => service.start()).not.toThrow();
            expect(window.requestAnimationFrame).toHaveBeenCalledTimes(1);
        });
    });

    describe('stop', () => {
        it('should call cancelAnimationFrame with the animation id', () => {
            service.add('diagramA', [buildMockLayer()]);
            service.activeId = 'diagramA';
            service.start();
            service.stop();
            expect(window.cancelAnimationFrame).toHaveBeenCalledWith(1);
        });

        it('should not call cancelAnimationFrame if start was never called', () => {
            service.stop();
            expect(window.cancelAnimationFrame).not.toHaveBeenCalled();
        });

        it('should not call cancelAnimationFrame if stop is called twice', () => {
            service.add('diagramA', [buildMockLayer()]);
            service.activeId = 'diagramA';
            service.start();
            service.stop();
            service.stop();
            expect(window.cancelAnimationFrame).toHaveBeenCalledTimes(1);
        });
    });

    describe('zoomActiveDiagram', () => {
        beforeEach(() => {
            service.add('diagramA', [buildMockLayer()]);
            service.activeId = 'diagramA';
        });

        function canvasPointOf(diagramPoint: { x: number, y: number }) {
            return diagramToCanvas(service.activeViewTransform!, diagramPoint);
        }

        function expectWithinHalfAPixel(actual: { x: number, y: number }, expected: { x: number, y: number }) {
            expect(Math.abs(actual.x - expected.x)).toBeLessThanOrEqual(0.5);
            expect(Math.abs(actual.y - expected.y)).toBeLessThanOrEqual(0.5);
        }

        it('should zoom, keeping the diagram point at the canvas point there within half a pixel', () => {
            const at = { x: 267.4, y: -84 };
            const under = canvasToDiagram(service.activeViewTransform!, at);

            service.zoomActiveDiagram(2.3, at);

            expect(service.activeViewTransform!.zoom).toBe(2.3);
            expect(service.activeViewTransform!.scale).toBe(46);
            expectWithinHalfAPixel(canvasPointOf(under), at);
        });

        it('should move the origin by whole pixels, so the grid stays on whole pixels', () => {
            service.zoomActiveDiagram(1.37, { x: 146.2, y: 58 });

            const { origin } = service.activeViewTransform!;
            expect(Number.isInteger(origin.x)).toBe(true);
            expect(Number.isInteger(origin.y)).toBe(true);
        });

        describe('over a long scroll with the pointer held still', () => {
            // like the controller: a pointer held still is at exactly the same canvas point for every scroll
            const pointer = { x: 437, y: 191 };
            const first = { x: 437 / DEFAULT_GRID_SPACING, y: 191 / DEFAULT_GRID_SPACING }; // under it at the start

            it('should keep the first point under the pointer within half a pixel, zooming in and back out', () => {
                for (let i = 1; i <= 50; i++) {
                    service.zoomActiveDiagram(1 + i * 0.03, pointer);
                    expectWithinHalfAPixel(canvasPointOf(first), pointer);
                }
                for (let i = 49; i >= 0; i--) service.zoomActiveDiagram(1 + i * 0.03, pointer);

                // back at the start: exactly where it was
                expect(service.activeViewTransform!.scale).toBe(DEFAULT_GRID_SPACING);
                expect(canvasPointOf(first)).toEqual(pointer);
            });

            it('should start again from what is under the pointer once the pointer moves', () => {
                service.zoomActiveDiagram(1.5, pointer);
                const moved = { x: 101, y: 57 };
                const under = canvasToDiagram(service.activeViewTransform!, moved);

                service.zoomActiveDiagram(2.2, moved);

                expectWithinHalfAPixel(canvasPointOf(under), moved);
            });

            it('should start again once something else changes the view in between', () => {
                service.zoomActiveDiagram(1.5, pointer);
                service.setGridScale(30); // 45px cells now
                const under = canvasToDiagram(service.activeViewTransform!, pointer);

                service.zoomActiveDiagram(2, pointer);

                expectWithinHalfAPixel(canvasPointOf(under), pointer);
            });

            it('should start again on another diagram, at the same canvas point', () => {
                service.zoomActiveDiagram(1.5, pointer);
                service.add('diagramB', [buildMockLayer()]);
                service.activeId = 'diagramB';
                service.activeViewTransform!.shiftOrigin(-300, -120);
                const under = canvasToDiagram(service.activeViewTransform!, pointer);

                service.zoomActiveDiagram(2, pointer);

                expectWithinHalfAPixel(canvasPointOf(under), pointer);
            });
        });

        it('should leave the origin and version alone for a zoom too small to change the drawn scale', () => {
            const { version } = service.activeViewTransform!;

            service.zoomActiveDiagram(1.01, { x: 600, y: 600 });

            expect(service.activeViewTransform!.origin).toEqual({ x: 0, y: 0 });
            expect(service.activeViewTransform!.version).toBe(version);
        });

        it('should keep the origin where it is when zooming around it', () => {
            service.zoomActiveDiagram(3, { x: 0, y: 0 });

            expect(service.activeViewTransform!.origin).toEqual({ x: 0, y: 0 });
        });

        it('should do nothing without an active diagram', () => {
            vi.spyOn(console, 'warn').mockImplementation(vi.fn());
            service.activeId = 'unregistered';

            expect(() => service.zoomActiveDiagram(2, { x: 1, y: 1 })).not.toThrow();
        });
    });

    describe('setGridScale', () => {
        it('should scale every diagram and bump their versions', () => {
            service.add('diagramA', [buildMockLayer()]);
            service.add('diagramB', [buildMockLayer()]);

            service.setGridScale(2);

            for (const id of ['diagramA', 'diagramB']) {
                service.activeId = id;
                expect(service.activeViewTransform!.scale).toBe(2);
                expect(service.activeViewTransform!.version).toBe(1);
            }
        });

        it('should scale diagrams added afterwards', () => {
            service.setGridScale(2);
            service.add('diagramA', [buildMockLayer()]);
            service.activeId = 'diagramA';

            expect(service.activeViewTransform!.gridScale).toBe(2);
            expect(service.activeViewTransform!.scale).toBe(2);
        });

        it('should keep the zoom', () => {
            service.add('diagramA', [buildMockLayer()]);
            service.activeId = 'diagramA';
            service.zoomActiveDiagram(1.5, { x: 0, y: 0 });

            service.setGridScale(2);

            expect(service.activeViewTransform!.zoom).toBe(1.5);
            expect(service.activeViewTransform!.scale).toBe(3);
        });

        it('should zoom by the offset, not by the offset times the grid scale', () => {
            service.add('diagramA', [buildMockLayer()]);
            service.activeId = 'diagramA';
            service.setGridScale(2);

            service.zoomActiveDiagram(1.5, { x: 0, y: 0 });

            expect(service.activeViewTransform!.zoom).toBe(1.5);
            expect(service.activeViewTransform!.scale).toBe(3);
        });
    });

    describe('resizeActiveDiagram', () => {
        it('should not scale the layer contexts (scaling on every resize would compound)', () => {
            const layerA = buildMockLayer();
            const layerB = buildMockLayer();
            service.add('diagramA', [layerA, layerB]);
            service.activeId = 'diagramA';
            service.resizeActiveDiagram(1024, 768);

            expect(layerA.context!.scale).not.toHaveBeenCalled();
            expect(layerB.context!.scale).not.toHaveBeenCalled();
        });

        it('should resize every active layer to the new dimensions, then refresh it once to prevent flickering', () => {
            const callOrder: string[] = [];
            const [layerA, layerB] = ['A', 'B'].map(name => buildMockLayer({
                resize: vi.fn(() => callOrder.push(`resize ${name}`)),
                refresh: vi.fn(() => callOrder.push(`refresh ${name}`)),
            }));
            service.add('diagramA', [layerA, layerB]);
            service.activeId = 'diagramA';
            service.resizeActiveDiagram(1024, 768);

            expect(layerA.resize).toHaveBeenCalledWith(1024, 768);
            expect(layerB.resize).toHaveBeenCalledWith(1024, 768);
            expect(callOrder.filter(call => call.endsWith('A'))).toEqual(['resize A', 'refresh A']);
            expect(callOrder.filter(call => call.endsWith('B'))).toEqual(['resize B', 'refresh B']);
        });

        it('should refresh with the active diagram\'s view transform', () => {
            const layer = buildMockLayer();
            service.add('diagramA', [layer]);
            service.activeId = 'diagramA';
            service.resizeActiveDiagram(800, 600);

            expect(layer.refresh).toHaveBeenCalledWith(service.activeViewTransform);
        });

        it('should not throw when a layer context is null during resize', () => {
            const nullLayer = buildMockLayer({ context: null });
            service.add('diagramA', [nullLayer]);
            service.activeId = 'diagramA';

            expect(() => service.resizeActiveDiagram(800, 600)).not.toThrow();
        });

        it('should not call resize, refresh, or scale context on layers from inactive diagrams', () => {
            const inactiveLayer = buildMockLayer();
            const activeLayer = buildMockLayer();
            service.add('diagramA', [inactiveLayer]);
            service.add('diagramB', [activeLayer]);
            service.activeId = 'diagramB';
            service.resizeActiveDiagram(800, 600);

            expect(inactiveLayer.resize).not.toHaveBeenCalled();
            expect(inactiveLayer.refresh).not.toHaveBeenCalled();
            expect(inactiveLayer.context!.scale).not.toHaveBeenCalled();
        });
    });

    describe('view transform', () => {
        /** A layer the size of the given viewport plus 100px all round, panned so the viewport is in its middle. */
        function buildPannableLayer(offset = { x: -100, y: -100 }) {
            const layer = buildMockLayer({ width: 800, height: 600, viewportOffset: { ...offset } });
            const mock = layer as unknown as { viewportOffset: { x: number, y: number }, width: number, height: number };
            Object.assign(layer, {
                shiftViewportOffsetBy: vi.fn((dx: number, dy: number) => {
                    mock.viewportOffset.x += dx;
                    mock.viewportOffset.y += dy;
                }),
                resize: vi.fn((w: number, h: number) => { mock.width = w; mock.height = h; }),
            });
            return layer;
        }
        const VIEWPORT = { width: 600, height: 400 };

        it('should give each diagram its own view transform at the origin with no zoom', () => {
            service.add('diagramA', [buildMockLayer()]).add('diagramB', [buildMockLayer()]);
            service.activeId = 'diagramA';
            const a = service.activeViewTransform!;
            service.activeId = 'diagramB';
            const b = service.activeViewTransform!;

            expect(a).not.toBe(b);
            expect(a.origin).toEqual({ x: 0, y: 0 });
            expect(a.zoom).toBe(1);
        });

        it('should start each diagram at the default grid spacing: that many pixels per cell', () => {
            service.add('diagramA', [buildMockLayer()]);
            service.activeId = 'diagramA';

            expect(service.activeViewTransform!.gridScale).toBe(DEFAULT_GRID_SPACING);
            expect(service.activeViewTransform!.scale).toBe(DEFAULT_GRID_SPACING);
        });

        it('should leave the view transform alone when panning within the canvas, so panning stays cheap', () => {
            const layer = buildPannableLayer();
            service.add('diagramA', [layer]);
            service.activeId = 'diagramA';
            const before = service.activeViewTransform!.version;

            service.panActiveDiagram(10, 10, VIEWPORT.width, VIEWPORT.height);

            expect(service.activeViewTransform!.version).toBe(before);
            expect(service.activeViewTransform!.origin).toEqual({ x: 0, y: 0 });
            expect(layer.resize).not.toHaveBeenCalled();
        });

        it('should move the origin, and bump the version, when the layers grow to the left', () => {
            const layer = buildPannableLayer({ x: -5, y: -100 });
            service.add('diagramA', [layer]);
            service.activeId = 'diagramA';
            const before = service.activeViewTransform!.version;

            service.panActiveDiagram(10, 0, VIEWPORT.width, VIEWPORT.height); // the canvas's left edge comes into view

            expect(service.activeViewTransform!.origin).toEqual({ x: 500, y: 0 });
            expect(service.activeViewTransform!.version).toBe(before + 1);
            expect(layer.resize).toHaveBeenCalledWith(1300, 600);
            expect(layer.refresh).toHaveBeenCalledWith(service.activeViewTransform);
        });

        it('should bump the version once when the layers grow left and up together', () => {
            service.add('diagramA', [buildPannableLayer({ x: -5, y: -5 })]);
            service.activeId = 'diagramA';
            const before = service.activeViewTransform!.version;

            service.panActiveDiagram(10, 10, VIEWPORT.width, VIEWPORT.height);

            expect(service.activeViewTransform!.origin).toEqual({ x: 500, y: 500 });
            expect(service.activeViewTransform!.version).toBe(before + 1);
        });

        it('should not move the origin when the layers only grow to the right or down', () => {
            service.add('diagramA', [buildPannableLayer({ x: -195, y: -195 })]);
            service.activeId = 'diagramA';
            const before = service.activeViewTransform!.version;

            service.panActiveDiagram(-10, -10, VIEWPORT.width, VIEWPORT.height); // right and bottom edges come into view

            expect(service.activeViewTransform!.origin).toEqual({ x: 0, y: 0 });
            expect(service.activeViewTransform!.version).toBe(before);
        });

        it('should bump the version when zooming', () => {
            service.add('diagramA', [buildMockLayer()]);
            service.activeId = 'diagramA';
            const before = service.activeViewTransform!.version;

            service.zoomActiveDiagram(1.5, { x: 0, y: 0 });

            expect(service.activeViewTransform!.zoom).toBe(1.5);
            expect(service.activeViewTransform!.scale).toBe(1.5 * DEFAULT_GRID_SPACING);
            expect(service.activeViewTransform!.version).toBe(before + 1);
        });
    });
});