import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';

import { StatusbarComponent } from "./components/statusbar/statusbar.component";
import { LeftPanelContainerComponent } from './components/left-panel/container/left-panel.container.component';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    CommonModule,
    StatusbarComponent,
    LeftPanelContainerComponent
],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'xorls';
}
