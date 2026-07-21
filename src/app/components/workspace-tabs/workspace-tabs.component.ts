import type { AfterViewInit, ElementRef, OnDestroy, OnInit, QueryList } from "@angular/core";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, NgZone, ViewChildren, inject } from "@angular/core";
import { ButtonModule } from "primeng/button";
import { TabsModule } from "primeng/tabs";
import { RenderService } from '../../services/render/render.service'
import { CommonModule } from "@angular/common";
import type { TabChangeEvent, XorlsTabModel } from "../xorls-tabview/xorls-tabview.component";
import { DraggableTabComponent, XorlsTabviewComponent } from "../xorls-tabview/xorls-tabview.component";
import { DiagramWorkspaceContainerComponent } from "../workspaces-types/diagram-workspace/container/diagram-workspace.container.component";
import { MouseEventListener } from "./mouse-listener";
import type { Workspace } from "../workspaces-types/workspaceType";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";

@Component({
    selector: 'app-workspace-tabs',
    imports: [
        CommonModule,
        TabsModule,
        ButtonModule,
        XorlsTabviewComponent,
        DraggableTabComponent,
    ],
    templateUrl: 'workspace-tabs.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class WorkspaceTabsComponent implements OnInit, AfterViewInit, OnDestroy {
    @ViewChildren('contentViewport') viewports?: QueryList<ElementRef<HTMLDivElement>>;
    private currentViewportEl?: HTMLDivElement;

    private resizeObserver?: ResizeObserver;
    private renderService = inject(RenderService);
    private destroyRef = inject(DestroyRef);
    private ngZone = inject(NgZone);
    private cdr = inject(ChangeDetectorRef);
    private mouseListener: MouseEventListener;
    protected startIndex = 0;
    protected activeTabIndex = this.startIndex;
    protected tabs: XorlsTabModel<Workspace>[] = [];

    constructor() {
        this.mouseListener = new MouseEventListener(inject(DestroyRef));
        this.mouseListener.onMouseClick((event: MouseEvent) => this.ngZone.runOutsideAngular(() => this.onMouseClick(event)));
        this.mouseListener.onMouseDrag((event: MouseEvent) => this.ngZone.runOutsideAngular(() => this.onMouseDrag(event)));
        this.mouseListener.onMouseUp(() => this.ngZone.runOutsideAngular(() => this.onMouseUp()));
    }

    ngOnInit(): void {
        this.tabs = [
            { id: crypto.randomUUID(), header: "Tab 1", component: DiagramWorkspaceContainerComponent },
            { id: crypto.randomUUID(), header: "Tab 2", component: DiagramWorkspaceContainerComponent }
        ];
    }

    ngAfterViewInit(): void {
        this.resizeObserver = new ResizeObserver((entries) => entries.forEach(e => this.onViewportResize(e)));
        this.viewports?.changes.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(list => {
            const el = list.first?.nativeElement;
            // console.log(`viewport changed, got element: ${el}`);
            if (!el) {
                console.warn('No viewport in updated querylist.');
                return;
            }
            this.setActiveViewport(el);
            this.updateResizeListenerSubject(el);
        });
        this.renderService.start();
    }

    ngOnDestroy(): void {
        this.renderService.stop();
        this.mouseListener.stop();
        this.resizeObserver?.disconnect();
    }

    private updateResizeListenerSubject(newEl: HTMLDivElement | undefined) {
        // console.log('resize listener subject updated');
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
        // console.log(index);
        this.tabs.splice(index, 1); // update tabs model to reflect UI changes
    }

    protected changeActiveWorkspace(event: TabChangeEvent) {
        // console.log(`tab changed: id=${event.id}, index=${event.index}`);
        this.activeTabIndex = event.index;
        this.renderService.activeId = event.id;
        const newViewport = this.viewports?.get(this.activeTabIndex)?.nativeElement;
        if (!newViewport) {
            console.warn(`New viewport ${newViewport} is undefined or null.`);
            return;
        }
        this.updateResizeListenerSubject(newViewport);
        this.setActiveViewport(newViewport);
        this.cdr.detectChanges();
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
        // not sure that this is correct.  this returns the absolute position on the canvas.
        // the relative position to the original 0,0 might be what i need instead, not sure yet.
        // const offsetX = event.offsetX - this.renderService.getActiveDiagram()[0].viewportOffset.x;
        // const offsetY = event.offsetY - this.renderService.getActiveDiagram()[0].viewportOffset.y;
        // this does the relative position to the original 0,0.
        const offsetX = event.offsetX - (this.renderService.getActiveDiagram()[0].viewportOffset.x + this.renderService.activeDrawState?.origin.x!);
        const offsetY = event.offsetY - (this.renderService.getActiveDiagram()[0].viewportOffset.y + this.renderService.activeDrawState?.origin.y!);
        console.log(`true coords: ${offsetX}, ${offsetY}`);
    }
}
