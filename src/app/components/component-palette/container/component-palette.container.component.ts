import { Component, inject } from '@angular/core';
import { ComponentPalettePresenterComponent } from "../presenter/component-palette.presenter.component";
import { Store } from '@ngrx/store';
import type { PaletteComponentRecord, PaletteComponentsState } from '../../../store/components/state';
import type { Observable } from 'rxjs';
import { selectPaletteComponents } from '../../../store/components/feature';
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
    @if (categoryPaletteComponents$ | async; as record) {
        <app-component-palette-presenter
            [categoryPaletteComponents]="record"
            (categoryPaletteComponentsChange)="updateCategoryPaletteComponents($event)"
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

    protected categoryPaletteComponents$: Observable<PaletteComponentRecord>;

    constructor() {
        this.categoryPaletteComponents$ = this.store.select(selectPaletteComponents);
    }

    updateCategoryPaletteComponents(record: PaletteComponentRecord) {
        this.store.dispatch(actions.setPaletteComponents({ paletteComponents: record }));

        const selected = Object.values(record).flat().find(paletteComponent => paletteComponent.selected);
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
