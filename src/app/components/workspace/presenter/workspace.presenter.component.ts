import { AfterContentInit, AfterViewChecked, AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { TabList, TabPanels, TabsModule } from 'primeng/tabs';
import { ButtonModule } from 'primeng/button';

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
  @ViewChild('canvas') canvasRef?: ElementRef<HTMLCanvasElement>;
  @ViewChild('contentViewport') viewport?: TabPanels;
  // Will need to keep track of tabs programatically as an array.

  // canvas will only be defined after this lifecycle hook
  ngAfterViewInit(): void {
    if (!this.canvasRef || !this.viewport) {
      console.error("Canvas is undefined!");
      return;
    }
    // set canvas color
    this.canvasRef.nativeElement.style.backgroundColor="#FFFFFF";
    // set canvas viewport height and width
    this.canvasRef.nativeElement.width = this.viewport.el.nativeElement.offsetWidth;
    this.canvasRef.nativeElement.height = this.viewport.el.nativeElement.offsetHeight + 300;
  }

  // will eventuall add the tab index as an argument
  protected closeTab() {
    // closing tab removes it from the tab array which automatically updates
    // the view.
  }

}
