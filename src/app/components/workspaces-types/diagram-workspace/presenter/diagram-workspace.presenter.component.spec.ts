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
    add = vi.fn();
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
});