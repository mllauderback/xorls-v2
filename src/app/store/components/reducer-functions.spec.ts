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

    describe('clearSelection', () => {
        it('should drop a pending ghost and un-highlight the palette', () => {
            const state = functions.clearSelection(buildState({
                paletteComponentMap: buildMap(AndGate.name),
                selectedPaletteComponent: { className: AndGate.name, selected: true },
                selectedSelectable: { selectable: ghostGate(), concreteClassName: AndGate.name },
            }));

            expect(state.selectedPaletteComponent).toBeNull();
            expect(state.selectedSelectable).toEqual({ selectable: null, concreteClassName: '' });
            expect([...state.paletteComponentMap.values()].flat().some(c => c.selected)).toBe(false);
        });

        it('should deselect a component that was already placed', () => {
            const placedGate = new AndGate({ x: 40, y: 40 }, 2); // not a ghost

            const state = functions.clearSelection(buildState({
                selectedSelectable: { selectable: placedGate, concreteClassName: AndGate.name },
            }));

            expect(state.selectedSelectable).toEqual({ selectable: null, concreteClassName: '' });
        });

        it('should return the same state when nothing is selected', () => {
            const before = buildState();
            expect(functions.clearSelection(before)).toBe(before);
        });

        it('should not mutate the previous state or its palette map', () => {
            const before = buildState({
                paletteComponentMap: buildMap(AndGate.name),
                selectedPaletteComponent: { className: AndGate.name, selected: true },
                selectedSelectable: { selectable: ghostGate(), concreteClassName: AndGate.name },
            });
            functions.clearSelection(before);
            expect([...before.paletteComponentMap.values()].flat().some(c => c.selected)).toBe(true);
            expect(before.selectedSelectable.selectable).not.toBeNull();
        });

        it('should clear through the reducer with the clearSelection action', () => {
            const state = componentsReducer(buildState({
                selectedSelectable: { selectable: new AndGate({ x: 0, y: 0 }, 2), concreteClassName: AndGate.name },
            }), actions.clearSelection());
            expect(state.selectedSelectable.selectable).toBeNull();
        });
    });

    describe('componentsReducer', () => {
        it('should start with nothing selected', () => {
            expect(initialComponentsState.selectedPaletteComponent).toBeNull();
            expect(initialComponentsState.selectedSelectable.selectable).toBeNull();
        });

        it('should keep the palette component selected while placing it repeatedly', () => {
            const paletteComponent = { className: AndGate.name, selected: true };
            const map = buildMap(AndGate.name);
            const first = ghostGate();

            let state = componentsReducer(buildState({ paletteComponentMap: map }), actions.selectPaletteComponent({ paletteComponent, selectable: first, concreteClassName: AndGate.name }));
            first.isGhost = false; // placed

            // after each placement a fresh ghost is selected through the same action
            const second = ghostGate();
            state = componentsReducer(state, actions.selectPaletteComponent({ paletteComponent, selectable: second, concreteClassName: AndGate.name }));

            expect(state.selectedPaletteComponent).toBe(paletteComponent);
            expect(state.selectedSelectable.selectable).toBe(second);
            expect([...state.paletteComponentMap.values()].flat().filter(c => c.selected).map(c => c.className)).toEqual([AndGate.name]);
        });

        it('should end a repeated placement with clearSelection', () => {
            const paletteComponent = { className: AndGate.name, selected: true };
            let state = componentsReducer(buildState({ paletteComponentMap: buildMap(AndGate.name) }), actions.selectPaletteComponent({ paletteComponent, selectable: ghostGate(), concreteClassName: AndGate.name }));

            state = componentsReducer(state, actions.clearSelection());

            expect(state.selectedPaletteComponent).toBeNull();
            expect(state.selectedSelectable.selectable).toBeNull();
            expect([...state.paletteComponentMap.values()].flat().some(c => c.selected)).toBe(false);
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