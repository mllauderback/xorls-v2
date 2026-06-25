import { AfterViewInit, ElementRef, OnDestroy, OnInit, QueryList, Type, ViewChildren } from "@angular/core";
import { ChangeDetectionStrategy, Component, Input, ViewChild, inject } from "@angular/core";
import { ButtonModule } from "primeng/button";
import { TabsModule } from "primeng/tabs";
import { RenderService } from "../../../services/render/render.service";
import { CommonModule, NgComponentOutlet } from "@angular/common";
import type { WorkspaceSettingsState } from "../../../store/settings/state";
import { DraggableTabComponent, XorlsTabChangeEvent, XorlsTabModel, XorlsTabviewComponent } from "../../xorls-tabview/xorls-tabview.component";
import { DiagramWorkspaceContainerComponent } from "../../workspace-types/diagram-workspace/container/diagram-workspace.container.component";
import { Workspace } from "../../workspace-types/workspace-type";


@Component({
    selector: 'app-workspace-presenter',
    imports: [
        CommonModule,
        TabsModule,
        ButtonModule,
        XorlsTabviewComponent,
        DraggableTabComponent,
    ],
    templateUrl: 'workspace.presenter.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class WorkspacePresenterComponent implements OnInit, AfterViewInit, OnDestroy {
    private renderService = inject(RenderService);

    @Input({ required: true }) workspaceSettings?: WorkspaceSettingsState | null;

    @ViewChildren('outlet') outlets!: QueryList<NgComponentOutlet>;
    @ViewChild('contentViewport') viewport?: ElementRef<HTMLDivElement>;

    private resizeObserver?: ResizeObserver;

    protected tabs: XorlsTabModel<Workspace>[] = [];
    protected activeTabIndex = 0;

    ngOnInit(): void {
        this.tabs = [
            { id: crypto.randomUUID(), header: "Header I", component: DiagramWorkspaceContainerComponent },
            { id: crypto.randomUUID(), header: "Header II", component: DiagramWorkspaceContainerComponent }
        ];
    }

    ngAfterViewInit(): void {
        this.resizeObserver = new ResizeObserver((entries) =>
            entries.forEach(e => this.onViewportResize(e))
        );
        const viewportEl = this.viewport?.nativeElement;
        if (viewportEl) this.resizeObserver?.observe(viewportEl);
    }

    ngOnDestroy(): void {
        this.renderService.stop();
        this.resizeObserver?.disconnect();
    }

    private onViewportResize(entry: ResizeObserverEntry) {
        const viewportWidth = entry.contentRect.width;
        const viewportHeight = entry.contentRect.height;
        const oldWidth = this.renderService.width;
        const oldHeight = this.renderService.height;
        const newWidth = viewportWidth > oldWidth ? viewportWidth + 100 : oldWidth;
        const newHeight = viewportHeight > oldHeight ? viewportHeight + 100 : oldHeight;
        if (newWidth !== oldWidth || newHeight !== oldHeight) this.renderService.resize(newWidth, newHeight);
    }

    public addTab(tab: XorlsTabModel<Workspace>) {
        this.tabs.push(tab);
    }

    protected closeTab(index: number) {
        this.tabs.splice(index, 1);
    }

    protected changeTab(event: XorlsTabChangeEvent) {
        this.activeTabIndex = event.index;
        // const outlet = this.outlets.get(event.index);
        // const instance: Workspace = outlet?.componentInstance;
        console.log(event.tab.header);
        // console.log(instance);
    }

    protected reorderTabs(orderedIds: string[]) {
        this.tabs = orderedIds.map(id => this.tabs.find(t => t.id === id)!);
    }
}
