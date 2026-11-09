import { describe, it, expect } from 'vitest';
import * as functions from './reducer-functions';
import type { PaletteComponentsState } from './state';
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

const ghostGate = () => {
    const gate = new AndGate({ x: 0, y: 0 }, 2);
    gate.isGhost = true;
    return gate;
};

describe('components reducer functions', () => {
    describe('setSelectedPaletteComponent', () => {
        it('should store the palette component and the new instance by reference', () => {
            const paletteComponent = { className: AndGate.name, selected: true };
            const gate = ghostGate();

            const state = functions.setSelectedPaletteComponent(buildState(), paletteComponent, gate, AndGate.name);

            expect(state.selectedPaletteComponent).toBe(paletteComponent);
            expect(state.selectedSelectable.selectable).toBe(gate);
            expect(state.selectedSelectable.concreteClassName).toBe(AndGate.name);
        });

        it('should replace a previous selection', () => {
            const first = functions.setSelectedPaletteComponent(buildState(), { className: AndGate.name, selected: true }, ghostGate(), AndGate.name);
            const second = new OrGate({ x: 0, y: 0 }, 2);
            const state = functions.setSelectedPaletteComponent(first, { className: OrGate.name, selected: true }, second, OrGate.name);

            expect(state.selectedSelectable.selectable).toBe(second);
            expect(state.selectedPaletteComponent?.className).toBe(OrGate.name);
        });
    });

    describe('placeSelectedPaletteComponent', () => {
        const placed = () => {
            const gate = new AndGate({ x: 40, y: 40 }, 2);
            return buildState({
                paletteComponentMap: buildMap(AndGate.name),
                selectedPaletteComponent: { className: AndGate.name, selected: true },
                selectedSelectable: { selectable: gate, concreteClassName: AndGate.name },
            });
        };

        it('should clear selectedPaletteComponent', () => {
            expect(functions.placeSelectedPaletteComponent(placed()).selectedPaletteComponent).toBeNull();
        });

        it('should un-highlight every palette component', () => {
            const state = functions.placeSelectedPaletteComponent(placed());
            const selected = [...state.paletteComponentMap.values()].flat().filter(c => c.selected);
            expect(selected).toEqual([]);
        });

        it('should keep the placed component selected', () => {
            const before = placed();
            const state = functions.placeSelectedPaletteComponent(before);
            expect(state.selectedSelectable).toBe(before.selectedSelectable);
        });

        it('should not mutate the previous state or its palette map', () => {
            const before = placed();
            functions.placeSelectedPaletteComponent(before);
            expect([...before.paletteComponentMap.values()].flat().some(c => c.selected)).toBe(true);
            expect(before.selectedPaletteComponent).not.toBeNull();
        });
    });

    describe('clearSelectedPaletteComponent', () => {
        it('should drop a pending ghost from selectedSelectable', () => {
            const state = functions.clearSelectedPaletteComponent(buildState({
                paletteComponentMap: buildMap(AndGate.name),
                selectedPaletteComponent: { className: AndGate.name, selected: true },
                selectedSelectable: { selectable: ghostGate(), concreteClassName: AndGate.name },
            }));

            expect(state.selectedPaletteComponent).toBeNull();
            expect(state.selectedSelectable).toEqual({ selectable: null, concreteClassName: '' });
            expect([...state.paletteComponentMap.values()].flat().some(c => c.selected)).toBe(false);
        });

        it('should leave an already placed component selected', () => {
            const placedGate = new AndGate({ x: 0, y: 0 }, 2); // not a ghost
            const selectedSelectable = { selectable: placedGate, concreteClassName: AndGate.name };

            const state = functions.clearSelectedPaletteComponent(buildState({ selectedSelectable }));

            expect(state.selectedSelectable).toBe(selectedSelectable);
        });

        it('should be harmless when nothing is selected', () => {
            const state = functions.clearSelectedPaletteComponent(buildState());
            expect(state.selectedSelectable.selectable).toBeNull();
            expect(state.selectedPaletteComponent).toBeNull();
        });
    });

    describe('componentsReducer', () => {
        it('should start with nothing selected', () => {
            expect(initialComponentsState.selectedPaletteComponent).toBeNull();
            expect(initialComponentsState.selectedSelectable.selectable).toBeNull();
        });

        it('should go from palette pick to placement through the actions', () => {
            const gate = ghostGate();
            const paletteComponent = { className: AndGate.name, selected: true };

            let state = componentsReducer(buildState(), actions.selectPaletteComponent({ paletteComponent, selectable: gate, concreteClassName: AndGate.name }));
            expect(state.selectedPaletteComponent).toBe(paletteComponent);
            expect(state.selectedSelectable.selectable).toBe(gate);

            gate.isGhost = false;
            state = componentsReducer(state, actions.placeSelectedPaletteComponent());
            expect(state.selectedPaletteComponent).toBeNull();
            expect(state.selectedSelectable.selectable).toBe(gate);
        });

        it('should cancel a pending placement with clearSelectedPaletteComponent', () => {
            const paletteComponent = { className: AndGate.name, selected: true };
            let state = componentsReducer(buildState(), actions.selectPaletteComponent({ paletteComponent, selectable: ghostGate(), concreteClassName: AndGate.name }));
            state = componentsReducer(state, actions.clearSelectedPaletteComponent());
            expect(state.selectedPaletteComponent).toBeNull();
            expect(state.selectedSelectable.selectable).toBeNull();
        });
    });
});
