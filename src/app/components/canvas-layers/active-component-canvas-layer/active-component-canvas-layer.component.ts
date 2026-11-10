import type { ElementRef } from '@angular/core';
import { Component, ViewChild, inject } from '@angular/core';
import { AbstractCanvasLayerComponent } from '../abstract-canvas-layer.component';
import type { Drawable, DrawState } from '../../../models/Drawable';
import { CommonModule } from '@angular/common';
import { RenderService } from '../../../services/render/render.service';

@Component({
    selector: 'app-active-component-canvas-layer',
    imports: [CommonModule],
    template: `
    <canvas #canvas (contextmenu)="$event.preventDefault()" [ngStyle]="{'z-index': zIndex, 'background': bground}"></canvas>
    `
})
export class ActiveComponentCanvasLayerComponent extends AbstractCanvasLayerComponent {
    private renderService = inject(RenderService);

    @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

    override ngAfterViewInit(): void {
        const width = this.canvasRef.nativeElement.width;
        const height = this.canvasRef.nativeElement.height;
        this.initCanvas(new OffscreenCanvas(width, height), this.canvasRef);
    }

    override refresh(drawState: DrawState) {
        if (this.offscreenContext === null) {
            console.warn('Active component context is null: Skipping refresh.');
            this.resetAllDrawablesForUpdates();
            return;
        }
        const updateDrawables: Drawable[] = this.getUpdateDrawablesList();
        if (this.forceClearAll) {
            this.clearOffscreenCanvas();
            this.clearCanvas();
        }
        // After a clear, the cached image must be replaced even if nothing is left to draw (e.g. the last
        // drawable was removed). Otherwise the next repaint, such as a pan, would bring the removed drawable back.
        if (updateDrawables.length > 0 || this.forceClearAll) {
            this.renderService.drawDrawables(this.offscreenContext, updateDrawables, drawState, {
                strokeStyle: 'blue',
                lineWidth: this.renderService.BOLD_LINE_WIDTH
            });
            this.updateCachedOffscreenImage();
            this.resetAllDrawablesForUpdates();
        }
        if (updateDrawables.length > 0 || this.forceClearAll || this.forceRepaint) {
            this.repaintCanvas();
        }
    }
}
