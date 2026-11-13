import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { Component, Input } from '@angular/core';
import { By } from '@angular/platform-browser';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import { DiagramWorkspacePresenterComponent } from './diagram-workspace.presenter.component';
import { RenderService } from '../../../../services/render/render.service';
import type { AbstractCanvasLayerComponent } from '../../../canvas-layers/abstract-canvas-layer.component';
import type { WorkspaceSettingsState } from '../../../../store/settings/state';
import type { DiagramWorkspaceState, CodeWorkspaceState } from '../../../../store/workspace/state';
import { createPlaceable } from '../../../../models/components/ComponentFactory';
import type { DiagramView } from '../controller/diagram-view';
import type { Drawable, DrawState } from '../../../../models/Drawable';
import { ComponentType } from '../../../../models/components/Component';

@Component({ selector: 'app-grid-canvas-layer', template: '' })
class MockGridCanvasLayerComponent {
    @Input() zIndex!: number;
    @Input() bground!: string;
    @Input() gridSettings: unknown = null;
}

@Component({ selector: 'app-component-canvas-layer', template: '' })
class MockComponentCanvasLayerComponent {
    @Input() zIndex!: number;
    @Input() bground!: string;
}

@Component({ selector: 'app-io-canvas-layer', template: '' })
class MockIOCanvasLayerComponent {
    @Input() zIndex!: number;
    @Input() bground!: string;
}

@Component({ selector: 'app-wire-canvas-layer', template: '' })
class MockWireCanvasLayerComponent {
    @Input() zIndex!: number;
    @Input() bground!: string;
}

@Component({ selector: 'app-active-component-canvas-layer', template: '' })
class MockActiveComponentCanvasLayerComponent {
    @Input() zIndex!: number;
    @Input() bground!: string;
}

@Component({ selector: 'app-active-wire-canvas-layer', template: '' })
class MockActiveWireCanvasLayerComponent {
    @Input() zIndex!: number;
    @Input() bground!: string;
}

class MockRenderService {
    activeId = 'workspace-1';
    activeViewTransform: DrawState | null = { origin: { x: 0, y: 0 }, scale: 1, version: 0 };
    add = vi.fn();
    remove = vi.fn();
    panActiveDiagram = vi.fn();
}

/** Stands in for a canvas layer: records which drawables were added/removed/redrawn. */
class FakeLayer {
    drawables: Drawable[] = [];
    viewportOffset = { x: 0, y: 0 };
    clientRect: Pick<DOMRect, 'left' | 'top'> | null = { left: 0, top: 0 };
    add = vi.fn((d: Drawable) => { this.drawables.push(d); });
    removeDrawable = vi.fn((d: Drawable) => { this.drawables = this.drawables.filter(x => x !== d); });
    redrawAll = vi.fn();
    getDrawableList = () => this.drawables;
    getClientRect = () => this.clientRect;
}

const WORKSPACE_SETTINGS: WorkspaceSettingsState = {
    gridSettings: {
        gridSpacing: 20,
        gridMode: 'dots',
    },
} as WorkspaceSettingsState;

const DIAGRAM_WORKSPACE_STATE: DiagramWorkspaceState = {} as DiagramWorkspaceState;

describe('DiagramWorkspacePresenterComponent', () => {
    let fixture: ComponentFixture<DiagramWorkspacePresenterComponent>;
    let component: DiagramWorkspacePresenterComponent;
    let renderService: MockRenderService;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [
                DiagramWorkspacePresenterComponent,
                MockGridCanvasLayerComponent,
                MockComponentCanvasLayerComponent,
                MockIOCanvasLayerComponent,
                MockWireCanvasLayerComponent,
                MockActiveComponentCanvasLayerComponent,
                MockActiveWireCanvasLayerComponent,
            ],
            providers: [{ provide: RenderService, useClass: MockRenderService }],
        })
            .overrideComponent(DiagramWorkspacePresenterComponent, {
                set: {
                    imports: [
                        MockGridCanvasLayerComponent,
                        MockComponentCanvasLayerComponent,
                        MockIOCanvasLayerComponent,
                        MockWireCanvasLayerComponent,
                        MockActiveComponentCanvasLayerComponent,
                        MockActiveWireCanvasLayerComponent,
                    ],
                },
            })
            .compileComponents();

        renderService = TestBed.inject(RenderService) as unknown as MockRenderService;
        fixture = TestBed.createComponent(DiagramWorkspacePresenterComponent);
        component = fixture.componentInstance;

        component.id = 'workspace-1';
        component.workspaceSettings = WORKSPACE_SETTINGS;
        component.workspaceState = DIAGRAM_WORKSPACE_STATE;
    });

    describe('component creation', () => {
        it('should create successfully', () => {
            fixture.detectChanges();
            expect(component).toBeTruthy();
        });
    });

    describe('@Input properties', () => {
        it('should accept and store the id input', () => {
            component.id = 'my-workspace';
            fixture.detectChanges();
            expect(component.id).toBe('my-workspace');
        });

        it('should accept null workspaceSettings', () => {
            component.workspaceSettings = null;
            fixture.detectChanges();
            expect(component.workspaceSettings).toBeNull();
        });

        it('should accept null workspaceState', () => {
            component.workspaceState = null;
            fixture.detectChanges();
            expect(component.workspaceState).toBeNull();
        });

        it('should accept a DiagramWorkspaceState', () => {
            component.workspaceState = DIAGRAM_WORKSPACE_STATE;
            fixture.detectChanges();
            expect(component.workspaceState).toBe(DIAGRAM_WORKSPACE_STATE);
        });

        it('should accept a CodeWorkspaceState', () => {
            const codeState = {} as CodeWorkspaceState;
            component.workspaceState = codeState;
            fixture.detectChanges();
            expect(component.workspaceState).toBe(codeState);
        });
    });

    describe('@ViewChild references', () => {
        beforeEach(() => fixture.detectChanges());

        it('should resolve gridCanvasLayerComponent', () => {
            expect(component.gridCanvasLayerComponent).toBeTruthy();
        });

        it('should resolve componentCanvasLayerComponent', () => {
            expect(component.componentCanvasLayerComponent).toBeTruthy();
        });

        it('should resolve ioCanvasLayerComponent', () => {
            expect(component.ioCanvasLayerComponent).toBeTruthy();
        });

        it('should resolve wireCanvasLayerComponent', () => {
            expect(component.wireCanvasLayerComponent).toBeTruthy();
        });

        it('should resolve activeComponentCanvasLayerComponent', () => {
            expect(component.activeComponentCanvasLayerComponent).toBeTruthy();
        });

        it('should resolve activeWireCanvasLayerComponent', () => {
            expect(component.activeWireCanvasLayerComponent).toBeTruthy();
        });
    });

    describe('ngAfterViewInit', () => {
        it('should call renderService.add with the workspace id', () => {
            fixture.detectChanges();
            expect(renderService.add).toHaveBeenCalledWith('workspace-1', expect.any(Array));
        });

        it('should pass exactly 6 layers to renderService.add', () => {
            fixture.detectChanges();
            const [, layers] = renderService.add.mock.calls[0] as [string, AbstractCanvasLayerComponent[]];
            expect(layers).toHaveLength(6);
        });

        // arguably this isn't necessary, but I'll put it here anyway
        it('should pass layers in the correct order (grid -> component -> io -> wire -> activeComponent -> activeWire)', () => {
            fixture.detectChanges();
            const [, layers] = renderService.add.mock.calls[0] as [string, AbstractCanvasLayerComponent[]];
            expect(layers[0]).toBe(component.gridCanvasLayerComponent);
            expect(layers[1]).toBe(component.componentCanvasLayerComponent);
            expect(layers[2]).toBe(component.ioCanvasLayerComponent);
            expect(layers[3]).toBe(component.wireCanvasLayerComponent);
            expect(layers[4]).toBe(component.activeComponentCanvasLayerComponent);
            expect(layers[5]).toBe(component.activeWireCanvasLayerComponent);
        });

        it('should call renderService.add exactly once', () => {
            fixture.detectChanges();
            expect(renderService.add).toHaveBeenCalledTimes(1);
        });
    });

    describe('template bindings', () => {
        beforeEach(() => fixture.detectChanges());

        it('should render all 6 canvas layer elements', () => {
            const selectors = [
                'app-grid-canvas-layer',
                'app-component-canvas-layer',
                'app-io-canvas-layer',
                'app-wire-canvas-layer',
                'app-active-component-canvas-layer',
                'app-active-wire-canvas-layer',
            ];
            for (const sel of selectors) {
                expect(fixture.debugElement.query(By.css(sel)), sel).toBeTruthy();
            }
        });

        it('should pass gridSettings from workspaceSettings to the grid layer', () => {
            const gridEl = fixture.debugElement.query(By.directive(MockGridCanvasLayerComponent));
            const gridInstance = gridEl.componentInstance as MockGridCanvasLayerComponent;
            expect(gridInstance.gridSettings).toBe(WORKSPACE_SETTINGS.gridSettings);
        });

        it('should pass null gridSettings when workspaceSettings is null', () => {
            component.workspaceSettings = null;
            fixture.detectChanges();
            const gridEl = fixture.debugElement.query(By.directive(MockGridCanvasLayerComponent));
            const gridInstance = gridEl.componentInstance as MockGridCanvasLayerComponent;
            expect(gridInstance.gridSettings).toBeNull();
        });

        it('should set zIndex 0 and white background on the grid layer', () => {
            const inst = fixture.debugElement.query(By.directive(MockGridCanvasLayerComponent))
                .componentInstance as MockGridCanvasLayerComponent;
            expect(inst.zIndex).toBe(0);
            expect(inst.bground).toBe('white');
        });

        it('should set zIndex 1 and transparent background on the component layer', () => {
            const inst = fixture.debugElement.query(By.directive(MockComponentCanvasLayerComponent))
                .componentInstance as MockComponentCanvasLayerComponent;
            expect(inst.zIndex).toBe(1);
            expect(inst.bground).toBe('transparent');
        });

        it('should set zIndex 2 and transparent background on the IO layer', () => {
            const inst = fixture.debugElement.query(By.directive(MockIOCanvasLayerComponent))
                .componentInstance as MockIOCanvasLayerComponent;
            expect(inst.zIndex).toBe(2);
            expect(inst.bground).toBe('transparent');
        });

        it('should set zIndex 3 and transparent background on the wire layer', () => {
            const inst = fixture.debugElement.query(By.directive(MockWireCanvasLayerComponent))
                .componentInstance as MockWireCanvasLayerComponent;
            expect(inst.zIndex).toBe(3);
            expect(inst.bground).toBe('transparent');
        });

        it('should set zIndex 4 and transparent background on the active-component layer', () => {
            const inst = fixture.debugElement.query(By.directive(MockActiveComponentCanvasLayerComponent))
                .componentInstance as MockActiveComponentCanvasLayerComponent;
            expect(inst.zIndex).toBe(4);
            expect(inst.bground).toBe('transparent');
        });

        it('should set zIndex 5 and transparent background on the active-wire layer', () => {
            const inst = fixture.debugElement.query(By.directive(MockActiveWireCanvasLayerComponent))
                .componentInstance as MockActiveWireCanvasLayerComponent;
            expect(inst.zIndex).toBe(5);
            expect(inst.bground).toBe('transparent');
        });
    });


    describe('as a view', () => {
        let active: FakeLayer;
        let staticComponent: FakeLayer;
        let staticIO: FakeLayer;

        const gate = () => createPlaceable(ComponentType.AndGate, { x: 0, y: 0 });

        beforeEach(() => {
            fixture.detectChanges();
            active = new FakeLayer();
            staticComponent = new FakeLayer();
            staticIO = new FakeLayer();
            Object.assign(component, {
                activeComponentCanvasLayerComponent: active,
                componentCanvasLayerComponent: staticComponent,
                ioCanvasLayerComponent: staticIO,
            });
        });

        describe('viewReady', () => {
            it('should emit the presenter itself once its layers are registered', () => {
                const fresh = TestBed.createComponent(DiagramWorkspacePresenterComponent);
                fresh.componentInstance.id = 'workspace-2';
                fresh.componentInstance.workspaceSettings = WORKSPACE_SETTINGS;
                fresh.componentInstance.workspaceState = DIAGRAM_WORKSPACE_STATE;
                const ready = vi.fn(() => {
                    expect(renderService.add).toHaveBeenCalledWith('workspace-2', expect.any(Array));
                });
                fresh.componentInstance.viewReady.subscribe(ready);

                fresh.detectChanges();

                expect(ready).toHaveBeenCalledOnce();
                expect(ready).toHaveBeenCalledWith(fresh.componentInstance);
            });

            it('should emit only once, however often it is checked', () => {
                const fresh = TestBed.createComponent(DiagramWorkspacePresenterComponent);
                Object.assign(fresh.componentInstance, { id: 'workspace-2', workspaceSettings: null, workspaceState: null });
                const ready = vi.fn();
                fresh.componentInstance.viewReady.subscribe(ready);

                fresh.detectChanges();
                fresh.detectChanges();

                expect(ready).toHaveBeenCalledOnce();
            });
        });

        describe('element', () => {
            it('should be the host element, which is what the pointer is followed over', () => {
                expect(component.element).toBe(fixture.nativeElement);
            });
        });

        describe('clientToDiagram', () => {
            it('should take the position on screen to the position in the diagram', () => {
                expect(component.clientToDiagram({ x: 200, y: 100 })).toEqual({ x: 200, y: 100 });
            });

            it('should account for where the canvas is on screen, how far it is panned and the diagram origin', () => {
                active.clientRect = { left: 300, top: 50 };
                active.viewportOffset = { x: -40, y: -20 };
                renderService.activeViewTransform = { origin: { x: 10, y: 5 }, scale: 1, version: 0 };

                // 200,100 on the canvas is 240,120 in the panned layer, and 230,115 from the diagram origin
                expect(component.clientToDiagram({ x: 300 + 200, y: 50 + 100 })).toEqual({ x: 230, y: 115 });
            });

            it('should account for the zoom', () => {
                active.clientRect = { left: 300, top: 50 };
                active.viewportOffset = { x: -40, y: -20 };
                renderService.activeViewTransform = { origin: { x: 10, y: 5 }, scale: 2, version: 0 };

                // 240,120 in the panned layer is 230,115 canvas pixels from the origin: 115,57.5 diagram units at 2x
                expect(component.clientToDiagram({ x: 300 + 200, y: 50 + 100 })).toEqual({ x: 115, y: 57.5 });
            });

            it('should be null without a canvas on the screen', () => {
                active.clientRect = null;

                expect(component.clientToDiagram({ x: 200, y: 100 })).toBeNull();
            });

            it('should be null without a view transform', () => {
                renderService.activeViewTransform = null;

                expect(component.clientToDiagram({ x: 200, y: 100 })).toBeNull();
            });
        });

        describe('previews', () => {
            it('should show a preview on the active component layer and redraw it', () => {
                const ghost = gate();

                component.showPreview(ghost);

                expect(active.add).toHaveBeenCalledWith(ghost);
                expect(active.redrawAll).toHaveBeenCalledOnce();
                expect(component.isPreviewing(ghost)).toBe(true);
            });

            it('should not add a preview twice, but redraw it where it moved', () => {
                const ghost = gate();
                component.showPreview(ghost);

                component.showPreview(ghost);

                expect(active.add).toHaveBeenCalledOnce();
                expect(active.redrawAll).toHaveBeenCalledTimes(2);
            });

            it('should not say it is previewing what it was not shown', () => {
                expect(component.isPreviewing(gate())).toBe(false);
            });

            it('should hide a preview and redraw', () => {
                const ghost = gate();
                component.showPreview(ghost);
                active.redrawAll.mockClear();

                component.hidePreview(ghost);

                expect(active.removeDrawable).toHaveBeenCalledWith(ghost);
                expect(active.redrawAll).toHaveBeenCalledOnce();
                expect(component.isPreviewing(ghost)).toBe(false);
            });

            it('should leave the layer alone when hiding what was never shown', () => {
                component.hidePreview(gate());

                expect(active.removeDrawable).not.toHaveBeenCalled();
                expect(active.redrawAll).not.toHaveBeenCalled();
            });

            it('should only hide the one it is asked to', () => {
                const first = gate();
                const second = gate();
                component.showPreview(first);
                component.showPreview(second);

                component.hidePreview(first);

                expect(active.getDrawableList()).toEqual([second]);
            });
        });

        describe('place', () => {
            it('should put a component on the component layer and redraw it', () => {
                const placed = gate();

                component.place(placed);

                expect(staticComponent.add).toHaveBeenCalledWith(placed);
                expect(staticComponent.redrawAll).toHaveBeenCalledOnce();
                expect(staticIO.add).not.toHaveBeenCalled();
            });

            it('should put an I/O component on the I/O layer and redraw it', () => {
                const placed = createPlaceable(ComponentType.Input, { x: 0, y: 0 });

                component.place(placed);

                expect(staticIO.add).toHaveBeenCalledWith(placed);
                expect(staticIO.redrawAll).toHaveBeenCalledOnce();
                expect(staticComponent.add).not.toHaveBeenCalled();
            });

            it('should leave the preview layer alone', () => {
                component.place(gate());

                expect(active.add).not.toHaveBeenCalled();
                expect(active.redrawAll).not.toHaveBeenCalled();
            });
        });

        describe('setCursor', () => {
            it('should set the cursor of the host element', () => {
                component.setCursor('grabbing');

                expect((fixture.nativeElement as HTMLElement).style.cursor).toBe('grabbing');
            });
        });

        describe('being dumb', () => {
            it('should be usable as a DiagramView', () => {
                const view: DiagramView = component;

                expect(view.element).toBe(fixture.nativeElement);
            });

            it('should not listen to the mouse or the keyboard itself', () => {
                const added = vi.spyOn(window, 'addEventListener');
                const addedToDocument = vi.spyOn(document, 'addEventListener');
                const fresh = TestBed.createComponent(DiagramWorkspacePresenterComponent);
                Object.assign(fresh.componentInstance, { id: 'workspace-2', workspaceSettings: null, workspaceState: null });

                fresh.detectChanges();

                const types = [...added.mock.calls, ...addedToDocument.mock.calls].map(([type]) => type);
                expect(types.filter(t => t.startsWith('pointer') || t.startsWith('mouse') || t.startsWith('key'))).toEqual([]);
                added.mockRestore();
                addedToDocument.mockRestore();
            });

            it('should not react to the mouse or Esc', () => {
                const host = fixture.nativeElement as HTMLElement;
                document.body.append(host);

                host.dispatchEvent(new MouseEvent('pointerdown', { clientX: 10, clientY: 10, bubbles: true }));
                host.dispatchEvent(new MouseEvent('pointermove', { clientX: 20, clientY: 10, bubbles: true }));
                document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

                expect(renderService.panActiveDiagram).not.toHaveBeenCalled();
                expect(active.add).not.toHaveBeenCalled();
                expect(host.style.cursor).toBe('');
                host.remove();
            });
        });

        describe('ngOnDestroy', () => {
            it('should remove the workspace from the render service', () => {
                fixture.destroy();

                expect(renderService.remove).toHaveBeenCalledWith('workspace-1');
            });
        });
    });
});
