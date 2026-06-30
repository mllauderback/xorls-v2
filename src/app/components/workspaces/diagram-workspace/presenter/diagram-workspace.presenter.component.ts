import type { AfterViewInit, ElementRef } from '@angular/core';
import { Component, DestroyRef, inject, Input, ViewChild } from '@angular/core';
import type { WorkspaceSettingsState } from '../../../../store/settings/state';
import type { CodeWorkspaceState, DiagramWorkspaceState } from '../../../../store/workspace/state';
import { RenderService } from '../../../../services/render/render.service';
import { OffscreenCanvasLayer } from '../../../../models/offscreen-canvas-layers/OffscreenCanvasLayer';
import { GridOffscreenCanvasLayer } from '../../../../models/offscreen-canvas-layers/GridOffscreenCanvasLayer';
import { Observable } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
    selector: 'app-diagram-workspace-presenter',
    imports: [],
    template: '<canvas #canvas class="absolute" style="z-index: 0; background: white;"></canvas>',
    styleUrl: './diagram-workspace.presenter.component.scss',
})
export class DiagramWorkspacePresenterComponent implements AfterViewInit {
    private renderService = inject(RenderService);
    private destroyRef: DestroyRef;

    @Input({ required: true }) id!: string;
    @Input({ required: true }) workspaceSettings?: Observable<WorkspaceSettingsState>;
    @Input({ required: true }) workspaceState?: Observable<DiagramWorkspaceState | CodeWorkspaceState>; // null would be if no workspaces are open

    @ViewChild('canvas') mainCanvas!: ElementRef<HTMLCanvasElement>;

    private gridLayer: GridOffscreenCanvasLayer = new GridOffscreenCanvasLayer(0, 0);
    private componentLayer: OffscreenCanvasLayer = new OffscreenCanvasLayer(0, 0);
    private ioLayer: OffscreenCanvasLayer = new OffscreenCanvasLayer(0, 0);
    private wireLayer: OffscreenCanvasLayer = new OffscreenCanvasLayer(0, 0);
    private activeComponentLayer: OffscreenCanvasLayer = new OffscreenCanvasLayer(0, 0);
    private activeWireLayer: OffscreenCanvasLayer = new OffscreenCanvasLayer(0, 0);

    constructor() {
        this.destroyRef = inject(DestroyRef);
    }

    ngAfterViewInit(): void {
        this.workspaceSettings?.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(settings => {
            this.gridLayer.gridSpacing = settings.gridSettings.gridSpacing;
            this.gridLayer.gridMode = settings.gridSettings.gridMode;
        });

        const layers: OffscreenCanvasLayer[] = [
            this.gridLayer,
            this.componentLayer,
            this.ioLayer,
            this.wireLayer,
            this.activeComponentLayer,
            this.activeWireLayer
        ];
        this.renderService.addOffscreenLayers(this.id, layers);
        this.renderService.setMainCanvas(this.id, this.mainCanvas.nativeElement);
    }
}
