import type { AfterViewInit, ElementRef, OnDestroy, OnInit, QueryList } from "@angular/core";
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, ViewChildren, inject } from "@angular/core";
import { ButtonModule } from "primeng/button";
import { TabsModule } from "primeng/tabs";
import { RenderService } from '../../services/render/render.service'
import { CommonModule } from "@angular/common";
import type { TabChangeEvent, XorlsTabModel } from "../xorls-tabview/xorls-tabview.component";
import { DraggableTabComponent, XorlsTabviewComponent } from "../xorls-tabview/xorls-tabview.component";
import { DiagramWorkspaceContainerComponent } from "../workspaces-types/diagram-workspace/container/diagram-workspace.container.component";
import { ElementPointer, PointerService } from "../../services/pointer/pointer.service";
import type { Workspace } from "../workspaces-types/workspaceType";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import type { Observable } from "rxjs";
import { BehaviorSubject, EMPTY, switchMap } from "rxjs";

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
    private cdr = inject(ChangeDetectorRef);
    private pointerService = inject(PointerService);
    /** The active tab's viewport. The pointer streams below follow it as it changes. */
    private viewport$ = new BehaviorSubject<HTMLDivElement | undefined>(undefined);
    protected startIndex = 0;
    protected activeTabIndex = this.startIndex;
    protected tabs: XorlsTabModel<Workspace>[] = [];

    constructor() {
        // The pointer service delivers events outside the Angular zone, which is what panning and clicks on the canvas want.
        this.onViewportPointer(pointer => pointer.click$).subscribe(({ event }) => this.onMouseClick(event));
        this.onViewportPointer(pointer => pointer.drag$).subscribe(({ event }) => this.onMouseDrag(event));
        // releasing ends the grab wherever the pointer is, even if the drag left the viewport
        this.pointerService.up$.pipe(takeUntilDestroyed()).subscribe(() => this.onMouseUp());
    }

    /** A pointer stream of the active viewport that switches over when the active tab (and so the viewport) changes. */
    private onViewportPointer<T>(select: (pointer: ElementPointer) => Observable<T>): Observable<T> {
        return this.viewport$.pipe(
            switchMap(viewport => viewport ? select(this.pointerService.within(viewport)) : EMPTY),
            takeUntilDestroyed(this.destroyRef)
        );
    }

    ngOnInit(): void {
        this.tabs = [ // randomUUID will eventually be replaced with file ids from the DB
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
        this.renderService.activeId = event.id;

        const modelIndex = this.tabs.findIndex(t => t.id === event.id);
        if (modelIndex === -1) {
            console.warn(`Tab with id ${event.id} not found in workspace tabs.`);
            return;
        }
        this.activeTabIndex = modelIndex;

        const newViewport = this.viewports?.get(this.activeTabIndex)?.nativeElement;
        if (!newViewport) {
            console.warn(`New viewport for tab ${event.id} is undefined or null.`);
            return;
        }
        this.updateResizeListenerSubject(newViewport);
        this.setActiveViewport(newViewport);
        this.cdr.detectChanges();
    }

    protected reorderTabs(idsInOrder: string[]) {
        this.tabs = idsInOrder
            .map(id => this.tabs.find(t => t.id === id))
            .filter((t): t is XorlsTabModel<Workspace> => !!t);
    }

    private setActiveViewport(newViewport: HTMLDivElement) {
        this.currentViewportEl = newViewport;
        this.viewport$.next(newViewport);
    }

    private onMouseDrag(event: MouseEvent) {
        this.renderService.panActiveDiagram(event.movementX, event.movementY, this.currentViewportEl!.clientWidth, this.currentViewportEl!.clientHeight);
        this.currentViewportEl!.style.cursor = 'grabbing';
    }

    private onMouseUp() {
        if (this.currentViewportEl) this.currentViewportEl.style.cursor = 'default';
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