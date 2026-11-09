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
import { createPlaceable } from '../../../models/components/ComponentFactory';
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
            // toggled off: drop the pending ghost, if there is one
            this.store.dispatch(actions.clearSelectedPaletteComponent());
            this.store.dispatch(workspaceActions.updateMouseMode({ mode: 'select' }));
            return;
        }

        // The ghost is placed in a diagram by the workspace, which positions it at the mouse. Until then it has no meaningful position.
        const selectable = createPlaceable(selected.className, { x: 0, y: 0 });
        selectable.isGhost = true;
        this.store.dispatch(actions.selectPaletteComponent({
            paletteComponent: selected,
            selectable,
            concreteClassName: selected.className
        }));
        this.store.dispatch(workspaceActions.updateMouseMode({ mode: 'place' }));
    }
}
