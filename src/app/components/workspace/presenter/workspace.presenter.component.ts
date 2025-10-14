import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, HostListener, OnDestroy, ViewChild } from '@angular/core';
import { TabPanels, TabsModule } from 'primeng/tabs';
import { ButtonModule } from 'primeng/button';
import { Grid, GridMode } from '../../../models/Grid';
import { Component as DrawableComponent } from '../../../models/components/Component';
import { Decoration as DrawableDecoration } from '../../../models/components/Decoration';
import { DrawService } from '../../../services/draw/draw.service';
import { CanvasWrapper } from '../../../models/components/CanvasWrapper';

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
export class WorkspacePresenterComponent implements AfterViewInit, OnDestroy {
    @ViewChild('grid') gridCanvasRef?: ElementRef<HTMLCanvasElement>;
    @ViewChild('component') componentCanvasRef?: ElementRef<HTMLCanvasElement>;
    @ViewChild('simulation') simulationCanvasRef?: ElementRef<HTMLCanvasElement>;

    @ViewChild('contentViewport') viewport?: TabPanels;
    // Will need to keep track of tabs programatically as an array.

    // canvases
    private gridCanvas: CanvasWrapper | null;
    private componentCanvas: CanvasWrapper | null;
    private simulationCanvas: CanvasWrapper | null;

    private grid: Grid | null;
    // private origin: Point; // deprecated: this should always be (0,0) and panning moves the entire canvas in the viewport.

    private components: DrawableComponent[];
    private decorations: DrawableDecoration[];

    constructor(private drawService: DrawService) {
        this.gridCanvas = null;
        this.grid = null;

        this.componentCanvas = null;
        this.simulationCanvas = null;

        this.components = [];
        this.decorations = [];
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

    ngOnDestroy(): void {
        this.grid?.unsubscribeAll();
    }

    private setup() {
        this.gridCanvas = new CanvasWrapper(this.gridCanvasRef!.nativeElement);
        this.componentCanvas = new CanvasWrapper(this.componentCanvasRef!.nativeElement);
        this.simulationCanvas = new CanvasWrapper(this.simulationCanvasRef!.nativeElement);

        if (
            !this.gridCanvas.hasValidContext() ||
            !this.componentCanvas.hasValidContext() ||
            !this.simulationCanvas.hasValidContext()
        ) {
            throw new Error("One or more canvas contexts are null!");
        }

        this.gridCanvas.width = this.viewport!.el.nativeElement.offsetWidth;
        this.gridCanvas.height = this.viewport!.el.nativeElement.offsetHeight;

        // pass in width/height observables from grid canvas wrapper so grid is automatically notified of changes
        this.grid = new Grid(this.drawService, this.gridCanvas.getWidthAsObservable(), this.gridCanvas.getHeightAsObservable());

        this.componentCanvas.width = this.viewport!.el.nativeElement.offsetWidth;
        this.componentCanvas.height = this.viewport!.el.nativeElement.offsetHeight;
        this.simulationCanvas.width = this.viewport!.el.nativeElement.offsetWidth;
        this.simulationCanvas.height = this.viewport!.el.nativeElement.offsetHeight;

        // configure grid (should be defaults)
        // this.grid.gridMode = GridMode.dots;
        this.drawService.drawSingle(this.grid, this.gridCanvas, true);

        // this.drawLoop();
    }

    // private drawLoop() {
    //     this.drawService.draw(this.origin, this.gridCanvas!);
    //     this.drawService.draw(this.origin, this.componentCanvas!);
    //     this.drawService.draw(this.origin, this.simulationCanvas!);
    //     requestAnimationFrame(this.drawLoop.bind(this));
    // }

    private updateCanvasWidths(width: number) {
        if (!this.gridCanvas || !this.componentCanvas || !this.simulationCanvas) {
            console.error("Null canvas");
            return;
        }
        this.gridCanvas.width = width;
        this.componentCanvas.width = width;
        this.simulationCanvas.width = width;
    }

    private updateCanvasHeights(height: number) {
        if (!this.gridCanvas || !this.componentCanvas || !this.simulationCanvas) {
            console.error("Null canvas");
            return;
        }
        this.gridCanvas.width = height;
        this.componentCanvas.width = height;
        this.simulationCanvas.width = height;
    }

    @HostListener('window:resize', ['$event'])
    onResize(event: UIEvent) {
        if (!this.gridCanvas || !this.componentCanvas || !this.simulationCanvas) {
            console.error("Null canvas");
            return;
        }
        const window = event.target as Window;
        let redraw = false;
        let viewportWidth = this.viewport!.el.nativeElement.offsetWidth;
        let viewportHeight = this.viewport!.el.nativeElement.offsetHeight;
        if (this.gridCanvas.width < viewportWidth || this.componentCanvas.width < viewportWidth || this.simulationCanvas.width < viewportWidth) {
            console.log(this.gridCanvas.width);
            console.log(viewportWidth);
            this.updateCanvasWidths(viewportWidth);
            redraw = true;
        }
        if (this.gridCanvas.height < viewportHeight || this.componentCanvas.height < viewportHeight || this.simulationCanvas.height < viewportHeight) {
            this.updateCanvasHeights(window.innerHeight);
            redraw = true;
        }
        if (redraw) {
            console.log("redraw");
        }
    }

    // will eventually add the tab index as an argument
    protected closeTab() {
        // closing tab removes it from the tab array which automatically updates the view
    }

}
