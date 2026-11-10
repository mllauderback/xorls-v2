import type { PaletteComponent } from "../../models/components/PaletteComponent";
import type { PaletteComponentsState, PaletteComponentCategories, SelectedSelectable } from "./state";

export function setSelectedPaletteComponentList(state: PaletteComponentsState, paletteComponentMap: Map<PaletteComponentCategories, PaletteComponent[]>): PaletteComponentsState {
    // console.log("componentsFeature: ", paletteComponentMap);
    return {
        ...state,
        paletteComponentMap
    };
}

/**
 * Records the palette component that was picked, ready to be placed. Selecting something to place deselects whatever
 * was selected in a diagram.
 */
export function setSelectedPaletteComponent(state: PaletteComponentsState, paletteComponent: PaletteComponent): PaletteComponentsState {
    return {
        ...state,
        selectedPaletteComponent: paletteComponent,
        selectedSelectable: null
    };
}

/**
 * Selects a component that is already placed. Selecting a component ends the palette selection, because only one
 * thing is selected at a time and a click on the diagram means something different when something is being placed.
 */
export function setSelectedSelectable(state: PaletteComponentsState, selectedSelectable: SelectedSelectable): PaletteComponentsState {
    return {
        ...state,
        paletteComponentMap: clearPaletteHighlights(state.paletteComponentMap),
        selectedPaletteComponent: null,
        selectedSelectable
    };
}

/**
 * Cancels the palette selection: the palette is un-highlighted and nothing is waiting to be placed.
 * A component that was already placed stays selected.
 */
export function clearSelectedPaletteComponent(state: PaletteComponentsState): PaletteComponentsState {
    return {
        ...state,
        paletteComponentMap: clearPaletteHighlights(state.paletteComponentMap),
        selectedPaletteComponent: null
    };
}

/**
 * Clears everything that is selected, whether it is waiting to be placed or was already placed.
 * Unlike clearSelectedPaletteComponent, a placed component is deselected too.
 * Returns the same state object when nothing is selected.
 */
export function clearSelection(state: PaletteComponentsState): PaletteComponentsState {
    if (!state.selectedSelectable && !state.selectedPaletteComponent) return state;
    return {
        ...state,
        paletteComponentMap: clearPaletteHighlights(state.paletteComponentMap),
        selectedPaletteComponent: null,
        selectedSelectable: null
    };
}

function clearPaletteHighlights(map: Map<PaletteComponentCategories, PaletteComponent[]>): Map<PaletteComponentCategories, PaletteComponent[]> {
    return new Map(
        [...map.entries()].map(([category, components]) => [
            category,
            components.map(c => ({ ...c, selected: false }))
        ])
    );
}