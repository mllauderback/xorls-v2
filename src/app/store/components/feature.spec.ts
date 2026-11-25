import { TestBed } from '@angular/core/testing';
import { provideStore, Store } from '@ngrx/store';
import { describe, it, expect, beforeEach } from 'vitest';
import { componentsFeature, selectOrderedSelectableProperties, selectSelectableProperties, selectSelectedPaletteComponent, selectSelectedSelectable } from './feature';
import { Input } from '../../models/components/io';
import * as actions from './actions';
import { firstValueFrom } from 'rxjs';
import { ComponentType } from '../../models/components/Component';

/**
 * Runs the feature in a real store with NgRx's default runtime checks, which deep-freeze the state and every action
 * and throw on a change made in place. The app's store has them on too, so this catches state that isn't plain data.
 */
describe('componentsFeature in a store with the runtime checks on', () => {
    let store: Store;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideStore({ [componentsFeature.name]: componentsFeature.reducer })],
        });
        store = TestBed.inject(Store);
    });

    it('should accept the palette selection and the selection of a placed component', async () => {
        store.dispatch(actions.selectPaletteComponent({ paletteComponent: { type: ComponentType.AndGate, selected: true } }));
        expect(await firstValueFrom(store.select(selectSelectedPaletteComponent))).toEqual({ type: ComponentType.AndGate, selected: true });

        store.dispatch(actions.selectSelectable({ selectable: { workspaceId: 'w', id: 'c', type: ComponentType.AndGate } }));
        expect(await firstValueFrom(store.select(selectSelectedSelectable))).toEqual({ workspaceId: 'w', id: 'c', type: ComponentType.AndGate });
        expect(await firstValueFrom(store.select(selectSelectedPaletteComponent))).toBeNull();
    });

    it('should hand out a selection that cannot be changed in place', async () => {
        store.dispatch(actions.selectSelectable({ selectable: { workspaceId: 'w', id: 'c', type: ComponentType.AndGate } }));
        const selection = (await firstValueFrom(store.select(selectSelectedSelectable)))!;

        expect(Object.isFrozen(selection)).toBe(true);
    });

    it('should clear the selection', async () => {
        store.dispatch(actions.selectSelectable({ selectable: { workspaceId: 'w', id: 'c', type: ComponentType.AndGate } }));
        store.dispatch(actions.clearSelection());

        expect(await firstValueFrom(store.select(selectSelectedSelectable))).toBeNull();
    });
    it('should hold a component\'s properties as frozen plain data, and edit them', async () => {
        const values = new Input({ x: 0, y: 0 }).properties.serialize();
        store.dispatch(actions.loadSelectableProperties({ properties: { target: { kind: 'preview', workspaceId: 'w', type: ComponentType.Input }, values } }));

        store.dispatch(actions.updateSelectableProperty({ field: 'Output Value', value: '1' }));
        const properties = (await firstValueFrom(store.select(selectSelectableProperties)))!;

        expect(properties.values['Output Value']).toEqual({ value: '1', readonly: false });
        expect(Object.isFrozen(properties.values['Output Value'])).toBe(true);
        expect(JSON.parse(JSON.stringify(properties))).toEqual(properties);
    });

    it('should list the properties in order, whatever order the store holds them in', async () => {
        expect(await firstValueFrom(store.select(selectOrderedSelectableProperties))).toEqual([]);

        store.dispatch(actions.loadSelectableProperties({
            properties: {
                target: { kind: 'preview', workspaceId: 'w', type: ComponentType.Text },
                values: { 'Font Size': { value: 14, readonly: false }, 'Orientation': { value: 'East', readonly: false } },
            },
        }));

        const list = await firstValueFrom(store.select(selectOrderedSelectableProperties));

        expect(list.map(item => item.field)).toEqual(['Orientation', 'Font Size']);
    });
});
