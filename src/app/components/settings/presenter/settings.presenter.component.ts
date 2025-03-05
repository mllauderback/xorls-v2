import { Component, EventEmitter, Input, Output } from '@angular/core';
import { InputNumberModule } from 'primeng/inputnumber';
import { DividerModule } from 'primeng/divider';
import { CheckboxModule } from 'primeng/checkbox';
import { FormsModule } from '@angular/forms';
import { Tooltip } from 'primeng/tooltip';
import { FieldsetModule } from 'primeng/fieldset';
import { ButtonModule } from 'primeng/button';
import { SettingsState } from '../../../store/settings/state';

@Component({
  selector: 'app-settings-presenter',
  imports: [
    InputNumberModule,
    DividerModule,
    CheckboxModule,
    FormsModule,
    Tooltip,
    FieldsetModule,
    ButtonModule
  ],
  templateUrl: './settings.presenter.component.html',
  styleUrl: './settings.presenter.component.scss'
})
export class SettingsPresenterComponent {
  @Input({ required: true }) settings!: SettingsState;
  @Output() settingsChange = new EventEmitter<SettingsState>();
  @Output() applyChanges = new EventEmitter<void>();

  updateSettings(settings: SettingsState): void {
    this.settings = settings;
    this.settingsChange.emit(this.settings);
  }

  applySettingsChanges(): void {
    this.applyChanges.emit();
  }
}
