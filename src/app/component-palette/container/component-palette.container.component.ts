import { Component, OnDestroy } from '@angular/core';
import { ComponentPalettePresenterComponent } from "../presenter/component-palette.presenter.component";
import { Store } from '@ngrx/store';
import { PaletteComponentList, PaletteComponentsState } from '../../store/components/components.state';
import { Subscription } from 'rxjs';
import { componentsFeature, initialComponentsState } from '../../store/components/components.feature';
import { CommonModule } from '@angular/common';
import { PaletteComponent } from '../../models/components/PaletteComponent';

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
  protected categoryPaletteComponentMap!: Map<string, PaletteComponent[]>;
  protected componentsInfoListSubscription: Subscription;

  constructor(private store: Store<PaletteComponentsState>) {
    this.componentsInfoListSubscription = this.store.select(componentsFeature.selectPaletteComponentList).subscribe({
      next: (list) => {
        let componentsInfoList = Object.assign({}, list);
        this.categoryPaletteComponentMap = this.createCategoryPaletteComponentMap(componentsInfoList);
      },
      error: () => {
        this.categoryPaletteComponentMap = this.createCategoryPaletteComponentMap(initialComponentsState.paletteComponentList);
      },
    });
  }

  createCategoryPaletteComponentMap(componentsInfoList: PaletteComponentList): Map<string, PaletteComponent[]> {
    let map = new Map<string, PaletteComponent[]>();
    for (const [key, value] of Object.entries(componentsInfoList)) {
      map.set(key, value);
    }
    return map;
  }

  ngOnDestroy(): void {
    this.componentsInfoListSubscription.unsubscribe();
  }
}
