import { createAction, props } from "@ngrx/store";
import type { PaletteComponentCategories } from "./state";
import type { PaletteComponent } from "../../models/components/PaletteComponent";
import type { Selectable } from "../../models/Selectable";


export const setPaletteComponentMap = createAction('Update selected palette component list', props<{ paletteComponentMap: Map<PaletteComponentCategories, PaletteComponent[]> }>());

/**
 * A palette component was picked: `selectable` is the new (ghost) instance created for it by the component factory.
 * Also dispatched after each placement with a fresh ghost, so the same palette component can be placed again without reselecting it.
 */
export const selectPaletteComponent = createAction('Select palette component', props<{ paletteComponent: PaletteComponent, selectable: Selectable, concreteClassName: string }>());

/** The palette selection was toggled off before the component was placed. Cancels a pending ghost. */
export const clearSelectedPaletteComponent = createAction('Clear selected palette component');

/** Esc: clears the whole selection. A pending ghost disappears, the palette is un-highlighted, and a placed component is deselected. */
export const clearSelection = createAction('Clear selection');