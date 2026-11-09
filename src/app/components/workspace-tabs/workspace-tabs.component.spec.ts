import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { describe, beforeEach, it, expect, vi } from 'vitest';

import { WorkspaceTabsComponent } from './workspace-tabs.component';
import { RenderService } from '../../services/render/render.service';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { provideMockStore } from '@ngrx/store/testing';
import { resizeObserverInstances } from '../../../../vitest.setup';


describe('WorkspaceTabsComponent', () => {
    let component: WorkspaceTabsComponent;
    let fixture: ComponentFixture<WorkspaceTabsComponent>;
    const initialWidth = 800;
    const initialHeight = 600;
    const mockRenderService = {
        getActiveDiagramWidth: vi.fn().mockReturnValue(initialWidth),
        getActiveDiagramHeight: vi.fn().mockReturnValue(initialHeight),
        start: vi.fn(),
        stop: vi.fn(),
        add: vi.fn(),
        remove: vi.fn(),
        resizeActiveDiagram: vi.fn(),
        panActiveDiagram: vi.fn(),
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        set activeId(_: string) { },
    };

    const buildEntry = (width: number, height: number): ResizeObserverEntry => ({
        contentRect: { width, height } as DOMRectReadOnly
    } as ResizeObserverEntry);

    // convenience getter — this component creates one observer, so index 0
    const observer = () => resizeObserverInstances[0];

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [WorkspaceTabsComponent],
            providers: [
                { provide: RenderService, useValue: mockRenderService },
                provideMockStore(),
            ],
            schemas: [NO_ERRORS_SCHEMA]
        }).compileComponents();

        mockRenderService.getActiveDiagramWidth.mockClear().mockReturnValue(initialWidth);
        mockRenderService.getActiveDiagramHeight.mockClear().mockReturnValue(initialHeight);
        mockRenderService.start.mockClear();
        mockRenderService.stop.mockClear();
        mockRenderService.resizeActiveDiagram.mockClear();
        mockRenderService.panActiveDiagram.mockClear();

        fixture = TestBed.createComponent(WorkspaceTabsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    describe('onViewportResize', () => {
        it('should call resizeActiveDiagram when viewport is wider than current render width', () => {
            observer().callback([buildEntry(initialWidth + 1, initialHeight)], null!);
            expect(mockRenderService.resizeActiveDiagram).toHaveBeenCalled();
        });

        it('should not call resizeActiveDiagram when viewport is narrower than current render width', () => {
            observer().callback([buildEntry(initialWidth - 1, initialHeight)], null!);
            expect(mockRenderService.resizeActiveDiagram).not.toHaveBeenCalled();
        });

        it('should not call resizeActiveDiagram when viewport matches current render dimensions', () => {
            observer().callback([buildEntry(initialWidth, initialHeight)], null!);
            expect(mockRenderService.resizeActiveDiagram).not.toHaveBeenCalled();
        });

        it('should call resizeActiveDiagram when viewport is taller than current render height', () => {
            observer().callback([buildEntry(initialWidth, initialHeight + 1)], null!);
            expect(mockRenderService.resizeActiveDiagram).toHaveBeenCalled();
        });

        it('should not call resizeActiveDiagram when viewport is shorter than current render height', () => {
            observer().callback([buildEntry(initialWidth, initialHeight - 1)], null!);
            expect(mockRenderService.resizeActiveDiagram).not.toHaveBeenCalled();
        });

        it('should grow width when viewport is wider than current render width', () => {
            observer().callback([buildEntry(initialWidth + 1, initialHeight)], null!);
            const [newWidth, newHeight] = mockRenderService.resizeActiveDiagram.mock.calls[0];
            expect(newWidth).toBeGreaterThan(initialWidth);
            expect(newHeight).toBe(initialHeight);
        });

        it('should grow height when viewport is taller than current render height', () => {
            observer().callback([buildEntry(initialWidth, initialHeight + 1)], null!);
            const [newWidth, newHeight] = mockRenderService.resizeActiveDiagram.mock.calls[0];
            expect(newWidth).toBe(initialWidth);
            expect(newHeight).toBeGreaterThan(initialHeight);
        });
    });

    describe('Resize observer', () => {
        it('should observe the first contentViewport element for resizing on init', () => {
            const firstViewport = component.viewports?.get(0)?.nativeElement;
            expect(observer().observe).toHaveBeenCalledWith(firstViewport);
        });

        it('should unobserve and re-observe the new viewport element when the active tab changes', () => {
            const firstViewport = component.viewports?.get(0)?.nativeElement;
            const secondViewport = component.viewports?.get(1)?.nativeElement;
            component['changeActiveWorkspace']({ id: 'some-uuid', index: 1 });
            expect(observer().unobserve).toHaveBeenCalledWith(firstViewport);
            expect(observer().observe).toHaveBeenCalledWith(secondViewport);
        });

        it('should disconnect on destroy', () => {
            fixture.destroy();
            expect(observer().disconnect).toHaveBeenCalledOnce();
        });
    });

    describe('Render service', () => {
        it('should start render service on init', () => {
            expect(mockRenderService.start).toHaveBeenCalledOnce();
        });

        it('should stop render service on destroy', () => {
            fixture.destroy();
            expect(mockRenderService.stop).toHaveBeenCalledOnce();
        });
    });

    describe('changeActiveWorkspace', () => {
        it('should set the active id on the render service when the tab changes', () => {
            const activeIdSpy = vi.spyOn(mockRenderService, 'activeId', 'set');
            component['changeActiveWorkspace']({ id: 'some-uuid', index: 1 });
            expect(activeIdSpy).toHaveBeenCalledWith('some-uuid');
        });
    });
    describe('Pointer', () => {
        const viewport = (index: number) => component.viewports!.get(index)!.nativeElement;
        const activate = (index: number) => component['changeActiveWorkspace']({ id: component['tabs'][index].id, index });
        const fire = (target: EventTarget, type: string, x = 0, y = 0) =>
            target.dispatchEvent(new MouseEvent(type, { clientX: x, clientY: y, bubbles: true }));

        it('should pan the diagram when the active viewport is dragged', () => {
            activate(0);

            fire(viewport(0), 'pointerdown', 10, 10);
            fire(viewport(0), 'pointermove', 20, 10);

            expect(mockRenderService.panActiveDiagram).toHaveBeenCalledOnce();
        });

        it('should not pan for a drag that starts outside the active viewport', () => {
            activate(0);

            fire(document.body, 'pointerdown', 10, 10);
            fire(document.body, 'pointermove', 20, 10);

            expect(mockRenderService.panActiveDiagram).not.toHaveBeenCalled();
        });

        it('should follow the viewport of the active tab', () => {
            // only the active tab's content is attached to the page, so attach the second one the way it would be once shown
            document.body.append(viewport(1));
            activate(1);

            fire(viewport(0), 'pointerdown', 10, 10);
            fire(viewport(0), 'pointermove', 20, 10);
            expect(mockRenderService.panActiveDiagram).not.toHaveBeenCalled();

            fire(viewport(1), 'pointerup', 20, 10);
            fire(viewport(1), 'pointerdown', 10, 10);
            fire(viewport(1), 'pointermove', 20, 10);
            expect(mockRenderService.panActiveDiagram).toHaveBeenCalledOnce();
            viewport(1).remove();
        });

        it('should show the grabbing cursor while dragging and reset it on release', () => {
            activate(0);

            fire(viewport(0), 'pointerdown', 10, 10);
            fire(viewport(0), 'pointermove', 20, 10);
            expect(viewport(0).style.cursor).toBe('grabbing');

            fire(window, 'pointerup', 20, 10);
            expect(viewport(0).style.cursor).toBe('default');
        });

        it('should reset the cursor when the drag is released outside the viewport', () => {
            activate(0);
            fire(viewport(0), 'pointerdown', 10, 10);
            fire(viewport(0), 'pointermove', 20, 10);

            fire(document.body, 'pointerup', 500, 500);

            expect(viewport(0).style.cursor).toBe('default');
        });

        it('should not react to the pointer once destroyed', () => {
            activate(0);
            const el = viewport(0);
            fixture.destroy();

            fire(el, 'pointerdown', 10, 10);
            fire(el, 'pointermove', 20, 10);

            expect(mockRenderService.panActiveDiagram).not.toHaveBeenCalled();
        });
    });
});