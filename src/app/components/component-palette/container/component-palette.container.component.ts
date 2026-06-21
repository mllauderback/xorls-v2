import type { OnDestroy} from '@angular/core';
import { Component, inject } from '@angular/core';
import { ComponentPalettePresenterComponent } from "../presenter/component-palette.presenter.component";
import { Store } from '@ngrx/store';
import type { PaletteComponentCategories, PaletteComponentsState } from '../../../store/components/components.state';
import type { Subscription } from 'rxjs';
import { componentsFeature, initialComponentsState } from '../../../store/components/components.feature';
import { CommonModule } from '@angular/common';
import type { PaletteComponent } from '../../../models/components/PaletteComponent';

@Component({
  selector: 'app-component-palette-container',
  imports: [
    ComponentPalettePresenterComponent,
    CommonModule
  ],
  template: `
    <app-component-palette-presenter
    [categoryPaletteComponentMap]="categoryPaletteComponentMap"
    ></app-component-palette-presenter>
  `
})
export class ComponentPaletteContainerComponent implements OnDestroy {
  private store = inject<Store<PaletteComponentsState>>(Store);

  protected categoryPaletteComponentMap!: Map<PaletteComponentCategories, PaletteComponent[]>;
  protected componentsInfoListSubscription: Subscription;

  constructor() {
    this.componentsInfoListSubscription = this.store.select(componentsFeature.selectPaletteComponentMap).subscribe({
      next: (map) => {
        this.categoryPaletteComponentMap = map;
      },
      error: () => {
        this.categoryPaletteComponentMap = initialComponentsState.paletteComponentMap;
      },
    });
  }

  ngOnDestroy(): void {
    this.componentsInfoListSubscription.unsubscribe();
  }
}
