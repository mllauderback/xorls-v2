import { createFeature, createReducer, createSelector, on } from "@ngrx/store";
import type { PaletteComponentsState } from "./state";
import { PaletteComponentCategories } from "./state";
import * as actions from './actions';
import * as functions from './reducer-functions';
import { ComponentType } from "../../models/components/Component";
import { toOrderedList } from "../../models/Property";

export const initialComponentsState: PaletteComponentsState = {
    paletteComponents: {
        [PaletteComponentCategories.gates]: [
            { type: ComponentType.AndGate, selected: false },
            { type: ComponentType.OrGate, selected: false },
            { type: ComponentType.XorGate, selected: false },
            { type: ComponentType.NotGate, selected: false },
            { type: ComponentType.Buffer, selected: false },
            { type: ComponentType.NandGate, selected: false },
            { type: ComponentType.NorGate, selected: false },
            { type: ComponentType.XnorGate, selected: false }
        ],
        [PaletteComponentCategories.io]: [
            { type: ComponentType.Input, selected: false },
            { type: ComponentType.Output, selected: false },
            { type: ComponentType.SevenSeg, selected: false }
        ],
        [PaletteComponentCategories.decorations]: [
            { type: ComponentType.Text, selected: false }
        ]
    },
    selectedPaletteComponent: null,
    selectedSelectable: null,
    selectableProperties: null
};

export const componentsReducer = createReducer(
    initialComponentsState,

    on(
        actions.setPaletteComponents,
        (state, { paletteComponents }): PaletteComponentsState =>
            functions.setSelectedPaletteComponentList(state, paletteComponents)
    ),
    on(
        actions.selectPaletteComponent,
        (state, { paletteComponent }): PaletteComponentsState =>
            functions.setSelectedPaletteComponent(state, paletteComponent)
    ),
    on(
        actions.selectSelectable,
        (state, { selectable, properties }): PaletteComponentsState =>
            functions.setSelectedSelectable(state, selectable, properties)
    ),
    on(
        actions.clearSelectedPaletteComponent,
        (state): PaletteComponentsState =>
            functions.clearSelectedPaletteComponent(state)
    ),
    on(
        actions.clearSelection,
        (state): PaletteComponentsState =>
            functions.clearSelection(state)
    ),
    on(
        actions.loadSelectableProperties,
        (state, { properties }): PaletteComponentsState =>
            functions.setSelectableProperties(state, properties)
    ),
    on(
        actions.updateSelectableProperty,
        (state, { field, value }): PaletteComponentsState =>
            functions.updateSelectableProperty(state, field, value)
    ),
);

export const componentsFeature = createFeature({
    name: 'componentsFeature',
    reducer: componentsReducer,
    extraSelectors: ({ selectSelectableProperties }) => ({
        /** The shown properties as a list, always in the order of PROPERTY_FIELDS. Empty when nothing is shown. */
        selectOrderedSelectableProperties: createSelector(
            selectSelectableProperties,
            properties => properties ? toOrderedList(properties.values) : []
        ),
    }),
});

export const {
    name,
    reducer,
    selectPaletteComponents,
    selectSelectedPaletteComponent,
    selectSelectedSelectable,
    selectSelectableProperties,
    selectOrderedSelectableProperties
} = componentsFeature