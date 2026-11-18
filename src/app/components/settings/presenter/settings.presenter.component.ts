import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { SliderModule } from 'primeng/slider';
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
@Component({
    selector: 'app-settings-presenter',
    imports: [
        DividerModule,
        CheckboxModule,
        SelectButtonModule,
        FormsModule,
        Tooltip,
        FieldsetModule,
        ButtonModule,
        SliderModule,
        DecimalPipe
    ],
    templateUrl: './settings.presenter.component.html',
    styleUrl: './settings.presenter.component.scss'
})
export class SettingsPresenterComponent {
    @Input({ required: true }) settings?: SettingsState | null;
    @Output() gridMode = new EventEmitter<GridMode>();
    @Output() gridSpacing = new EventEmitter<number>();
    @Output() zoomScrollRate = new EventEmitter<number>();
    @Output() zoomPinchRate = new EventEmitter<number>();
    @Output() minZoom = new EventEmitter<number>();
    @Output() maxZoom = new EventEmitter<number>();
    @Output() invertScroll = new EventEmitter<boolean>();

    // will be an initialization error if the gridmode type changes and this isn't updated.
    protected readonly tmpObj: Record<GridMode, undefined> = {
        lines: undefined,
        dots: undefined
    };
    protected readonly gridModes = Object.keys(this.tmpObj) as GridMode[];

    /** The range and step of the cell size slider: whole pixels, as cells are drawn a whole number of pixels across. */
    protected readonly gridSpacingSlider: SliderRange = { min: 5, max: 100, step: 1 };

    /**
     * The range and step of each zoom slider, around the defaults. The smallest zoom stops at 1x and the largest
     * starts there, so the smallest can't be set above the largest.
     */
    protected readonly zoomSliders: Record<'scrollRate' | 'pinchRate' | 'minZoom' | 'maxZoom', SliderRange> = {
        // 1.05x to 1.65x per 100px wheel notch
        scrollRate: { min: 0.0005, max: 0.005, step: 0.0001 },
        pinchRate: { min: 0.002, max: 0.03, step: 0.001 },
        minZoom: { min: 0.1, max: 1, step: 0.05 },
        maxZoom: { min: 1, max: 10, step: 0.5 },
    };
}

/** Where a slider starts and ends, and how far one step moves it. */
interface SliderRange {
    min: number;
    max: number;
    step: number;
}
