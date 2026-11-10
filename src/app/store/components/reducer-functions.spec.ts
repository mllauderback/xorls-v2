import { describe, it, expect } from 'vitest';
import * as functions from './reducer-functions';
import type { PaletteComponentsState, SelectedSelectable } from './state';
import { PaletteComponentCategories } from './state';
import type { PaletteComponent } from '../../models/components/PaletteComponent';
import { AndGate, OrGate } from '../../models/components/gates';
import { initialComponentsState } from './feature';
import { componentsReducer } from './feature';
import * as actions from './actions';

const buildMap = (selectedClassName?: string) =>
    new Map<PaletteComponentCategories, PaletteComponent[]>([
        [PaletteComponentCategories.gates, [
            { className: AndGate.name, selected: AndGate.name === selectedClassName },
            { className: OrGate.name, selected: OrGate.name === selectedClassName },
        ]],
    ]);

const buildState = (overrides: Partial<PaletteComponentsState> = {}): PaletteComponentsState => ({
    ...initialComponentsState,
    paletteComponentMap: buildMap(),
    ...overrides,
});

const placedGate = (): SelectedSelectable => ({ workspaceId: 'workspace-1', id: 'gate-1', className: AndGate.name });
const anyHighlighted = (state: PaletteComponentsState) => [...state.paletteComponentMap.values()].flat().some(c => c.selected);

describe('components reducer functions', () => {
    describe('setSelectedPaletteComponent', () => {
        it('should store the palette component', () => {
            const paletteComponent = { className: AndGate.name, selected: true };

            const state = functions.setSelectedPaletteComponent(buildState(), paletteComponent);

            expect(state.selectedPaletteComponent).toBe(paletteComponent);
        });

        it('should replace a previous palette selection', () => {
            const first = functions.setSelectedPaletteComponent(buildState(), { className: AndGate.name, selected: true });
            const state = functions.setSelectedPaletteComponent(first, { className: OrGate.name, selected: true });

            expect(state.selectedPaletteComponent?.className).toBe(OrGate.name);
        });

        it('should deselect a component that was selected in a diagram', () => {
            const state = functions.setSelectedPaletteComponent(
                buildState({ selectedSelectable: placedGate() }),
                { className: OrGate.name, selected: true }
            );

            expect(state.selectedSelectable).toBeNull();
        });
    });

    describe('setSelectedSelectable', () => {
        it('should store the reference it is given', () => {
            const selection = placedGate();

            const state = functions.setSelectedSelectable(buildState(), selection);

            expect(state.selectedSelectable).toBe(selection);
        });

        it('should end the palette selection, because only one thing is selected at a time', () => {
            const state = functions.setSelectedSelectable(buildState({
                paletteComponentMap: buildMap(AndGate.name),
                selectedPaletteComponent: { className: AndGate.name, selected: true },
            }), placedGate());

            expect(state.selectedPaletteComponent).toBeNull();
            expect(anyHighlighted(state)).toBe(false);
        });

        it('should replace the previous selection', () => {
            const next: SelectedSelectable = { workspaceId: 'workspace-1', id: 'gate-2', className: OrGate.name };

            const state = functions.setSelectedSelectable(buildState({ selectedSelectable: placedGate() }), next);

            expect(state.selectedSelectable).toBe(next);
        });

        it('should not mutate the previous state or its palette map', () => {
            const before = buildState({
                paletteComponentMap: buildMap(AndGate.name),
                selectedPaletteComponent: { className: AndGate.name, selected: true },
            });
            functions.setSelectedSelectable(before, placedGate());
            expect(anyHighlighted(before)).toBe(true);
            expect(before.selectedPaletteComponent).not.toBeNull();
        });
    });

    describe('clearSelectedPaletteComponent', () => {
        it('should end the placement and un-highlight the palette', () => {
            const state = functions.clearSelectedPaletteComponent(buildState({
                paletteComponentMap: buildMap(AndGate.name),
                selectedPaletteComponent: { className: AndGate.name, selected: true },
            }));

            expect(state.selectedPaletteComponent).toBeNull();
            expect(anyHighlighted(state)).toBe(false);
        });

        it('should leave a component selected in a diagram selected', () => {
            const selectedSelectable = placedGate();

            const state = functions.clearSelectedPaletteComponent(buildState({ selectedSelectable }));

            expect(state.selectedSelectable).toBe(selectedSelectable);
        });

        it('should be harmless when nothing is selected', () => {
            const state = functions.clearSelectedPaletteComponent(buildState());
            expect(state.selectedSelectable).toBeNull();
            expect(state.selectedPaletteComponent).toBeNull();
        });
    });

    describe('clearSelection', () => {
        it('should end the placement and un-highlight the palette', () => {
            const state = functions.clearSelection(buildState({
                paletteComponentMap: buildMap(AndGate.name),
                selectedPaletteComponent: { className: AndGate.name, selected: true },
            }));

            expect(state.selectedPaletteComponent).toBeNull();
            expect(anyHighlighted(state)).toBe(false);
        });

        it('should deselect a component that was selected in a diagram', () => {
            const state = functions.clearSelection(buildState({ selectedSelectable: placedGate() }));

            expect(state.selectedSelectable).toBeNull();
        });

        it('should return the same state when nothing is selected', () => {
            const before = buildState();
            expect(functions.clearSelection(before)).toBe(before);
        });

        it('should not mutate the previous state or its palette map', () => {
            const before = buildState({
                paletteComponentMap: buildMap(AndGate.name),
                selectedPaletteComponent: { className: AndGate.name, selected: true },
                selectedSelectable: placedGate(),
            });
            functions.clearSelection(before);
            expect(anyHighlighted(before)).toBe(true);
            expect(before.selectedSelectable).not.toBeNull();
        });

        it('should clear through the reducer with the clearSelection action', () => {
            const state = componentsReducer(buildState({ selectedSelectable: placedGate() }), actions.clearSelection());
            expect(state.selectedSelectable).toBeNull();
        });
    });

    describe('componentsReducer', () => {
        it('should start with nothing selected', () => {
            expect(initialComponentsState.selectedPaletteComponent).toBeNull();
            expect(initialComponentsState.selectedSelectable).toBeNull();
        });

        it('should select a palette component with the selectPaletteComponent action', () => {
            const paletteComponent = { className: AndGate.name, selected: true };

            const state = componentsReducer(buildState(), actions.selectPaletteComponent({ paletteComponent }));

            expect(state.selectedPaletteComponent).toBe(paletteComponent);
            expect(state.selectedSelectable).toBeNull();
        });

        it('should select a placed component with the selectSelectable action', () => {
            const selectable = placedGate();

            const state = componentsReducer(buildState({
                paletteComponentMap: buildMap(AndGate.name),
                selectedPaletteComponent: { className: AndGate.name, selected: true },
            }), actions.selectSelectable({ selectable }));

            expect(state.selectedSelectable).toBe(selectable);
            expect(state.selectedPaletteComponent).toBeNull();
        });

        it('should keep the palette component selected until the selection is cleared, however many are placed', () => {
            const paletteComponent = { className: AndGate.name, selected: true };
            let state = componentsReducer(buildState({ paletteComponentMap: buildMap(AndGate.name) }), actions.selectPaletteComponent({ paletteComponent }));

            // placing a component changes nothing in the store: the workspace makes the next ghost itself
            state = componentsReducer(state, actions.setPaletteComponentMap({ paletteComponentMap: state.paletteComponentMap }));

            expect(state.selectedPaletteComponent).toBe(paletteComponent);
            expect([...state.paletteComponentMap.values()].flat().filter(c => c.selected).map(c => c.className)).toEqual([AndGate.name]);
        });

        it('should end a placement with clearSelection', () => {
            const paletteComponent = { className: AndGate.name, selected: true };
            let state = componentsReducer(buildState({ paletteComponentMap: buildMap(AndGate.name) }), actions.selectPaletteComponent({ paletteComponent }));

            state = componentsReducer(state, actions.clearSelection());

            expect(state.selectedPaletteComponent).toBeNull();
            expect(state.selectedSelectable).toBeNull();
            expect(anyHighlighted(state)).toBe(false);
        });

        it('should cancel a placement with clearSelectedPaletteComponent', () => {
            const paletteComponent = { className: AndGate.name, selected: true };
            let state = componentsReducer(buildState(), actions.selectPaletteComponent({ paletteComponent }));
            state = componentsReducer(state, actions.clearSelectedPaletteComponent());
            expect(state.selectedPaletteComponent).toBeNull();
        });

        it('should keep the selection plain data, so it survives a JSON round trip unchanged', () => {
            const selectable = placedGate();
            const state = componentsReducer(buildState(), actions.selectSelectable({ selectable }));

            expect(JSON.parse(JSON.stringify(state.selectedSelectable))).toEqual(selectable);
        });
    });
});
