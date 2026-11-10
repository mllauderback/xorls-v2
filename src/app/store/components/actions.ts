import { createAction, props } from "@ngrx/store";
import type { PaletteComponentCategories, SelectedSelectable } from "./state";
import type { PaletteComponent } from "../../models/components/PaletteComponent";


export const setPaletteComponentMap = createAction('Update selected palette component list', props<{ paletteComponentMap: Map<PaletteComponentCategories, PaletteComponent[]> }>());

/**
 * A palette component was selected, to be placed in the workspace. The workspace previews it as a ghost, which it
 * keeps to itself: the ghost isn't part of the store's state until it is placed.
 * Whatever was selected in a diagram is deselected.
 */
export const selectPaletteComponent = createAction('Select palette component', props<{ paletteComponent: PaletteComponent }>());

/** A component that is already placed in a workspace was selected. The palette selection, if any, ends. */
export const selectSelectable = createAction('Select selectable', props<{ selectable: SelectedSelectable }>());

/** The palette selection was toggled off. Cancels the placement, and whatever is selected in a diagram stays selected. */
export const clearSelectedPaletteComponent = createAction('Clear selected palette component');

/** Esc: clears the whole selection. The palette is un-highlighted, which ends the placement, and a placed component is deselected. */
export const clearSelection = createAction('Clear selection');