import type { ElementRef} from '@angular/core';
import { Component, ViewChild, inject } from '@angular/core';
import { AbstractCanvasLayerComponent } from '../abstract-canvas-layer.component';
import type { Drawable, DrawState } from '../../../models/Drawable';
import { CommonModule } from '@angular/common';
import { RenderService } from '../../../services/render/render.service';

@Component({
    selector: 'app-component-canvas-layer',
    imports: [CommonModule],
    template: `
    <canvas #canvas (contextmenu)="$event.preventDefault()" [ngStyle]="{'z-index': zIndex, 'background': bground}"></canvas>
    `
})
export class ComponentCanvasLayerComponent extends AbstractCanvasLayerComponent {
    private renderService = inject(RenderService);

    @ViewChild('canvas') canvasRef?: ElementRef<HTMLCanvasElement>;

    override ngAfterViewInit(): void {
        this.initCanvas(this.canvasRef!);
    }
    
    override refresh(drawState: DrawState) {
        if (this.context === null) {
            console.warn('Component context is null: Skipping refresh.');
            this.resetAllDrawablesForUpdates();
            return;
        }
        const updateDrawables: Drawable[] = this.getUpdateDrawablesList();
        if (this.forceClear) this.context.clearRect(0, 0, this.width, this.height);
        this.context.strokeStyle = 'black';
        this.context.lineWidth = this.renderService.STANDARD_LINE_WIDTH;
        this.context.beginPath();
        updateDrawables.forEach(d => d.draw(this.context!, drawState));
        this.context.stroke();
        this.resetAllDrawablesForUpdates();
    }
}
