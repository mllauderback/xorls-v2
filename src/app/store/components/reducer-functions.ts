import type { PaletteComponent } from "../../models/components/PaletteComponent";
import type { PaletteComponentsState, PaletteComponentRecord, SelectableProperties, SelectedSelectable } from "./state";
import type { PropertyField, SerializedPropertyRecord, SerializedPropertyValue } from "../../models/Property";
import { fitsBusWidth, fromSerializedValue, validatePropertyValue } from "../../models/Property";

export function setSelectedPaletteComponentList(state: PaletteComponentsState, paletteComponents: PaletteComponentRecord): PaletteComponentsState {
    // console.log("componentsFeature: ", paletteComponentMap);
    return {
        ...state,
        paletteComponents
    };
}

/**
 * Records the palette component that was picked, ready to be placed. Selecting something to place deselects whatever
 * was selected in a diagram. The properties go back to the new component's defaults, which its workspace loads when it
 * makes the ghost, unless the same component was picked again while it is still being previewed.
 */
export function setSelectedPaletteComponent(state: PaletteComponentsState, paletteComponent: PaletteComponent): PaletteComponentsState {
    const target = state.selectableProperties?.target;
    const samePreview = target?.kind === 'preview' && target.type === paletteComponent.type;
    return {
        ...state,
        selectedPaletteComponent: paletteComponent,
        selectedSelectable: null,
        selectableProperties: samePreview ? state.selectableProperties : null
    };
}

/**
 * Selects a component that is already placed. Selecting a component ends the palette selection, because only one
 * thing is selected at a time and a click on the diagram means something different when something is being placed.
 */
export function setSelectedSelectable(state: PaletteComponentsState, selectedSelectable: SelectedSelectable, properties?: SerializedPropertyRecord): PaletteComponentsState {
    const { workspaceId, id, type } = selectedSelectable;
    return {
        ...state,
        paletteComponents: clearPaletteHighlights(state.paletteComponents),
        selectedPaletteComponent: null,
        selectedSelectable,
        selectableProperties: properties ? { target: { kind: 'selected', workspaceId, id, type }, values: properties } : null
    };
}

/**
 * Cancels the palette selection: the palette is un-highlighted and nothing is waiting to be placed.
 * A component that was already placed stays selected.
 */
export function clearSelectedPaletteComponent(state: PaletteComponentsState): PaletteComponentsState {
    const previewing = state.selectableProperties?.target.kind === 'preview';
    return {
        ...state,
        paletteComponents: clearPaletteHighlights(state.paletteComponents),
        selectedPaletteComponent: null,
        // the preview's properties go with it, so the next one starts from its defaults
        selectableProperties: previewing ? null : state.selectableProperties
    };
}

/**
 * Clears everything that is selected, whether it is waiting to be placed or was already placed.
 * Unlike clearSelectedPaletteComponent, a placed component is deselected too.
 * Returns the same state object when nothing is selected.
 */
export function clearSelection(state: PaletteComponentsState): PaletteComponentsState {
    if (!state.selectedSelectable && !state.selectedPaletteComponent && !state.selectableProperties) return state;
    return {
        ...state,
        paletteComponents: clearPaletteHighlights(state.paletteComponents),
        selectedPaletteComponent: null,
        selectedSelectable: null,
        selectableProperties: null
    };
}

/** Shows the properties a workspace reported for the component it is previewing or has selected. */
export function setSelectableProperties(state: PaletteComponentsState, selectableProperties: SelectableProperties): PaletteComponentsState {
    return {
        ...state,
        selectableProperties
    };
}

/**
 * Changes the value of one of the shown properties. Returns the same state when nothing is shown, or the property is
 * missing, readonly or doesn't accept the value, so a bad edit never reaches the component.
 */
export function updateSelectableProperty(state: PaletteComponentsState, field: PropertyField, value: SerializedPropertyValue): PaletteComponentsState {
    const shown = state.selectableProperties;
    const property = shown?.values[field];
    // if (!shown || !property || property.readonly || !acceptsValue(field, value)) return state;
    if (!shown || !property || property.readonly || !acceptsValue(field, value, shown.values)) return state;
    if (property.value === value) return state;
    return {
        ...state,
        selectableProperties: {
            ...shown,
            values: { ...shown.values, [field]: { ...property, value } }
        }
    };
}

function acceptsValue(field: PropertyField, value: SerializedPropertyValue, values: SerializedPropertyRecord): boolean {
    const converted = fromSerializedValue(field, value);
    if (converted === null || !validatePropertyValue(field, converted)) return false;
    const busWidth = values['Bus Width']?.value;
    return typeof converted !== 'bigint' || typeof busWidth !== 'number' || fitsBusWidth(converted, busWidth)
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