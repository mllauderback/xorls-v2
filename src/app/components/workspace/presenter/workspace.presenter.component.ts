import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import { TabPanels, TabsModule } from 'primeng/tabs';
import { ButtonModule } from 'primeng/button';
import { Grid, GridMode } from '../../../models/Grid';
import { Point } from '../../../models/Point';
import { DrawService } from '../../../services/draw/draw.service';
import { BufferedCanvas } from '../../../models/BufferedCanvas';

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

  @ViewChild('gridBuffer') gridBufferCanvasRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('componentBuffer') componentBufferCanvasRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('simulationBuffer') simulationBufferCanvasRef?: ElementRef<HTMLCanvasElement>;

  @ViewChild('contentViewport') viewport?: TabPanels;
  // Will need to keep track of tabs programatically as an array.

  // buffered canvases
  private gridCanvas: BufferedCanvas | null;
  private componentCanvas: BufferedCanvas | null;
  private simulationCanvas: BufferedCanvas | null;

  private grid: Grid;
  private origin: Point;

  constructor(private drawService: DrawService) {
    this.grid = new Grid();
    this.origin = { x: 0, y: 0 };

    this.gridCanvas = null;
    this.componentCanvas = null;
    this.simulationCanvas = null;
  }

  // canvas will only be defined after this lifecycle hook
  ngAfterViewInit(): void {
    if (
      !this.componentCanvasRef ||
      !this.gridCanvasRef ||
      !this.simulationCanvasRef ||
      !this.gridBufferCanvasRef ||
      !this.componentBufferCanvasRef ||
      !this.simulationBufferCanvasRef ||
      !this.viewport
    ) {
      throw new Error("Null canvas refs.");
    }

    this.setup();
  }

  private setup() {
    this.gridCanvas = new BufferedCanvas(this.gridCanvasRef!.nativeElement, this.gridBufferCanvasRef!.nativeElement);
    this.componentCanvas = new BufferedCanvas(this.componentCanvasRef!.nativeElement, this.componentBufferCanvasRef!.nativeElement);
    this.simulationCanvas = new BufferedCanvas(this.simulationCanvasRef!.nativeElement, this.simulationBufferCanvasRef!.nativeElement);

    if (
      !this.gridCanvas.hasValidContexts() ||
      !this.componentCanvas.hasValidContexts() ||
      !this.simulationCanvas.hasValidContexts()
    ) {
      throw new Error("Canvas contexts are null!");
    }

    this.gridCanvas.setWidth(this.viewport!.el.nativeElement.offsetWidth);
    this.gridCanvas.setHeight(this.viewport!.el.nativeElement.offsetHeight);
    this.componentCanvas.setWidth(this.viewport!.el.nativeElement.offsetWidth);
    this.componentCanvas.setHeight(this.viewport!.el.nativeElement.offsetHeight);
    this.simulationCanvas.setWidth(this.viewport!.el.nativeElement.offsetWidth);
    this.simulationCanvas.setHeight(this.viewport!.el.nativeElement.offsetHeight);

    // draw grid
    this.gridCanvas.drawables.push(this.grid);
    // this.grid.gridMode = GridMode.dots;
    this.drawService.redrawBuffer(this.origin, this.gridCanvas);

    this.drawLoop();
  }

  private drawLoop() {
    this.drawService.draw(this.origin, this.gridCanvas!);
    this.drawService.draw(this.origin, this.componentCanvas!);
    this.drawService.draw(this.origin, this.simulationCanvas!);
    requestAnimationFrame(this.drawLoop.bind(this));
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: UIEvent) {
    if (!this.gridCanvas || !this.componentCanvas || !this.simulationCanvas) {
      console.error("Null canvas");
      return;
    }
    const window = event.target as Window;
    let redraw = false;
    if (this.gridCanvas.getWidth() < window.innerWidth || this.componentCanvas.getWidth() || this.componentCanvas.getWidth()) {
      this.gridCanvas.setWidth(window.innerWidth);
      this.componentCanvas.setWidth(window.innerWidth);
      this.simulationCanvas.setWidth(window.innerWidth);
      redraw = true;
    }
    if (this.gridCanvas.getHeight() < window.innerHeight) {
      this.gridCanvas.setHeight(window.innerHeight);
      this.componentCanvas.setHeight(window.innerHeight);
      this.simulationCanvas.setHeight(window.innerHeight);
      redraw = true;
    }

    if (redraw) {
      this.drawService.redrawBuffer(this.origin, this.gridCanvas, false);
      this.drawService.redrawBuffer(this.origin, this.componentCanvas, false);
      this.drawService.redrawBuffer(this.origin, this.simulationCanvas, false);
    }
  }

  // will eventually add the tab index as an argument
  protected closeTab() {
    // closing tab removes it from the tab array which automatically updates
    // the view.
  }

}
