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
            const layer = buildMockLayer();
            expect(service.add(layer)).toBe(service);
        });

        it('should allow chaining multiple adds', () => {
            const layerA = buildMockLayer();
            const layerB = buildMockLayer();
            expect(() => service.add(layerA).add(layerB)).not.toThrow();
        });

        it('should increase layers length by 1', () => {
            const layer = buildMockLayer();
            const expectedLength = service['layers'].length + 1;
            service.add(layer);
            expect(service['layers'].length).toEqual(expectedLength);
        });

        it('should add correct layer instance', () => {
            const layer = buildMockLayer();
            expect(service.add(layer)['layers'].at(0)).toBe(layer);
        });
    });

    describe('remove', () => {
        it('should return the service instance for chaining', () => {
            const layer = buildMockLayer();
            service.add(layer);
            expect(service.remove(layer)).toBe(service);
        });

        it('should not call refresh on a removed layer after resize', () => {
            const layer = buildMockLayer();
            service.add(layer);
            service.remove(layer);
            service.resize(800, 600);
            expect(layer.refresh).not.toHaveBeenCalled();
        });

        it('should not throw when removing a layer that was never added', () => {
            const layer = buildMockLayer();
            expect(() => service.remove(layer)).not.toThrow();
        });

        it('should remove the correct layer', () => {
            const removedLayer = buildMockLayer();
            const anotherLayer = buildMockLayer();
            service.add(anotherLayer).add(removedLayer);
            expect(service.remove(removedLayer)['layers']).not.toContain(removedLayer);
        });

        it('should keep all layers except the removed layer', () => {
            const removedLayer = buildMockLayer();
            const anotherLayer = buildMockLayer();
            service.add(removedLayer).add(anotherLayer);
            expect(service.remove(removedLayer)['layers']).toContain(anotherLayer);
        });
    });

    describe('width / height', () => {
        it('should initialize width to 0', () => {
            expect(service.width).toBe(0);
        });

        it('should initialize height to 0', () => {
            expect(service.height).toBe(0);
        });

        it('should update width after resize', () => {
            service.resize(1000, 600);
            expect(service.width).toBe(1000);
        });

        it('should update height after resize', () => {
            service.resize(1000, 600);
            expect(service.height).toBe(600);
        });
    });

    describe('start', () => {
        it('should call requestAnimationFrame', () => {
            service.start();
            expect(window.requestAnimationFrame).toHaveBeenCalledTimes(1);
        });

        it('should scale all layer contexts by the device pixel ratio', () => {
            const dpr = window.devicePixelRatio || 1;
            const layerA = buildMockLayer();
            const layerB = buildMockLayer();
            service.add(layerA).add(layerB);
            service.start();

            expect(layerA.context!.scale).toHaveBeenCalledWith(dpr, dpr);
            expect(layerB.context!.scale).toHaveBeenCalledWith(dpr, dpr);
        });

        it('should warn and skip layers with a null context', () => {
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(vi.fn());
            const nullLayer = buildMockLayer({ context: null });
            service.add(nullLayer);
            service.start();

            expect(warnSpy).toHaveBeenCalledTimes(1);
            expect(nullLayer.context).toBeNull();
        });

        it('should warn and skip layers with an undefined context', () => {
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(vi.fn());
            const undefinedLayer = buildMockLayer({ context: undefined });
            service.add(undefinedLayer);
            service.start();

            expect(warnSpy).toHaveBeenCalledTimes(1);
        });
    });

    describe('stop', () => {
        it('should call cancelAnimationFrame with the animation id', () => {
            service.start();
            service.stop();
            expect(window.cancelAnimationFrame).toHaveBeenCalledWith(1);
        });

        it('should not call cancelAnimationFrame if start was never called', () => {
            service.stop();
            expect(window.cancelAnimationFrame).not.toHaveBeenCalled();
        });

        it('should not call cancelAnimationFrame if stop is called twice', () => {
            service.start();
            service.stop();
            service.stop();
            expect(window.cancelAnimationFrame).toHaveBeenCalledTimes(1);
        });
    });

    describe('scale', () => {
        it('should not throw when called', () => {
            expect(() => service.scale(0.1)).not.toThrow();
        });

        it('should affect the drawState passed to layers on the next refresh', () => {
            const layer = buildMockLayer();
            service.add(layer);
            service.scale(0.5);
            service.resize(800, 600); // resize triggers a refresh with current drawState

            const drawState = (layer.refresh as ReturnType<typeof vi.fn>).mock.calls[0][0];
            expect(drawState.scale).toBe(1.5);
        });
    });

    describe('resize', () => {
        it('should call resize on all layers with the new dimensions', () => {
            const layerA = buildMockLayer();
            const layerB = buildMockLayer();
            service.add(layerA).add(layerB);
            service.resize(1024, 768);

            expect(layerA.resize).toHaveBeenCalledWith(1024, 768);
            expect(layerB.resize).toHaveBeenCalledWith(1024, 768);
        });

        it('should call refresh on all layers after resize to prevent flickering', () => {
            const layerA = buildMockLayer();
            const layerB = buildMockLayer();
            service.add(layerA).add(layerB);
            service.resize(1024, 768);

            expect(layerA.refresh).toHaveBeenCalledTimes(1);
            expect(layerB.refresh).toHaveBeenCalledTimes(1);
        });

        it('should call resize before refresh on each layer', () => {
            const callOrder: string[] = [];
            const layer = buildMockLayer({
                resize: vi.fn(() => callOrder.push('resize')),
                refresh: vi.fn(() => callOrder.push('refresh')),
            });
            service.add(layer);
            service.resize(800, 600);

            expect(callOrder).toEqual(['resize', 'refresh']);
        });
    });
});