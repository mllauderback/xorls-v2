import { describe, it, expect } from 'vitest';
import * as functions from './reducer-functions';
import type { PaletteComponentsState, PaletteComponentRecord, SelectedSelectable } from './state';
import { PaletteComponentCategories } from './state';
import { initialComponentsState } from './feature';
import { componentsReducer } from './feature';
import * as actions from './actions';
import { ComponentType } from '../../models/components/Component';

const buildRecord = (selectedClassName?: string): PaletteComponentRecord => ({
    [PaletteComponentCategories.gates]: [
        { type: ComponentType.AndGate, selected: ComponentType.AndGate === selectedClassName },
        { type: ComponentType.OrGate, selected: ComponentType.OrGate === selectedClassName },
    ],
    [PaletteComponentCategories.io]: [],
    [PaletteComponentCategories.decorations]: [],
});

const buildState = (overrides: Partial<PaletteComponentsState> = {}): PaletteComponentsState => ({
    ...initialComponentsState,
    paletteComponents: buildRecord(),
    ...overrides,
});

const placedGate = (): SelectedSelectable => ({ workspaceId: 'workspace-1', id: 'gate-1', type: ComponentType.AndGate });
const anyHighlighted = (state: PaletteComponentsState) => Object.values(state.paletteComponents).flat().some(c => c.selected);

describe('components reducer functions', () => {
    describe('setSelectedPaletteComponent', () => {
        it('should store the palette component', () => {
            const paletteComponent = { type: ComponentType.AndGate, selected: true };

            const state = functions.setSelectedPaletteComponent(buildState(), paletteComponent);

            expect(state.selectedPaletteComponent).toBe(paletteComponent);
        });

        it('should replace a previous palette selection', () => {
            const first = functions.setSelectedPaletteComponent(buildState(), { type: ComponentType.AndGate, selected: true });
            const state = functions.setSelectedPaletteComponent(first, { type: ComponentType.OrGate, selected: true });

            expect(state.selectedPaletteComponent?.type).toBe(ComponentType.OrGate);
        });

        it('should deselect a component that was selected in a diagram', () => {
            const state = functions.setSelectedPaletteComponent(
                buildState({ selectedSelectable: placedGate() }),
                { type: ComponentType.OrGate, selected: true }
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
                paletteComponents: buildRecord(ComponentType.AndGate),
                selectedPaletteComponent: { type: ComponentType.AndGate, selected: true },
            }), placedGate());

            expect(state.selectedPaletteComponent).toBeNull();
            expect(anyHighlighted(state)).toBe(false);
        });

        it('should replace the previous selection', () => {
            const next: SelectedSelectable = { workspaceId: 'workspace-1', id: 'gate-2', type: ComponentType.OrGate };

            const state = functions.setSelectedSelectable(buildState({ selectedSelectable: placedGate() }), next);

            expect(state.selectedSelectable).toBe(next);
        });

        it('should not mutate the previous state or its palette map', () => {
            const before = buildState({
                paletteComponents: buildRecord(ComponentType.AndGate),
                selectedPaletteComponent: { type: ComponentType.AndGate, selected: true },
            });
            functions.setSelectedSelectable(before, placedGate());
            expect(anyHighlighted(before)).toBe(true);
            expect(before.selectedPaletteComponent).not.toBeNull();
        });
    });

    describe('clearSelectedPaletteComponent', () => {
        it('should end the placement and un-highlight the palette', () => {
            const state = functions.clearSelectedPaletteComponent(buildState({
                paletteComponents: buildRecord(ComponentType.AndGate),
                selectedPaletteComponent: { type: ComponentType.AndGate, selected: true },
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
                paletteComponents: buildRecord(ComponentType.AndGate),
                selectedPaletteComponent: { type: ComponentType.AndGate, selected: true },
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
                paletteComponents: buildRecord(ComponentType.AndGate),
                selectedPaletteComponent: { type: ComponentType.AndGate, selected: true },
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
            const paletteComponent = { type: ComponentType.AndGate, selected: true };

            const state = componentsReducer(buildState(), actions.selectPaletteComponent({ paletteComponent }));

            expect(state.selectedPaletteComponent).toBe(paletteComponent);
            expect(state.selectedSelectable).toBeNull();
        });

        it('should select a placed component with the selectSelectable action', () => {
            const selectable = placedGate();

            const state = componentsReducer(buildState({
                paletteComponents: buildRecord(ComponentType.AndGate),
                selectedPaletteComponent: { type: ComponentType.AndGate, selected: true },
            }), actions.selectSelectable({ selectable }));

            expect(state.selectedSelectable).toBe(selectable);
            expect(state.selectedPaletteComponent).toBeNull();
        });

        it('should keep the palette component selected until the selection is cleared, however many are placed', () => {
            const paletteComponent = { type: ComponentType.AndGate, selected: true };
            let state = componentsReducer(buildState({ paletteComponents: buildRecord(ComponentType.AndGate) }), actions.selectPaletteComponent({ paletteComponent }));

            // placing a component changes nothing in the store: the workspace makes the next ghost itself
            state = componentsReducer(state, actions.setPaletteComponents({ paletteComponents: state.paletteComponents }));

            expect(state.selectedPaletteComponent).toBe(paletteComponent);
            expect(Object.values(state.paletteComponents).flat().filter(c => c.selected).map(c => c.type)).toEqual([ComponentType.AndGate]);
        });

        it('should end a placement with clearSelection', () => {
            const paletteComponent = { type: ComponentType.AndGate, selected: true };
            let state = componentsReducer(buildState({ paletteComponents: buildRecord(ComponentType.AndGate) }), actions.selectPaletteComponent({ paletteComponent }));

            state = componentsReducer(state, actions.clearSelection());

            expect(state.selectedPaletteComponent).toBeNull();
            expect(state.selectedSelectable).toBeNull();
            expect(anyHighlighted(state)).toBe(false);
        });

        it('should cancel a placement with clearSelectedPaletteComponent', () => {
            const paletteComponent = { type: ComponentType.AndGate, selected: true };
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

    describe('palette components record', () => {
        it('should keep every category, in the same order, when the highlights are cleared', () => {
            const state = functions.clearSelectedPaletteComponent(buildState({ paletteComponents: buildRecord(ComponentType.AndGate) }));

            expect(Object.keys(state.paletteComponents)).toEqual(Object.values(PaletteComponentCategories));
            expect(anyHighlighted(state)).toBe(false);
        });

        it('should start with a palette component list for every category', () => {
            expect(Object.keys(initialComponentsState.paletteComponents)).toEqual(Object.values(PaletteComponentCategories));
            for (const components of Object.values(initialComponentsState.paletteComponents)) {
                expect(components.length).toBeGreaterThan(0);
            }
        });

        it('should be plain data, so it survives being serialized', () => {
            const record = buildRecord(ComponentType.AndGate);

            expect(JSON.parse(JSON.stringify(record))).toEqual(record);
        });

        describe('mapComponents', () => {
            it('should make a new record with each component replaced, leaving the original alone', () => {
                const record = buildRecord();

                const mapped = functions.mapComponents(record, c => ({ ...c, selected: true }));

                expect(mapped).not.toBe(record);
                expect(mapped[PaletteComponentCategories.gates].every(c => c.selected)).toBe(true);
                expect(record[PaletteComponentCategories.gates].some(c => c.selected)).toBe(false);
            });
        });
    });
});
