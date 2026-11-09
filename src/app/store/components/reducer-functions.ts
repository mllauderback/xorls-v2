import type { PaletteComponent } from "../../models/components/PaletteComponent";
import type { Selectable } from "../../models/Selectable";
import { isGhostable } from "../../models/Ghostable";
import type { PaletteComponentsState, PaletteComponentCategories } from "./state";

export function setSelectedPaletteComponentList(state: PaletteComponentsState, paletteComponentMap: Map<PaletteComponentCategories, PaletteComponent[]>): PaletteComponentsState {
    // console.log("componentsFeature: ", paletteComponentMap);
    return {
        ...state,
        paletteComponentMap
    };
}

/**
 * Records the palette component that was picked and the new instance created for it.
 * Both selectedPaletteComponent and selectedSelectable hold the references they are given.
 */
export function setSelectedPaletteComponent(
    state: PaletteComponentsState,
    paletteComponent: PaletteComponent,
    selectable: Selectable,
    concreteClassName: string
): PaletteComponentsState {
    return {
        ...state,
        selectedPaletteComponent: paletteComponent,
        selectedSelectable: { selectable, concreteClassName }
    };
}

/**
 * Cancels a palette selection that hasn't been placed yet: the palette is un-highlighted and a pending
 * ghost is dropped from selectedSelectable. A component that was already placed stays selected.
 */
export function clearSelectedPaletteComponent(state: PaletteComponentsState): PaletteComponentsState {
    const { selectable } = state.selectedSelectable;
    const isPendingGhost = isGhostable(selectable) && selectable.isGhost;
    return {
        ...state,
        paletteComponentMap: clearPaletteHighlights(state.paletteComponentMap),
        selectedPaletteComponent: null,
        selectedSelectable: isPendingGhost ? { selectable: null, concreteClassName: "" } : state.selectedSelectable
    };
}

/**
 * Clears everything that is selected, whether it is a pending ghost or a component that was already placed.
 * Unlike clearSelectedPaletteComponent, a placed component is deselected too.
 * Returns the same state object when nothing is selected.
 */
export function clearSelection(state: PaletteComponentsState): PaletteComponentsState {
    if (!state.selectedSelectable.selectable && !state.selectedPaletteComponent) return state;
    return {
        ...state,
        paletteComponentMap: clearPaletteHighlights(state.paletteComponentMap),
        selectedPaletteComponent: null,
        selectedSelectable: { selectable: null, concreteClassName: "" }
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