import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { RenderService } from './render.service';
import type { AbstractCanvasLayerComponent } from '../../components/canvas-layers/abstract-canvas-layer.component';

const buildMockLayer = (overrides = {}): AbstractCanvasLayerComponent => ({
    context: {
        scale: vi.fn(),
    } as unknown as CanvasRenderingContext2D,
    resize: vi.fn(),
    refresh: vi.fn(),
    width: 800,
    height: 600,
    ...overrides,
} as unknown as AbstractCanvasLayerComponent);

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

    it('should create', () => {
        expect(service).toBeTruthy();
    });

    describe('constants', () => {
        it('should expose THIN_LINE_WIDTH as 1', () => {
            expect(service.THIN_LINE_WIDTH).toBe(1);
        });

        it('should expose STANDARD_LINE_WIDTH as 2', () => {
            expect(service.STANDARD_LINE_WIDTH).toBe(2);
        });

        it('should expose BOLD_LINE_WIDTH as 4', () => {
            expect(service.BOLD_LINE_WIDTH).toBe(4);
        });
    });

    describe('add', () => {
        it('should return the service instance for chaining', () => {
            const layers = [buildMockLayer()];
            expect(service.add('diagramA', layers)).toBe(service);
        });

        it('should allow chaining multiple adds', () => {
            expect(() =>
                service
                    .add('diagramA', [buildMockLayer()])
                    .add('diagramB', [buildMockLayer()])
            ).not.toThrow();
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
        it('should return the service instance for chaining', () => {
            service.add('diagramA', [buildMockLayer()]);
            expect(service.remove('diagramA')).toBe(service);
        });

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
            expect(warnSpy).toHaveBeenCalledTimes(1);
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
            expect(warnSpy).toHaveBeenCalledTimes(1);
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

    describe('start', () => {
        it('should call requestAnimationFrame', () => {
            service.add('diagramA', [buildMockLayer()]);
            service.activeId = 'diagramA';
            service.start();
            expect(window.requestAnimationFrame).toHaveBeenCalledTimes(1);
        });

        it('should scale all active layer contexts by the device pixel ratio', () => {
            const dpr = window.devicePixelRatio || 1;
            const layerA = buildMockLayer();
            const layerB = buildMockLayer();
            service.add('diagramA', [layerA, layerB]);
            service.activeId = 'diagramA';
            service.start();

            expect(layerA.context!.scale).toHaveBeenCalledWith(dpr, dpr);
            expect(layerB.context!.scale).toHaveBeenCalledWith(dpr, dpr);
        });

        it('should warn and skip layers with a null context', () => {
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(vi.fn());
            const nullLayer = buildMockLayer({ context: null });
            service.add('diagramA', [nullLayer]);
            service.activeId = 'diagramA';
            service.start();

            expect(warnSpy).toHaveBeenCalledTimes(1);
            expect(nullLayer.context).toBeNull();
        });

        it('should warn and skip layers with an undefined context', () => {
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(vi.fn());
            const undefinedLayer = buildMockLayer({ context: undefined });
            service.add('diagramA', [undefinedLayer]);
            service.activeId = 'diagramA';
            service.start();

            expect(warnSpy).toHaveBeenCalledTimes(1);
        });

        it('should not scale layers from inactive diagrams', () => {
            const inactiveLayer = buildMockLayer();
            const activeLayer = buildMockLayer();
            service.add('diagramA', [inactiveLayer]);
            service.add('diagramB', [activeLayer]);
            service.activeId = 'diagramB';
            service.start();

            expect(inactiveLayer.context!.scale).not.toHaveBeenCalled();
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

    describe('scaleActiveDiagram', () => {
        it('should not throw when called', () => {
            expect(() => service.scaleActiveDiagram(0.1)).not.toThrow();
        });

        it('should affect the drawState passed to layers on the next resize+refresh', () => {
            const layer = buildMockLayer();
            service.add('diagramA', [layer]);
            service.activeId = 'diagramA';
            service.scaleActiveDiagram(0.5);
            service.resizeActiveDiagram(800, 600);

            const drawState = (layer.refresh as ReturnType<typeof vi.fn>).mock.calls[0][0];
            expect(drawState.scale).toBe(1.5);
        });
    });

    describe('resizeActiveDiagram', () => {
        it('should call resize on all active layers with the new dimensions', () => {
            const layerA = buildMockLayer();
            const layerB = buildMockLayer();
            service.add('diagramA', [layerA, layerB]);
            service.activeId = 'diagramA';
            service.resizeActiveDiagram(1024, 768);

            expect(layerA.resize).toHaveBeenCalledWith(1024, 768);
            expect(layerB.resize).toHaveBeenCalledWith(1024, 768);
        });

        it('should call refresh on all active layers after resize to prevent flickering', () => {
            const layerA = buildMockLayer();
            const layerB = buildMockLayer();
            service.add('diagramA', [layerA, layerB]);
            service.activeId = 'diagramA';
            service.resizeActiveDiagram(1024, 768);

            expect(layerA.refresh).toHaveBeenCalledTimes(1);
            expect(layerB.refresh).toHaveBeenCalledTimes(1);
        });

        it('should call resize before refresh on each layer', () => {
            const callOrder: string[] = [];
            const layer = buildMockLayer({
                resize: vi.fn(() => callOrder.push('resize')),
                refresh: vi.fn(() => callOrder.push('refresh')),
            });
            service.add('diagramA', [layer]);
            service.activeId = 'diagramA';
            service.resizeActiveDiagram(800, 600);

            expect(callOrder).toEqual(['resize', 'refresh']);
        });

        it('should not call resize or refresh on layers from inactive diagrams', () => {
            const inactiveLayer = buildMockLayer();
            const activeLayer = buildMockLayer();
            service.add('diagramA', [inactiveLayer]);
            service.add('diagramB', [activeLayer]);
            service.activeId = 'diagramB';
            service.resizeActiveDiagram(800, 600);

            expect(inactiveLayer.resize).not.toHaveBeenCalled();
            expect(inactiveLayer.refresh).not.toHaveBeenCalled();
        });
    });
});