import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import { TabPanels, TabsModule } from 'primeng/tabs';
import { ButtonModule } from 'primeng/button';
import { Grid, GridMode } from '../../../models/Grid';
import { Component as DrawableComponent } from '../../../models/components/Component';
import { Decoration as DrawableDecoration } from '../../../models/components/Decoration';
import { AbstractCanvasWrapper } from '../../../models/CanvasWrappers/AbstractCanvasWrapper';
import { GridCanvasWrapper } from '../../../models/CanvasWrappers/GridCanvasWrapper';
import { DrawService } from '../../../services/draw/draw.service';

@Component({
    selector: 'app-workspace-presenter',
    imports: [
        TabsModule,
        ButtonModule
    ],
    templateUrl: './workspace.presenter.component.html',
    styleUrl: './workspace.presenter.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class WorkspacePresenterComponent implements AfterViewInit {
    @ViewChild('grid') gridCanvasRef?: ElementRef<HTMLCanvasElement>;
    @ViewChild('component') componentCanvasRef?: ElementRef<HTMLCanvasElement>;
    @ViewChild('simulation') simulationCanvasRef?: ElementRef<HTMLCanvasElement>;

    @ViewChild('contentViewport') viewport?: TabPanels;
    // Will need to keep track of tabs programatically as an array.

    // canvases
    private gridCanvas: GridCanvasWrapper | null;
    // private componentCanvas: CanvasWrapper | null;
    // private simulationCanvas: CanvasWrapper | null;

    private grid: Grid | null;
    // private origin: Point; // deprecated: this should always be (0,0) and panning moves the entire canvas in the viewport.

    // private components: DrawableComponent[];
    // private decorations: DrawableDecoration[];

    constructor(private _drawService: DrawService) {
        this.gridCanvas = null;
        this.grid = null;

        // this.componentCanvas = null;
        // this.simulationCanvas = null;

        // this.components = [];
        // this.decorations = [];
    }

    // canvas will only be defined after this lifecycle hook
    ngAfterViewInit(): void {
        if (
            !this.componentCanvasRef ||
            !this.gridCanvasRef ||
            !this.simulationCanvasRef ||
            !this.viewport
        ) {
            throw new Error("Null canvas refs.");
        }

        this.setup();
    }

    private setup() {
        this.gridCanvas = new GridCanvasWrapper(this.gridCanvasRef!.nativeElement);
        // this.componentCanvas = new CanvasWrapper(this.componentCanvasRef!.nativeElement);
        // this.simulationCanvas = new CanvasWrapper(this.simulationCanvasRef!.nativeElement);

        if (
            !this.gridCanvas.hasValidContext() //||
            // !this.componentCanvas.hasValidContext() ||
            // !this.simulationCanvas.hasValidContext()
        ) {
            throw new Error("One or more canvas contexts are null!");
        }

        // expands all canvases to fill the viewport and adjusts for display pixel ratio
        this.updateCanvasWidths(this.viewport!.el.nativeElement.offsetWidth);
        this.updateCanvasHeights(this.viewport!.el.nativeElement.offsetHeight);

        this.grid = new Grid(this._drawService);

        // configure grid (should be defaults)
        this.grid.gridMode = GridMode.dots;
        this.gridCanvas.add(this.grid);

        this._drawLoop();
    }

    // TODO: limit FPS to 30
    private _drawLoop(): void {
        this.gridCanvas!.draw();
        window.requestAnimationFrame(this._drawLoop.bind(this));
    }

    private _getDPR() {
        return window.devicePixelRatio || 1;
    }

    private updateCanvasWidths(width: number) {
        if (!this.gridCanvas /*|| !this.componentCanvas || !this.simulationCanvas*/) {
            console.error("Null canvas");
            return;
        }
        const dpr = this._getDPR();
        this.gridCanvas.width = width * dpr;
        // this.componentCanvas.width = width * dpr;
        // this.simulationCanvas.width = width * dpr;
        this.gridCanvas.context.scale(dpr, dpr);
        // this.componentCanvas.context.scale(dpr, dpr);
        // this.simulationCanvas.context.scale(dpr, dpr);
    }

    private updateCanvasHeights(height: number) {
        if (!this.gridCanvas /*|| !this.componentCanvas || !this.simulationCanvas*/) {
            console.error("Null canvas");
            return;
        }
        const dpr = this._getDPR();
        this.gridCanvas.height = height * dpr;
        // this.componentCanvas.height = height * dpr;
        // this.simulationCanvas.height = height * dpr;
        this.gridCanvas.context.scale(dpr, dpr);
        // this.componentCanvas.context.scale(dpr, dpr);
        // this.simulationCanvas.context.scale(dpr, dpr);
    }

    // TODO: refactor canvas resizes to oversize the canvas to use fewer draw calls.  possibly debounce.
    @HostListener('window:resize', ['$event'])
    onResize(event: UIEvent) {
        if (!this.gridCanvas /*|| !this.componentCanvas || !this.simulationCanvas*/) {
            console.error("Null canvas");
            return;
        }
        const window = event.target as Window;
        let viewportWidth = this.viewport!.el.nativeElement.offsetWidth;
        let viewportHeight = this.viewport!.el.nativeElement.offsetHeight;
        if (this.gridCanvas.width < viewportWidth) {
            this.updateCanvasWidths(window.innerWidth + 100);
        }
        if (this.gridCanvas.height < viewportHeight) {
            this.updateCanvasHeights(window.innerHeight + 100);
        }
    }

    // will eventually add the tab index as an argument
    protected closeTab() {
        // closing tab removes it from the tab array which automatically updates the view
    }
}
