import type { AfterViewInit } from '@angular/core';
import { Component, inject, Input, ViewChild } from '@angular/core';
import type { WorkspaceSettingsState } from '../../../../store/settings/state';
import type { CodeWorkspaceState, DiagramWorkspaceState } from '../../../../store/workspace/state';
import { GridCanvasLayerComponent } from "../../../canvas-layers/grid-canvas-layer/grid-canvas-layer.component";
import { ComponentCanvasLayerComponent } from "../../../canvas-layers/component-canvas-layer/component-canvas-layer.component";
import { IOCanvasLayerComponent } from "../../../canvas-layers/io-canvas-layer/io-canvas-layer.component";
import { WireCanvasLayerComponent } from "../../../canvas-layers/wire-canvas-layer/wire-canvas-layer.component";
import { ActiveComponentCanvasLayerComponent } from "../../../canvas-layers/active-component-canvas-layer/active-component-canvas-layer.component";
import { ActiveWireCanvasLayerComponent } from "../../../canvas-layers/active-wire-canvas-layer/active-wire-canvas-layer.component";
import { RenderService } from '../../../../services/render/render.service';
import type { AbstractCanvasLayerComponent } from '../../../canvas-layers/abstract-canvas-layer.component';

@Component({
    selector: 'app-diagram-workspace-presenter',
    imports: [GridCanvasLayerComponent, ComponentCanvasLayerComponent, IOCanvasLayerComponent, WireCanvasLayerComponent, ActiveComponentCanvasLayerComponent, ActiveWireCanvasLayerComponent],
    templateUrl: './diagram-workspace.presenter.component.html',
    styleUrl: './diagram-workspace.presenter.component.scss',
})
export class DiagramWorkspacePresenterComponent implements AfterViewInit {
    private renderService = inject(RenderService);

    @Input({ required: true }) id!: string;
    @Input({ required: true }) workspaceSettings!: WorkspaceSettingsState | null;
    @Input({ required: true }) workspaceState!: DiagramWorkspaceState | CodeWorkspaceState | null; // null would be if no workspaces are open

    @ViewChild('grid') gridCanvasLayerComponent!: GridCanvasLayerComponent;
    @ViewChild('component') componentCanvasLayerComponent!: ComponentCanvasLayerComponent;
    @ViewChild('activeComponent') activeComponentCanvasLayerComponent!: ActiveComponentCanvasLayerComponent;
    @ViewChild('io') ioCanvasLayerComponent!: IOCanvasLayerComponent;
    @ViewChild('wire') wireCanvasLayerComponent!: WireCanvasLayerComponent;
    @ViewChild('activeWire') activeWireCanvasLayerComponent!: ActiveWireCanvasLayerComponent;

    ngAfterViewInit(): void {
        const layers: AbstractCanvasLayerComponent[] = [
            this.gridCanvasLayerComponent,
            this.componentCanvasLayerComponent,
            this.ioCanvasLayerComponent,
            this.wireCanvasLayerComponent,
            this.activeComponentCanvasLayerComponent,
            this.activeWireCanvasLayerComponent
        ];
        this.renderService.add(this.id, layers);
        // console.log('view inited');
    }
}
