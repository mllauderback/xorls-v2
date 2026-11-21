import { createAction, props } from "@ngrx/store";
import type { PaletteComponentRecord, SelectableProperties, SelectedSelectable } from "./state";
import type { PropertyField, SerializedPropertyRecord, SerializedPropertyValue } from "../../models/Property";
import type { PaletteComponent } from "../../models/components/PaletteComponent";


export const setPaletteComponents = createAction('Update selected palette component list', props<{ paletteComponents: PaletteComponentRecord }>());

/**
 * A palette component was selected, to be placed in the workspace. The workspace previews it as a ghost, which it
 * keeps to itself: the ghost isn't part of the store's state until it is placed.
 * Whatever was selected in a diagram is deselected.
 */
export const selectPaletteComponent = createAction('Select palette component', props<{ paletteComponent: PaletteComponent }>());

/**
 * A component that is already placed in a workspace was selected. The palette selection, if any, ends. The properties
 * panel shows the properties given with it, or none.
 */
export const selectSelectable = createAction('Select selectable', props<{ selectable: SelectedSelectable, properties?: SerializedPropertyRecord }>());

/** The palette selection was toggled off. Cancels the placement, and whatever is selected in a diagram stays selected. */
export const clearSelectedPaletteComponent = createAction('Clear selected palette component');

/** Esc: clears the whole selection. The palette is un-highlighted, which ends the placement, and a placed component is deselected. */
export const clearSelection = createAction('Clear selection');

/**
 * The workspace that owns the previewed or selected component reports its properties, e.g. when it makes a ghost.
 * Replaces whatever properties were shown.
 */
export const loadSelectableProperties = createAction('Load selectable properties', props<{ properties: SelectableProperties }>());

/**
 * A property was edited in the properties panel. The value is in the form the store holds (a bigint as its decimal
 * string). Ignored when nothing is shown, or the property is missing, readonly or doesn't accept the value.
 */
export const updateSelectableProperty = createAction('Update selectable property', props<{ field: PropertyField, value: SerializedPropertyValue }>());
