import type { AfterViewInit, OnDestroy} from "@angular/core";
import { ChangeDetectionStrategy, Component, ViewChild, inject } from "@angular/core";
import { ButtonModule } from "primeng/button";
import type { TabPanels} from "primeng/tabs";
import { TabsModule } from "primeng/tabs";
import { WorkspaceMouseEventService } from "../../../services/mouse/workspace-mouse-event.service";
import { RenderService } from "../../../services/render/render.service";
import { GridCanvasLayerComponent } from "../../canvas-layers/grid-canvas-layer/grid-canvas-layer.component";
import { ComponentCanvasLayerComponent } from "../../canvas-layers/component-canvas-layer/component-canvas-layer.component";
import { ActiveComponentCanvasLayerComponent } from "../../canvas-layers/active-component-canvas-layer/active-component-canvas-layer.component";
import { IOCanvasLayerComponent } from "../../canvas-layers/io-canvas-layer/io-canvas-layer.component";
import { WireCanvasLayerComponent } from "../../canvas-layers/wire-canvas-layer/wire-canvas-layer.component";
import { ActiveWireCanvasLayerComponent } from "../../canvas-layers/active-wire-canvas-layer/active-wire-canvas-layer.component";

@Component({
    selector: 'app-workspace-presenter',
    imports: [
    TabsModule,
    ButtonModule,
    GridCanvasLayerComponent,
    ComponentCanvasLayerComponent,
    ActiveComponentCanvasLayerComponent,
    IOCanvasLayerComponent,
    WireCanvasLayerComponent,
    ActiveWireCanvasLayerComponent
],
    templateUrl: './workspace.presenter.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class WorkspacePresenterComponent implements AfterViewInit, OnDestroy {
    private renderService = inject(RenderService);
    private mouseEventService = inject(WorkspaceMouseEventService);

    
    @ViewChild('contentViewport') viewport?: TabPanels;
    @ViewChild('grid') gridCanvasLayerComponent?: GridCanvasLayerComponent;
    @ViewChild('component') componentCanvasLayerComponent?: ComponentCanvasLayerComponent;
    @ViewChild('activeComponent') activeComponentCanvasLayerComponent?: ActiveComponentCanvasLayerComponent;
    @ViewChild('io') ioCanvasLayerComponent?: IOCanvasLayerComponent;
    @ViewChild('wire') wireCanvasLayerComponent?: WireCanvasLayerComponent;
    @ViewChild('activeWire') activeWireCanvasLayerComponent?: ActiveWireCanvasLayerComponent;

    private resizeObserver?: ResizeObserver;

    ngAfterViewInit(): void {
        this.resizeObserver = new ResizeObserver((entries) =>
            entries.forEach(e => this.onViewportResize(e))
        );
        this.resizeObserver?.observe(this.viewport?.el.nativeElement);

        // this.gridCanvasLayerComponent?.add(new Grid());
        this.renderService.add(this.gridCanvasLayerComponent!)
            .add(this.componentCanvasLayerComponent!)
            .add(this.activeComponentCanvasLayerComponent!)
            .add(this.ioCanvasLayerComponent!)
            .add(this.wireCanvasLayerComponent!)
            .add(this.activeWireCanvasLayerComponent!);

        // test component;
        // this.activeWireCanvasLayerComponent?.add(new AndGate({ x: 40, y: 40 }, 2));

        this.renderService.start();
    }

    ngOnDestroy(): void {
        this.renderService.stop();
        this.renderService.remove(this.gridCanvasLayerComponent!)
            .remove(this.componentCanvasLayerComponent!)
            .remove(this.ioCanvasLayerComponent!)
            .remove(this.wireCanvasLayerComponent!)
            .remove(this.activeComponentCanvasLayerComponent!)
            .remove(this.activeWireCanvasLayerComponent!);
        this.resizeObserver?.disconnect();
    }

    private onViewportResize(entry: ResizeObserverEntry) {
        const viewportWidth = entry.contentRect.width;
        const viewportHeight = entry.contentRect.height;
        const oldWidth = this.renderService.width;
        const oldHeight = this.renderService.width;
        const newWidth = oldWidth < viewportWidth ? viewportWidth + 100 : oldWidth;
        const newHeight = oldHeight < viewportHeight ? viewportHeight + 100 : oldHeight;
        this.renderService.resize(newWidth, newHeight);

    }

    protected closeTab() {}
}
