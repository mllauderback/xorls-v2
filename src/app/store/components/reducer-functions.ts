import type { PaletteComponent } from "../../models/components/PaletteComponent";
import type { PaletteComponentsState, PaletteComponentRecord, SelectedSelectable } from "./state";

export function setSelectedPaletteComponentList(state: PaletteComponentsState, paletteComponents: PaletteComponentRecord): PaletteComponentsState {
    // console.log("componentsFeature: ", paletteComponentMap);
    return {
        ...state,
        paletteComponents
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
        paletteComponents: clearPaletteHighlights(state.paletteComponents),
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
        paletteComponents: clearPaletteHighlights(state.paletteComponents),
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
        paletteComponents: clearPaletteHighlights(state.paletteComponents),
        selectedPaletteComponent: null,
        selectedSelectable: null
    };
}

function clearPaletteHighlights(record: PaletteComponentRecord): PaletteComponentRecord {
    return mapComponents(record, c => ({ ...c, selected: false }));
}

/**
 * Makes a new record with every palette component replaced by what the callback returns. The categories and their
 * order stay as they were. Object.entries and Object.fromEntries don't keep the key type, hence the cast.
 */
export function mapComponents(record: PaletteComponentRecord, callback: (component: PaletteComponent) => PaletteComponent): PaletteComponentRecord {
    return Object.fromEntries(
        Object.entries(record).map(([category, components]) => [category, components.map(callback)])
    ) as PaletteComponentRecord;
}