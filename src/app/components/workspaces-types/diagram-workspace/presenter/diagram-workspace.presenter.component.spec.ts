import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { Component, Input, SimpleChange } from '@angular/core';
import { By } from '@angular/platform-browser';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import { DiagramWorkspacePresenterComponent } from './diagram-workspace.presenter.component';
import { RenderService } from '../../../../services/render/render.service';
import type { AbstractCanvasLayerComponent } from '../../../canvas-layers/abstract-canvas-layer.component';
import type { WorkspaceSettingsState } from '../../../../store/settings/state';
import type { DiagramWorkspaceState, CodeWorkspaceState } from '../../../../store/workspace/state';
import type { SelectedSelectable } from '../../../../store/components/state';
import { AndGate } from '../../../../models/components/gates';
import { Input as InputComponent } from '../../../../models/components/io';
import type { Drawable, DrawState } from '../../../../models/Drawable';
import type { Selectable } from '../../../../models/Selectable';

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
    activeDrawState: DrawState | null = { origin: { x: 0, y: 0 }, scale: 1 };
    add = vi.fn();
    remove = vi.fn();
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
    describe('placing a component', () => {
        let active: FakeLayer;
        let staticComponent: FakeLayer;
        let staticIO: FakeLayer;
        let host: HTMLElement;

        const selection = (selectable: Selectable | null): SelectedSelectable =>
            ({ selectable, concreteClassName: selectable?.constructor.name ?? '' });

        const select = (previous: Selectable | null, current: Selectable | null) =>
            component.ngOnChanges({
                selectedSelectable: new SimpleChange(selection(previous), selection(current), false)
            });

        const buildGhost = () => {
            const gate = new AndGate({ x: 0, y: 0 }, 2);
            gate.isGhost = true;
            return gate;
        };

        const pointer = (type: string, x: number, y: number, init: MouseEventInit = {}) =>
            new MouseEvent(type, { clientX: x, clientY: y, bubbles: true, ...init });

        const moveTo = (x: number, y: number, target: EventTarget = host) => target.dispatchEvent(pointer('pointermove', x, y));

        const click = (x: number, y: number, init: MouseEventInit = {}) => {
            host.dispatchEvent(pointer('pointerdown', x, y, init));
            host.dispatchEvent(pointer('pointerup', x, y, init));
        };

        beforeEach(() => {
            fixture.detectChanges();
            host = fixture.nativeElement as HTMLElement;
            active = new FakeLayer();
            staticComponent = new FakeLayer();
            staticIO = new FakeLayer();
            Object.assign(component, {
                activeComponentCanvasLayerComponent: active,
                componentCanvasLayerComponent: staticComponent,
                ioCanvasLayerComponent: staticIO,
            });
        });

        describe('previewing', () => {
            it('should add the ghost to the active component layer once the pointer is over the workspace', () => {
                const ghost = buildGhost();
                select(null, ghost);
                expect(active.add).not.toHaveBeenCalled(); // nowhere sensible to draw it yet

                moveTo(100, 100);

                expect(active.add).toHaveBeenCalledWith(ghost);
                expect(active.redrawAll).toHaveBeenCalled();
            });

            it('should put the ghost at the last known pointer position when it is selected after the pointer moved', () => {
                moveTo(200, 120);
                const ghost = buildGhost();

                select(null, ghost);

                expect(active.add).toHaveBeenCalledWith(ghost);
                expect(ghost.position).toEqual({ x: 160, y: 80 });
            });

            it('should put the middle of the ghost\'s bounding box under the cursor', () => {
                const ghost = buildGhost(); // and gate: box -20..100 x 0..80, so its middle is (40, 40) from its position
                select(null, ghost);

                moveTo(200, 100);

                expect(ghost.position).toEqual({ x: 160, y: 60 });
            });

            it('should snap the ghost to grid points', () => {
                const ghost = buildGhost();
                select(null, ghost);

                moveTo(205, 107); // wanted position is (165, 67)

                expect(ghost.position).toEqual({ x: 160, y: 60 });
            });

            it('should snap to the grid spacing from the workspace settings', () => {
                component.workspaceSettings = { gridSettings: { gridSpacing: 50, gridMode: 'dots' } } as WorkspaceSettingsState;
                const ghost = buildGhost();
                select(null, ghost);

                moveTo(205, 107);

                expect(ghost.position).toEqual({ x: 150, y: 50 });
            });

            it('should snap to the grid on the canvas, not relative to the diagram origin', () => {
                // the origin moves in steps of 500 as the layer grows, which isn't a multiple of every spacing
                renderService.activeDrawState = { origin: { x: 10, y: 10 }, scale: 1 };
                const ghost = buildGhost();
                select(null, ghost);

                moveTo(200, 100);

                // canvas position of the ghost is a multiple of the spacing, so it lands on a visible grid point
                expect((ghost.position.x + 10) % 20).toBe(0);
                expect((ghost.position.y + 10) % 20).toBe(0);
            });

            it('should account for where the canvas is on screen and how far it is panned', () => {
                active.clientRect = { left: 300, top: 50 };
                active.viewportOffset = { x: -40, y: -20 };
                const ghost = buildGhost();
                select(null, ghost);

                moveTo(300 + 200, 50 + 100); // 200,100 on the canvas, so 240,120 in the panned diagram

                expect(ghost.position).toEqual({ x: 200, y: 80 });
            });

            it('should not redraw while the snapped position is unchanged', () => {
                const ghost = buildGhost();
                select(null, ghost);
                moveTo(200, 100);
                active.redrawAll.mockClear();

                moveTo(201, 101);
                expect(active.redrawAll).not.toHaveBeenCalled();

                moveTo(260, 100);
                expect(active.redrawAll).toHaveBeenCalledTimes(1);
            });

            it('should ignore the mouse when this is not the workspace being shown', () => {
                renderService.activeId = 'another-workspace';
                const ghost = buildGhost();
                select(null, ghost);

                moveTo(100, 100);

                expect(active.add).not.toHaveBeenCalled();
            });

            it('should ignore mouse movement outside the workspace', () => {
                const ghost = buildGhost();
                select(null, ghost);

                moveTo(100, 100, document.body);

                expect(active.add).not.toHaveBeenCalled();
            });

            it('should not preview a selectable that is not a ghost', () => {
                const placed = new AndGate({ x: 40, y: 40 }, 2);
                select(null, placed);
                moveTo(100, 100);
                expect(active.add).not.toHaveBeenCalled();
                expect(placed.position).toEqual({ x: 40, y: 40 });
            });
        });

        describe('clicking to place', () => {
            it('should stop the ghost being a ghost and keep it on the active layer', () => {
                const ghost = buildGhost();
                select(null, ghost);
                moveTo(200, 100);

                click(200, 100);

                expect(ghost.isGhost).toBe(false);
                expect(active.getDrawableList()).toContain(ghost);
                expect(staticComponent.add).not.toHaveBeenCalled();
            });

            it('should place the ghost where the click was, even without a mouse move first', () => {
                const ghost = buildGhost();
                select(null, ghost);

                click(200, 100);

                expect(ghost.position).toEqual({ x: 160, y: 60 });
                expect(ghost.isGhost).toBe(false);
            });

            it('should redraw the layer so the ghost style is replaced', () => {
                select(null, buildGhost());
                moveTo(200, 100);
                active.redrawAll.mockClear();

                click(200, 100);

                expect(active.redrawAll).toHaveBeenCalled();
            });

            it('should emit componentPlaced once', () => {
                const placed = vi.fn();
                component.componentPlaced.subscribe(placed);
                select(null, buildGhost());
                moveTo(200, 100);

                click(200, 100);

                expect(placed).toHaveBeenCalledTimes(1);
            });

            it('should stop following the mouse after it is placed', () => {
                const ghost = buildGhost();
                select(null, ghost);
                moveTo(200, 100);
                click(200, 100);

                moveTo(400, 300);

                expect(ghost.position).toEqual({ x: 160, y: 60 });
            });

            it('should not place on a click while nothing is being previewed', () => {
                const placed = vi.fn();
                component.componentPlaced.subscribe(placed);

                click(200, 100);

                expect(placed).not.toHaveBeenCalled();
            });

            it('should only place with the left mouse button', () => {
                const ghost = buildGhost();
                const placed = vi.fn();
                component.componentPlaced.subscribe(placed);
                select(null, ghost);
                moveTo(200, 100);

                click(200, 100, { button: 2 });

                expect(ghost.isGhost).toBe(true);
                expect(placed).not.toHaveBeenCalled();
            });

            it('should not treat a drag as a click', () => {
                const ghost = buildGhost();
                select(null, ghost);
                moveTo(200, 100);

                host.dispatchEvent(pointer('pointerdown', 200, 100));
                host.dispatchEvent(pointer('pointerup', 260, 100));

                expect(ghost.isGhost).toBe(true);
            });

            it('should ignore clicks outside the workspace, such as on the palette', () => {
                const ghost = buildGhost();
                select(null, ghost);
                moveTo(200, 100);

                document.body.dispatchEvent(pointer('pointerdown', 10, 10));
                document.body.dispatchEvent(pointer('pointerup', 10, 10));

                expect(ghost.isGhost).toBe(true);
            });
        });

        describe('when the selection changes', () => {
            it('should discard a ghost that was never placed', () => {
                const ghost = buildGhost();
                select(null, ghost);
                moveTo(200, 100);

                select(ghost, null);

                expect(active.removeDrawable).toHaveBeenCalledWith(ghost);
                expect(active.getDrawableList()).not.toContain(ghost);
                expect(staticComponent.add).not.toHaveBeenCalled();
                expect(staticIO.add).not.toHaveBeenCalled();
            });

            it('should stop following the mouse with a discarded ghost', () => {
                const ghost = buildGhost();
                select(null, ghost);
                moveTo(200, 100);
                select(ghost, null);

                moveTo(400, 300);

                expect(ghost.position).toEqual({ x: 160, y: 60 });
            });

            it('should replace one ghost with another', () => {
                const first = buildGhost();
                const second = buildGhost();
                select(null, first);
                moveTo(200, 100);

                select(first, second);

                expect(active.getDrawableList()).toEqual([second]);
                expect(second.position).toEqual({ x: 160, y: 60 });
            });

            it('should move a placed component to the component layer when something else is selected', () => {
                const placed = buildGhost();
                select(null, placed);
                moveTo(200, 100);
                click(200, 100);

                select(placed, buildGhost());

                expect(active.getDrawableList()).not.toContain(placed);
                expect(staticComponent.add).toHaveBeenCalledWith(placed);
                expect(staticComponent.redrawAll).toHaveBeenCalled();
            });

            it('should move a placed I/O component to the I/O layer', () => {
                const input = new InputComponent({ x: 0, y: 0 });
                input.isGhost = true;
                select(null, input);
                moveTo(200, 100);
                click(200, 100);

                select(input, null);

                expect(staticIO.add).toHaveBeenCalledWith(input);
                expect(staticComponent.add).not.toHaveBeenCalled();
            });

            it('should leave a component alone that belongs to another workspace', () => {
                const elsewhere = new AndGate({ x: 0, y: 0 }, 2); // not on this workspace's layers

                select(elsewhere, null);

                expect(active.removeDrawable).not.toHaveBeenCalled();
                expect(staticComponent.add).not.toHaveBeenCalled();
            });

            it('should do nothing when the selection is unchanged', () => {
                const ghost = buildGhost();
                select(ghost, ghost);
                expect(active.add).not.toHaveBeenCalled();
                expect(active.removeDrawable).not.toHaveBeenCalled();
            });
        });
    });
});