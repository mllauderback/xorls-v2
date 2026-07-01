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
});