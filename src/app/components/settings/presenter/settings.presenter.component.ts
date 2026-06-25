import { Component, EventEmitter, Input, Output } from '@angular/core';
import { InputNumberModule } from 'primeng/inputnumber';
import { DividerModule } from 'primeng/divider';
import { CheckboxModule } from 'primeng/checkbox';
import { SelectButtonModule } from 'primeng/selectbutton';
import { FormsModule } from '@angular/forms';
import { Tooltip } from 'primeng/tooltip';
import { FieldsetModule } from 'primeng/fieldset';
import { ButtonModule } from 'primeng/button';
import type { SettingsState } from '../../../store/settings/state';
import type { GridMode } from '../../canvas-layers/grid-canvas-layer/Grid';

// TODO: come up with a decent visual layout for this page.  It is messy.
// TOOD: bind the enter key to an apply changes emitter so changing number values like the grid spacing doesn't happen while editing the field
@Component({
    selector: 'app-settings-presenter',
    imports: [
    InputNumberModule,
    DividerModule,
    CheckboxModule,
    SelectButtonModule,
    FormsModule,
    Tooltip,
    FieldsetModule,
    ButtonModule
],
    templateUrl: './settings.presenter.component.html',
    styleUrl: './settings.presenter.component.scss'
})
export class SettingsPresenterComponent {
    @Input({ required: true }) settings?: SettingsState | null;
    @Output() gridMode = new EventEmitter<GridMode>();
    @Output() gridSpacing = new EventEmitter<number>();

    // will be an initialization error if the gridmode type changes and this isn't updated.
    protected readonly tmpObj: Record<GridMode, undefined> = {
        lines: undefined,
        dots: undefined
    };
    protected readonly gridModes = Object.keys(this.tmpObj) as GridMode[];
}
