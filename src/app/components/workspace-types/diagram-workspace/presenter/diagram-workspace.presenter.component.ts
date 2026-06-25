import { AfterViewInit, Component, inject, Input, OnDestroy, ViewChild } from '@angular/core';
import { GridCanvasLayerComponent } from "../../../canvas-layers/grid-canvas-layer/grid-canvas-layer.component";
import { ComponentCanvasLayerComponent } from "../../../canvas-layers/component-canvas-layer/component-canvas-layer.component";
import { IOCanvasLayerComponent } from "../../../canvas-layers/io-canvas-layer/io-canvas-layer.component";
import { WireCanvasLayerComponent } from "../../../canvas-layers/wire-canvas-layer/wire-canvas-layer.component";
import { ActiveComponentCanvasLayerComponent } from "../../../canvas-layers/active-component-canvas-layer/active-component-canvas-layer.component";
import { ActiveWireCanvasLayerComponent } from "../../../canvas-layers/active-wire-canvas-layer/active-wire-canvas-layer.component";
import { WorkspaceSettingsState } from '../../../../store/settings/state';
import { RenderService } from '../../../../services/render/render.service';

@Component({
    selector: 'app-diagram-presenter-workspace',
    imports: [GridCanvasLayerComponent, ComponentCanvasLayerComponent, IOCanvasLayerComponent, WireCanvasLayerComponent, ActiveComponentCanvasLayerComponent, ActiveWireCanvasLayerComponent],
    templateUrl: './diagram-workspace.presenter.component.html',
    styleUrl: './diagram-workspace.presenter.component.scss',
})
export class DiagramWorkspaceComponent implements AfterViewInit, OnDestroy {
    private renderService = inject(RenderService);

    @Input({ required: true }) workspaceSettings?: WorkspaceSettingsState | null;

    @ViewChild('grid') gridCanvasLayerComponent?: GridCanvasLayerComponent;
    @ViewChild('component') componentCanvasLayerComponent?: ComponentCanvasLayerComponent;
    @ViewChild('activeComponent') activeComponentCanvasLayerComponent?: ActiveComponentCanvasLayerComponent;
    @ViewChild('io') ioCanvasLayerComponent?: IOCanvasLayerComponent;
    @ViewChild('wire') wireCanvasLayerComponent?: WireCanvasLayerComponent;
    @ViewChild('activeWire') activeWireCanvasLayerComponent?: ActiveWireCanvasLayerComponent;

    ngAfterViewInit(): void {
        this.renderService
            .add(this.gridCanvasLayerComponent!)
            .add(this.componentCanvasLayerComponent!)
            .add(this.ioCanvasLayerComponent!)
            .add(this.wireCanvasLayerComponent!)
            .add(this.activeComponentCanvasLayerComponent!)
            .add(this.activeWireCanvasLayerComponent!);

        this.renderService.start();
    }

    ngOnDestroy(): void {
        this.renderService.stop();
        this.renderService.removeAll();
    }
}
