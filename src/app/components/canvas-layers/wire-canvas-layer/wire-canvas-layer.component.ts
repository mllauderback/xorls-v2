import type { ElementRef } from '@angular/core';
import { Component, ViewChild, inject } from '@angular/core';
import { AbstractCanvasLayerComponent } from '../abstract-canvas-layer.component';
import type { Drawable, DrawState } from '../../../models/Drawable';
import { CommonModule } from '@angular/common';
import { RenderService } from '../../../services/render/render.service';

@Component({
    selector: 'app-wire-canvas-layer',
    imports: [CommonModule],
    template: `
    <canvas #canvas (contextmenu)="$event.preventDefault()" [ngStyle]="{'z-index': zIndex, 'background': bground}"></canvas>
    `
})
export class WireCanvasLayerComponent extends AbstractCanvasLayerComponent {
    private renderService = inject(RenderService);

    @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

    override ngAfterViewInit(): void {
        const width = this.canvasRef.nativeElement.width;
        const height = this.canvasRef.nativeElement.height;
        this.initCanvas(new OffscreenCanvas(width, height), this.canvasRef!);
    }

    override refresh(drawState: DrawState) {
        if (this.offscreenContext === null) {
            console.warn('Wire offscreenContext is null: Skipping refresh.');
            this.resetAllDrawablesForUpdates();
            return;
        }
        const updateDrawables: Drawable[] = this.getUpdateDrawablesList();
        if (this.forceClearAll) {
            this.clearOffscreenCanvas();
            this.clearCanvas();
        }
        if (updateDrawables.length === 0) return;
        this.offscreenContext.strokeStyle = 'black';
        this.offscreenContext.lineWidth = this.renderService.STANDARD_LINE_WIDTH;
        this.offscreenContext.beginPath();
        updateDrawables.forEach(d => d.draw(this.offscreenContext!, drawState));
        this.offscreenContext.stroke();
        this.repaintCanvas();
        this.resetAllDrawablesForUpdates();
    }
}
