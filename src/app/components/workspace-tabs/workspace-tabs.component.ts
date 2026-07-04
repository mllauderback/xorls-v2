import type { AfterViewInit, ElementRef, OnDestroy, QueryList } from "@angular/core";
import { ChangeDetectionStrategy, Component, DestroyRef, ViewChildren, inject } from "@angular/core";
import { ButtonModule } from "primeng/button";
import { TabsModule } from "primeng/tabs";
import { RenderService } from '../../services/render/render.service'
import { CommonModule } from "@angular/common";
import type { TabChangeEvent } from "../xorls-tabview/xorls-tabview.component";
import { DraggableTabComponent, XorlsTabviewComponent } from "../xorls-tabview/xorls-tabview.component";
import { DiagramWorkspaceContainerComponent } from "../workspaces/diagram-workspace/container/diagram-workspace.container.component";
import { MouseEventListener } from "./mouse-listener";

@Component({
    selector: 'app-workspace-tabs',
    imports: [
        CommonModule,
        TabsModule,
        ButtonModule,
        XorlsTabviewComponent,
        DraggableTabComponent,
        DiagramWorkspaceContainerComponent
    ],
    templateUrl: 'workspace-tabs.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class WorkspaceTabsComponent implements AfterViewInit, OnDestroy {
    @ViewChildren('contentViewport') viewports?: QueryList<ElementRef<HTMLDivElement>>;
    private currentViewportEl?: HTMLDivElement;

    private resizeObserver?: ResizeObserver;
    private renderService = inject(RenderService);
    private mouseListener: MouseEventListener;
    protected startIndex = 0;

    constructor() {
        this.mouseListener = new MouseEventListener(inject(DestroyRef));
        this.mouseListener.onMouseClick((event: MouseEvent) => this.onMouseClick(event));
        this.mouseListener.onMouseDrag((event: MouseEvent) => this.onMouseDrag(event));
        this.mouseListener.onMouseUp(() => this.onMouseUp());
    }

    // tab IDs are automatically generated if no id is provided
    // we want to guarantee that tab ids and workspace ids match, so we need to provide both
    // this will eventually be done automatically by looping through data for each workspace
    protected tabIds: string[] = [
        crypto.randomUUID(),
        crypto.randomUUID(),
    ];

    ngAfterViewInit(): void {
        this.resizeObserver = new ResizeObserver((entries) => entries.forEach(e => this.onViewportResize(e)));
        const viewportEl = this.viewports?.get(this.startIndex)?.nativeElement;
        this.renderService.start();
        if (!viewportEl) {
            console.warn(`Viewport element ${viewportEl} not defined or null.`);
            return;
        }
        this.setActiveViewport(viewportEl);
        this.updateResizeListenerSubject(viewportEl);
    }

    ngOnDestroy(): void {
        this.renderService.stop();
        this.mouseListener.stop();
        this.resizeObserver?.disconnect();
    }

    private updateResizeListenerSubject(newEl: HTMLDivElement | undefined) {
        if (this.currentViewportEl) this.resizeObserver?.unobserve(this.currentViewportEl);
        if (newEl) this.resizeObserver?.observe(newEl);
    }

    private onViewportResize(entry: ResizeObserverEntry) {
        const viewportWidth = entry.contentRect.width;
        const viewportHeight = entry.contentRect.height;
        const oldWidth = this.renderService.getActiveDiagramWidth();
        const oldHeight = this.renderService.getActiveDiagramHeight();
        const newWidth = viewportWidth > oldWidth ? viewportWidth + 100 : oldWidth;
        const newHeight = viewportHeight > oldHeight ? viewportHeight + 100 : oldHeight;
        if (newWidth !== oldWidth || newHeight !== oldHeight) this.renderService.resizeActiveDiagram(newWidth, newHeight);
    }

    protected closeTab(index: number) {
        console.log(index);
    }

    protected changeActiveWorkspace(event: TabChangeEvent) {
        // console.log(`tab changed: id=${event.id}, index=${event.index}`);
        this.renderService.activeId = event.id;
        const newViewport = this.viewports?.get(event.index)?.nativeElement;
        if (!newViewport) {
            console.warn(`New viewport ${newViewport} is undefined or null.`);
            return;
        }
        this.updateResizeListenerSubject(newViewport);
        this.setActiveViewport(newViewport);
    }

    private setActiveViewport(newViewport: HTMLDivElement) {
        this.currentViewportEl = newViewport;
        this.mouseListener.changeViewport(newViewport);
    }

    private onMouseDrag(event: MouseEvent) {
        this.renderService.panActiveDiagram(event.movementX, event.movementY, this.currentViewportEl!.clientWidth, this.currentViewportEl!.clientHeight);
        this.currentViewportEl!.style.cursor = 'grabbing';
    }

    private onMouseUp() {
        this.currentViewportEl!.style.cursor = 'default';
    }

    private onMouseClick(event: MouseEvent) {
        console.log('click');
    }
}
