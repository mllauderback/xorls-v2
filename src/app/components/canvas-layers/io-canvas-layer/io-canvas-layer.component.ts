import type { ElementRef } from '@angular/core';
import { Component, ViewChild, inject } from '@angular/core';
import { AbstractCanvasLayerComponent } from '../abstract-canvas-layer.component';
import type { Drawable, DrawState } from '../../../models/Drawable';
import { CommonModule } from '@angular/common';
import { RenderService } from '../../../services/render/render.service';

@Component({
    selector: 'app-io-canvas-layer',
    imports: [CommonModule],
    template: `
    <canvas #canvas (contextmenu)="$event.preventDefault()" [ngStyle]="{'z-index': zIndex, 'background': bground}"></canvas>
    `
})
export class IOCanvasLayerComponent extends AbstractCanvasLayerComponent {
    private renderService = inject(RenderService);

    @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

    override ngAfterViewInit(): void {
        const width = this.canvasRef.nativeElement.width;
        const height = this.canvasRef.nativeElement.height;
        this.initCanvas(new OffscreenCanvas(width, height), this.canvasRef);
    }

    override refresh(drawState: DrawState) {
        if (this.offscreenContext === null) {
            console.warn('IO context is null: Skipping refresh.');
            this.resetAllDrawablesForUpdates();
            return;
        }
        const updateDrawables: Drawable[] = this.getUpdateDrawablesList();
        if (this.forceClear) {
            this.offscreenContext.clearRect(0, 0, this.width, this.height);
            this.context?.clearRect(0, 0, this.width, this.height);
            const dpr = window.devicePixelRatio || 1;
            this.offscreenContext.scale(dpr, dpr);
            this.context?.scale(dpr, dpr);
        }
        if (updateDrawables.length === 0) return;
        this.offscreenContext.strokeStyle = 'black';
        this.offscreenContext.lineWidth = this.renderService.STANDARD_LINE_WIDTH;
        this.offscreenContext.beginPath();
        updateDrawables.forEach(d => d.draw(this.context!, drawState));
        this.offscreenContext.stroke();
        this.repaintCanvas();
        this.resetAllDrawablesForUpdates();
    }
}
