import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import type { Observable } from 'rxjs';
import { map } from 'rxjs';
import type { PropertyChange } from "../presenter/selectable-properties.presenter.component";
import { SelectablePropertiesPresenterComponent } from "../presenter/selectable-properties.presenter.component";
import type { PaletteComponentsState } from '../../../store/components/state';
import { componentsFeature } from '../../../store/components/feature';
import * as actions from '../../../store/components/actions';
import type { PropertyListItem } from '../../../models/Property';

/**
 * Shows the properties of the previewed or selected component from the store, and puts the edits made in the panel
 * back in it. The workspace that owns the component keeps it in step with the store.
 */
@Component({
    selector: 'app-selectable-properties-container',
    imports: [
        SelectablePropertiesPresenterComponent,
        CommonModule
    ],
    template: `
    <app-selectable-properties-presenter
      [type]="type$ | async"
      [properties]="(properties$ | async) ?? []"
      (propertyChange)="onPropertyChange($event)"
    ></app-selectable-properties-presenter>
  `,
})
export class SelectablePropertiesContainerComponent {
    private store = inject<Store<PaletteComponentsState>>(Store);

    /** The kind of component whose properties are shown, or null when none are. */
    protected type$: Observable<string | null> = this.store.select(componentsFeature.selectSelectableProperties).pipe(
        map(properties => properties?.target.type ?? null)
    );
    protected properties$: Observable<PropertyListItem[]> = this.store.select(componentsFeature.selectOrderedSelectableProperties);

    protected onPropertyChange({ field, value }: PropertyChange) {
        this.store.dispatch(actions.updateSelectableProperty({ field, value }));
    }
}
