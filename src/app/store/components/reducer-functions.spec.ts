import { describe, it, expect } from 'vitest';
import * as functions from './reducer-functions';
import type { PaletteComponentsState, PaletteComponentRecord, SelectableProperties, SelectedSelectable } from './state';
import { PaletteComponentCategories } from './state';
import { initialComponentsState } from './feature';
import { componentsReducer } from './feature';
import * as actions from './actions';
import { ComponentType } from '../../models/components/Component';

function buildRecord(selectedClassName?: string): PaletteComponentRecord {
    return {
        [PaletteComponentCategories.gates]: [
            { type: ComponentType.AndGate, selected: ComponentType.AndGate === selectedClassName },
            { type: ComponentType.OrGate, selected: ComponentType.OrGate === selectedClassName },
        ],
        [PaletteComponentCategories.io]: [],
        [PaletteComponentCategories.decorations]: [],
    };
}

function buildState(overrides: Partial<PaletteComponentsState> = {}): PaletteComponentsState {
    return {
        ...initialComponentsState,
        paletteComponents: buildRecord(),
        ...overrides,
    };
}

function placedGate(): SelectedSelectable {
    return { workspaceId: 'workspace-1', id: 'gate-1', type: ComponentType.AndGate };
}
function previewProperties(type = ComponentType.AndGate): SelectableProperties {
    return {
        target: { kind: 'preview', workspaceId: 'workspace-1', type },
        values: {
            'Number of Inputs': { value: 3, readonly: false },
            'Output Value': { value: '0', readonly: true },
        },
    };
}

function selectedProperties(): SelectableProperties {
    return {
        target: { kind: 'selected', workspaceId: 'workspace-1', id: 'gate-1', type: ComponentType.AndGate },
        values: { 'Label': { value: 'a', readonly: false } },
    };
}
function anyHighlighted(state: PaletteComponentsState) {
    return Object.values(state.paletteComponents).flat().some(c => c.selected);
}

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
    });

    describe('componentsReducer', () => {
        it('should start with nothing selected', () => {
            expect(initialComponentsState.selectedPaletteComponent).toBeNull();
            expect(initialComponentsState.selectedSelectable).toBeNull();
        });

        it.each([
            ['selectPaletteComponent', () => actions.selectPaletteComponent({ paletteComponent: { type: ComponentType.OrGate, selected: true } }),
                (state: PaletteComponentsState) => functions.setSelectedPaletteComponent(state, { type: ComponentType.OrGate, selected: true })],
            ['selectSelectable', () => actions.selectSelectable({ selectable: placedGate() }),
                (state: PaletteComponentsState) => functions.setSelectedSelectable(state, placedGate())],
            ['clearSelectedPaletteComponent', () => actions.clearSelectedPaletteComponent(), functions.clearSelectedPaletteComponent],
            ['clearSelection', () => actions.clearSelection(), functions.clearSelection],
        ] as const)('should run %s through its reducer function', (_name, action, reduce) => {
            // with a placed component selected, no two of these actions give the same state
            const state = buildState({ selectedSelectable: placedGate(), selectableProperties: selectedProperties() });

            expect(componentsReducer(state, action())).toEqual(reduce(state));
        });

        it('should keep the palette component selected until the selection is cleared, however many are placed', () => {
            const paletteComponent = { type: ComponentType.AndGate, selected: true };
            let state = componentsReducer(buildState({ paletteComponents: buildRecord(ComponentType.AndGate) }), actions.selectPaletteComponent({ paletteComponent }));

            // placing a component changes nothing in the store: the workspace makes the next ghost itself
            state = componentsReducer(state, actions.setPaletteComponents({ paletteComponents: state.paletteComponents }));

            expect(state.selectedPaletteComponent).toBe(paletteComponent);
            expect(Object.values(state.paletteComponents).flat().filter(c => c.selected).map(c => c.type)).toEqual([ComponentType.AndGate]);
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
    describe('selectableProperties', () => {
        it('should start with no properties shown', () => {
            expect(initialComponentsState.selectableProperties).toBeNull();
        });

        it('should show the properties a workspace loads', () => {
            const properties = previewProperties();

            const state = componentsReducer(buildState(), actions.loadSelectableProperties({ properties }));

            expect(state.selectableProperties).toBe(properties);
        });

        it('should reset when a different palette component is selected', () => {
            const state = functions.setSelectedPaletteComponent(
                buildState({ selectableProperties: previewProperties(ComponentType.AndGate) }),
                { type: ComponentType.OrGate, selected: true }
            );

            expect(state.selectableProperties).toBeNull();
        });

        it('should keep the edited values when the palette component being previewed is selected again', () => {
            const selectableProperties = previewProperties(ComponentType.AndGate);

            const state = functions.setSelectedPaletteComponent(
                buildState({ selectableProperties }),
                { type: ComponentType.AndGate, selected: true }
            );

            expect(state.selectableProperties).toBe(selectableProperties);
        });

        it('should reset when a palette component is selected while a placed component is shown', () => {
            const state = functions.setSelectedPaletteComponent(
                buildState({ selectableProperties: selectedProperties() }),
                { type: ComponentType.AndGate, selected: true }
            );

            expect(state.selectableProperties).toBeNull();
        });

        it('should reset when the palette is cleared, so the next preview starts from its defaults', () => {
            const state = functions.clearSelectedPaletteComponent(buildState({ selectableProperties: previewProperties() }));

            expect(state.selectableProperties).toBeNull();
        });

        it('should keep the properties of a placed component when the palette is cleared', () => {
            const selectableProperties = selectedProperties();

            const state = functions.clearSelectedPaletteComponent(buildState({ selectedSelectable: placedGate(), selectableProperties }));

            expect(state.selectableProperties).toBe(selectableProperties);
        });

        it('should clear with the rest of the selection', () => {
            const state = functions.clearSelection(buildState({ selectableProperties: previewProperties() }));

            expect(state.selectableProperties).toBeNull();
        });

        it('should show the properties that come with a selected component', () => {
            const values = { 'Label': { value: 'a', readonly: false } };

            const state = componentsReducer(buildState({ selectableProperties: previewProperties() }), actions.selectSelectable({ selectable: placedGate(), properties: values }));

            expect(state.selectableProperties).toEqual({
                target: { kind: 'selected', workspaceId: 'workspace-1', id: 'gate-1', type: ComponentType.AndGate },
                values,
            });
        });

        it('should show no properties for a selected component that comes without them', () => {
            const state = componentsReducer(buildState({ selectableProperties: previewProperties() }), actions.selectSelectable({ selectable: placedGate() }));

            expect(state.selectableProperties).toBeNull();
        });

        describe('updateSelectableProperty', () => {
            it('should change the value without changing the previous state', () => {
                const before = buildState({ selectableProperties: previewProperties() });

                const state = componentsReducer(before, actions.updateSelectableProperty({ field: 'Number of Inputs', value: 5 }));

                expect(state.selectableProperties?.values['Number of Inputs']).toEqual({ value: 5, readonly: false });
                expect(state.selectableProperties?.target).toBe(before.selectableProperties?.target);
                expect(before.selectableProperties?.values['Number of Inputs']?.value).toBe(3);
            });

            it.each([
                ['a value out of range', 'Number of Inputs', 33],
                ['a value of the wrong type', 'Number of Inputs', '5'],
                ['a readonly property', 'Output Value', '1'],
                ['a property that is not shown', 'Label', 'x'],
            ] as const)('should ignore %s', (_case, field, value) => {
                const before = buildState({ selectableProperties: previewProperties() });

                expect(functions.updateSelectableProperty(before, field, value)).toBe(before);
            });

            it('should ignore an edit when nothing is shown', () => {
                const before = buildState();

                expect(functions.updateSelectableProperty(before, 'Label', 'x')).toBe(before);
            });

            it('should return the same state when the value does not change', () => {
                const before = buildState({ selectableProperties: previewProperties() });

                expect(functions.updateSelectableProperty(before, 'Number of Inputs', 3)).toBe(before);
            });

            it('should accept a bigint as its decimal string, and refuse a string that is not one', () => {
                const before = buildState({
                    selectableProperties: {
                        target: { kind: 'preview', workspaceId: 'workspace-1', type: ComponentType.Input },
                        values: { 'Output Value': { value: '0', readonly: false } },
                    },
                });

                expect(functions.updateSelectableProperty(before, 'Output Value', '255').selectableProperties?.values['Output Value']?.value).toBe('255');
                expect(functions.updateSelectableProperty(before, 'Output Value', 'ff')).toBe(before);
                expect(functions.updateSelectableProperty(before, 'Output Value', 255)).toBe(before);
            });
        });
    });
});
