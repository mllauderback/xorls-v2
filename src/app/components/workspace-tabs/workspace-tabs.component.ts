import type { AfterViewInit, ElementRef, OnDestroy, QueryList } from "@angular/core";
import { ChangeDetectionStrategy, Component, ViewChildren, inject } from "@angular/core";
import { ButtonModule } from "primeng/button";
import { TabsModule } from "primeng/tabs";
import { RenderService } from '../../services/render/render.service'
import { CommonModule } from "@angular/common";
import type { TabChangeEvent } from "../xorls-tabview/xorls-tabview.component";
import { DraggableTabComponent, XorlsTabviewComponent } from "../xorls-tabview/xorls-tabview.component";
import { DiagramWorkspaceContainerComponent } from "../workspaces/diagram-workspace/container/diagram-workspace.container.component";

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
    protected startIndex = 0;

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
        if (viewportEl) this.updateResizeListenerSubject(viewportEl);
        this.renderService.start();
    }

    ngOnDestroy(): void {
        this.renderService.stop();
        this.resizeObserver?.disconnect();
    }

    private updateResizeListenerSubject(newEl: HTMLDivElement | undefined) {
        if (this.currentViewportEl) this.resizeObserver?.unobserve(this.currentViewportEl);
        this.currentViewportEl = newEl;
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
        this.updateResizeListenerSubject(newViewport);
    }
}
