import { CommonModule } from "@angular/common";
import { Component, inject } from "@angular/core";
import { LeftPanelPresenterComponent } from "../presenter/left-panel.presenter.component";
import { Store } from "@ngrx/store";
import { SettingsState } from "../../store/settings/state";

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