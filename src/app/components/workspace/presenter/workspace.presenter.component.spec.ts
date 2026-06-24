import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { describe, beforeEach, it, expect, vi } from 'vitest';

import { WorkspacePresenterComponent } from './workspace.presenter.component';
import { RenderService } from '../../../services/render/render.service';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { GridCanvasLayerComponent } from '../../canvas-layers/grid-canvas-layer/grid-canvas-layer.component';
import { AbstractCanvasLayerComponent } from '../../canvas-layers/abstract-canvas-layer.component';
import { ComponentCanvasLayerComponent } from '../../canvas-layers/component-canvas-layer/component-canvas-layer.component';
import { IOCanvasLayerComponent } from '../../canvas-layers/io-canvas-layer/io-canvas-layer.component';
import { WireCanvasLayerComponent } from '../../canvas-layers/wire-canvas-layer/wire-canvas-layer.component';
import { ActiveComponentCanvasLayerComponent } from '../../canvas-layers/active-component-canvas-layer/active-component-canvas-layer.component';
import { ActiveWireCanvasLayerComponent } from '../../canvas-layers/active-wire-canvas-layer/active-wire-canvas-layer.component';

const mockObserve = vi.fn();
const mockUnobserve = vi.fn();
const mockDisconnect = vi.fn();

describe('WorkspacePresenterComponent', () => {
    let component: WorkspacePresenterComponent;
    let fixture: ComponentFixture<WorkspacePresenterComponent>;
    const layerCount = 6;
    const initialWidth = 800;
    const initialHeight = 600;
    const mockRenderService = {
        width: initialWidth,
        height: initialHeight,
        add: vi.fn().mockReturnThis(),    // returns `this` so chaining works: .add().add()
        remove: vi.fn().mockReturnThis(),
        start: vi.fn(),
        stop: vi.fn(),
        resize: vi.fn(),
    };
    let capturedCallback: ResizeObserverCallback;
    vi.stubGlobal('ResizeObserver', vi.fn().mockImplementation((cb) => {
        capturedCallback = cb;
        return {
            observe: mockObserve,
            unobserve: mockUnobserve,
            disconnect: mockDisconnect,
        }
    }));
    const buildEntry = (width: number, height: number): ResizeObserverEntry => ({
        contentRect: { width, height } as DOMRectReadOnly
    } as ResizeObserverEntry);

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [
                WorkspacePresenterComponent,
                AbstractCanvasLayerComponent
            ],
            providers: [
                { provide: RenderService, useValue: mockRenderService }
            ],
            schemas: [NO_ERRORS_SCHEMA]
        }).compileComponents();

        vi.clearAllMocks();
        mockRenderService.width = initialWidth;
        mockRenderService.height = initialHeight;

        fixture = TestBed.createComponent(WorkspacePresenterComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    describe('Create viewports and canvases', () => {
        it('should render contentViewport', () => {
            expect(component.viewport).toBeTruthy();
        });

        it('should render grid canvas layer', () => {
            expect(component.gridCanvasLayerComponent).toBeTruthy();
        });

        it('should render component canvas layer', () => {
            expect(component.componentCanvasLayerComponent).toBeTruthy();
        });

        it('should render io canvas layer', () => {
            expect(component.ioCanvasLayerComponent).toBeTruthy();
        });

        it('should render wire canvas layer', () => {
            expect(component.wireCanvasLayerComponent).toBeTruthy();
        });

        it('should render active component canvas layer', () => {
            expect(component.activeComponentCanvasLayerComponent).toBeTruthy();
        });

        it('should render active wire canvas layer', () => {
            expect(component.activeWireCanvasLayerComponent).toBeTruthy();
        });
    });

    describe('Viewport and canvas layer object types', () => {
        it('should have grid be a GridCanvasLayerComponent object', () => {
            // expect(component.gridCanvasLayerComponent).toBeInstanceOf(MockGridCanvasLayerComponent);
            expect(component.gridCanvasLayerComponent).toBeInstanceOf(GridCanvasLayerComponent);
        });

        it('should have component be a ComponentCanvasLayerComponent object', () => {
            expect(component.componentCanvasLayerComponent).toBeInstanceOf(ComponentCanvasLayerComponent)
        });

        it('should have io be an IOCanvasLayerComponent object', () => {
            expect(component.ioCanvasLayerComponent).toBeInstanceOf(IOCanvasLayerComponent);
        });

        it('should have wire be a WireCanvasLayerComponent object', () => {
            expect(component.wireCanvasLayerComponent).toBeInstanceOf(WireCanvasLayerComponent);
        });

        it('should have activeComponent be an ActiveComponentCanvasLayerComponent object', () => {
            expect(component.activeComponentCanvasLayerComponent).toBeInstanceOf(ActiveComponentCanvasLayerComponent);
        });

        it('should have activeWire be an ActiveWireCanvasLayerComponent', () => {
            expect(component.activeWireCanvasLayerComponent).toBeInstanceOf(ActiveWireCanvasLayerComponent);
        });
    });

    // TODO:    remove these tests for now.  In the future, tabs will be dynamically polulated and will be easier to property unit test.
    //          e2e tests will serve the layout far better than unit tests anyways
    
    // describe('Layout structure', () => {
    //     // it('content viewport should have width and height of parent', () => {
    //     //     expect(component.viewport?.nativeElement.classList).toContain('h-full');
    //     //     expect(component.viewport?.nativeElement.classList).toContain('w-full');
    //     // });

    //     it('should render tab view element', () => {
    //         const tabview = fixture.debugElement.query(By.directive(XorlsTabviewComponent));
    //         expect(tabview).toBeTruthy();
    //     });

    //     it('should render app-draggable-tab', () => {
    //         const tab = fixture.debugElement.query(By.directive(MockDraggableTabComponent));
    //         expect(tab).toBeTruthy();
    //     });

    //     it('should pass the correct header input', () => {
    //         const tab = fixture.debugElement.query(
    //             By.directive(MockDraggableTabComponent)
    //         ).componentInstance as MockDraggableTabComponent;

    //         expect(tab.header).toBe('Tab One');
    //     });

    //     it('should render projected content inside the tab', () => {
    //         const content = fixture.debugElement.query(By.css('.tab-one-content'));
    //         expect(content).toBeTruthy();
    //         expect(content.nativeElement.textContent).toBe('Tab one content');
    //     });
    // });

    describe('onViewportResize', () => {
        it('should call resize when viewport is wider than current render width', () => {
            mockRenderService.width = initialWidth;
            capturedCallback([buildEntry(initialWidth + 1, initialHeight)], null!);
            expect(mockRenderService.resize).toHaveBeenCalled();
        });

        it('should not call resize when viewport is narrower than current render width', () => {
            mockRenderService.width = initialWidth;
            capturedCallback([buildEntry(initialWidth - 1, initialHeight)], null!);
            expect(mockRenderService.resize).not.toHaveBeenCalled();
        });

        it('should not call resize when viewport is the same as current render dimensions', () => {
            mockRenderService.width = initialWidth;
            mockRenderService.height = initialHeight;
            capturedCallback([buildEntry(initialWidth, initialHeight)], null!);
            expect(mockRenderService.resize).not.toHaveBeenCalled();
        });

        it('should call resize when viewport is taller than current render height', () => {
            mockRenderService.height = initialHeight;
            capturedCallback([buildEntry(initialWidth, initialHeight + 1)], null!);
            expect(mockRenderService.resize).toHaveBeenCalled();
        });

        it('should not call resize when viewport is shorter than current render height', () => {
            mockRenderService.height = initialHeight;
            capturedCallback([buildEntry(initialWidth, initialHeight - 1)], null!);
            expect(mockRenderService.resize).not.toHaveBeenCalled();
        });

        it('should grow width when viewport is wider than current render width', () => {
            mockRenderService.width = initialWidth;
            capturedCallback([buildEntry(initialWidth + 1, initialHeight)], null!);
            const [newWidth, newHeight] = mockRenderService.resize.mock.calls[0];
            expect(newHeight).toBe(initialHeight);
            expect(newWidth).toBeGreaterThan(initialWidth);
        });

        it('should grow height when viewport is taller than current render height', () => {
            mockRenderService.height = initialHeight;
            capturedCallback([buildEntry(initialWidth, initialHeight + 1)], null!);
            const [newWidth, newHeight] = mockRenderService.resize.mock.calls[0];
            expect(newWidth).toBe(initialWidth);
            expect(newHeight).toBeGreaterThan(initialHeight);
        });
    });

    describe('Resize observer', () => {
        it('should observe contentViewport element for resizing', () => {
            expect(mockObserve).toHaveBeenCalledWith(component.viewport?.nativeElement);
        });

        it('should disconnect on destroy', () => {
            fixture.destroy();
            expect(mockDisconnect).toHaveBeenCalledOnce();
        });
    });

    describe('Render service', () => {
        it('should start render service', () => {
            expect(mockRenderService.start).toHaveBeenCalledOnce();
        });

        // this really should verify that the added render service are the right objects
        it('should add all layers to render service', () => {
            expect(mockRenderService.add).toHaveBeenCalledTimes(layerCount);
        });

        it('should stop render service on destroy', () => {
            fixture.destroy();
            expect(mockRenderService.stop).toHaveBeenCalledOnce();
        });

        it('should remove all layers on destroy', () => {
            fixture.destroy();
            expect(mockRenderService.remove).toHaveBeenCalledTimes(layerCount);
        });
    });
});
