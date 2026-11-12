import { TestBed } from '@angular/core/testing';
import { provideStore, Store } from '@ngrx/store';
import { describe, it, expect, beforeEach } from 'vitest';
import { componentsFeature, selectSelectedPaletteComponent, selectSelectedSelectable } from './feature';
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
});
