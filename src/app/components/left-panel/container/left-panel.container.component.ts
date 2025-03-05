import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { LeftPanelPresenterComponent } from "../presenter/left-panel.presenter.component";

@Component({
  selector: 'app-left-panel-container',
  imports: [
    CommonModule,
    LeftPanelPresenterComponent
],
  template: `
  <app-left-panel-presenter
    
  ></app-left-panel-presenter>
`
})
export class LeftPanelContainerComponent {
}