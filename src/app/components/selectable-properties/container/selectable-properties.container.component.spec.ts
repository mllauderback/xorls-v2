import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { By } from '@angular/platform-browser';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { describe, beforeEach, it, expect, vi } from 'vitest';

import { SelectablePropertiesContainerComponent } from './selectable-properties.container.component';
import { SelectablePropertiesPresenterComponent } from '../presenter/selectable-properties.presenter.component';
import type { PropertyChange } from '../presenter/selectable-properties.presenter.component';
import { selectOrderedSelectableProperties, selectSelectableProperties } from '../../../store/components/feature';
import * as actions from '../../../store/components/actions';
import type { SelectableProperties } from '../../../store/components/state';
import { ComponentType } from '../../../models/components/Component';
import { toOrderedList } from '../../../models/Property';
import type { PropertyListItem } from '../../../models/Property';

@Component({ selector: 'app-selectable-properties-presenter', template: '' })
class MockPresenterComponent {
    @Input() type: string | null = null;
    @Input() properties: PropertyListItem[] = [];
    @Output() propertyChange = new EventEmitter<PropertyChange>();
}

describe('SelectablePropertiesContainerComponent', () => {
    let fixture: ComponentFixture<SelectablePropertiesContainerComponent>;
    let store: MockStore;

    const shown: SelectableProperties = {
        target: { kind: 'preview', workspaceId: 'w', type: ComponentType.AndGate },
        values: { 'Orientation': { value: 'East', readonly: false }, 'Number of Inputs': { value: 2, readonly: false } },
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [SelectablePropertiesContainerComponent],
            providers: [provideMockStore({
                selectors: [
                    { selector: selectSelectableProperties, value: null },
                    { selector: selectOrderedSelectableProperties, value: [] },
                ],
            })],
        })
            .overrideComponent(SelectablePropertiesContainerComponent, {
                remove: { imports: [SelectablePropertiesPresenterComponent] },
                add: { imports: [MockPresenterComponent] },
            })
            .compileComponents();

        store = TestBed.inject(MockStore);
        fixture = TestBed.createComponent(SelectablePropertiesContainerComponent);
        fixture.detectChanges();
    });

    function presenter() {
        return fixture.debugElement.query(By.directive(MockPresenterComponent)).componentInstance as MockPresenterComponent;
    }

    it('should show nothing while no properties are shown', () => {
        expect(presenter().type).toBeNull();
        expect(presenter().properties).toEqual([]);
    });

    it('should pass the shown properties, in order, and what kind of component they belong to', () => {
        const list = toOrderedList(shown.values);
        store.overrideSelector(selectSelectableProperties, shown);
        store.overrideSelector(selectOrderedSelectableProperties, list);
        store.refreshState();
        fixture.detectChanges();

        expect(presenter().type).toBe(ComponentType.AndGate);
        expect(presenter().properties).toBe(list);
    });

    it('should put an edit in the store', () => {
        const dispatch = vi.spyOn(store, 'dispatch');

        presenter().propertyChange.emit({ field: 'Number of Inputs', value: 4 });

        expect(dispatch).toHaveBeenCalledWith(actions.updateSelectableProperty({ field: 'Number of Inputs', value: 4 }));
    });
});
