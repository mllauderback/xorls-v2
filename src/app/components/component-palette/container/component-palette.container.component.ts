import { Component, inject } from '@angular/core';
import { ComponentPalettePresenterComponent } from "../presenter/component-palette.presenter.component";
import { Store } from '@ngrx/store';
import type { PaletteComponentCategories, PaletteComponentsState } from '../../../store/components/state';
import type { Observable } from 'rxjs';
import { selectPaletteComponentMap } from '../../../store/components/feature';
import type { PaletteComponent } from '../../../models/components/PaletteComponent';
import { CommonModule } from '@angular/common';
import * as actions from '../../../store/components/actions';
import * as workspaceActions from '../../../store/workspace/actions';
import { SelectablePropertiesContainerComponent } from "../../selectable-properties/container/selectable-properties.container.component";

@Component({
    selector: 'app-component-palette-container',
    imports: [
        CommonModule,
        ComponentPalettePresenterComponent,
        SelectablePropertiesContainerComponent
    ],
    template: `
    @if (categoryPaletteComponentMap$ | async; as map) {
        <app-component-palette-presenter
            [categoryPaletteComponentMap]="map"
            (categoryPaletteComponentMapChange)="updateCategoryPaletteComponentMap($event)"
        >
            <app-selectable-properties-container propertiesPanel />  
        </app-component-palette-presenter>
    }
    @else {
        <p>Loading component palette...</p>
    }
  `
})
export class ComponentPaletteContainerComponent {
    private store = inject<Store<PaletteComponentsState>>(Store);

    protected categoryPaletteComponentMap$: Observable<Map<PaletteComponentCategories, PaletteComponent[]>>;

    constructor() {
        this.categoryPaletteComponentMap$ = this.store.select(selectPaletteComponentMap);
    }

    updateCategoryPaletteComponentMap(map: Map<PaletteComponentCategories, PaletteComponent[]>) {
        this.store.dispatch(actions.setPaletteComponentMap({ paletteComponentMap: map }));

        const selected = [...map.values()].flat().find(paletteComponent => paletteComponent.selected);
        if (!selected) {
            // toggled off: the workspace drops its preview
            this.store.dispatch(actions.clearSelectedPaletteComponent());
            this.store.dispatch(workspaceActions.updateMouseMode({ mode: 'select' }));
            return;
        }

        // The palette presenter changes its entries in place, so the store gets its own copy. The workspace previews
        // the component as a ghost by itself, from the class name, and positions it at the mouse.
        this.store.dispatch(actions.selectPaletteComponent({ paletteComponent: { ...selected } }));
        this.store.dispatch(workspaceActions.updateMouseMode({ mode: 'place' }));
    }
}
