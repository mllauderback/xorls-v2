import { Component, ElementRef, Input, ViewChild } from '@angular/core';
import { AbstractCanvasLayerComponent } from '../abstract-canvas-layer.component';
import { Drawable, DrawState } from '../../../models/Drawable';
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
    @ViewChild('canvas') canvasRef?: ElementRef<HTMLCanvasElement>;

    constructor(private renderService: RenderService) {
        super();
    }

    override ngAfterViewInit(): void {
        this.initCanvas(this.canvasRef!);
    }

    override ngOnDestroy(): void {
    }

    override refresh(drawState: DrawState) {
        if (this.context === null) {
            console.warn('Active component context is null: Skipping refresh.');
            this.resetAllDrawablesForUpdates();
            return;
        }
        const updateDrawables: Drawable[] = this.getUpdateDrawablesList();
        if (this.forceClear) this.context.clearRect(0, 0, this.width, this.height);
        this.context.strokeStyle = 'blue';
        this.context.lineWidth = this.renderService.BOLD_LINE_WIDTH;
        this.context.beginPath();
        updateDrawables.forEach(d => d.draw(this.context!, drawState));
        this.context.stroke();
        this.resetAllDrawablesForUpdates();
    }
}
