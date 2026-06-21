import { createFeature, createReducer, on } from "@ngrx/store";
import type { PaletteComponentsState } from "./state";
import { PaletteComponentCategories } from "./state";
import type { PaletteComponent } from "../../models/components/PaletteComponent";
import * as actions from './actions';
import * as functions from './reducer-functions';
import * as gates from "../../models/components/gates";
import * as io from '../../models/components/io';
import * as decorations from '../../models/components/decorations';

export const initialComponentsState: PaletteComponentsState = {
    paletteComponentMap: new Map<PaletteComponentCategories, PaletteComponent[]>([
        [
            PaletteComponentCategories.gates,
            [
                { className: gates.AndGate.name, selected: false },
                { className: gates.OrGate.name, selected: false },
                { className: gates.XorGate.name, selected: false },
                { className: gates.NotGate.name, selected: false },
                { className: gates.Buffer.name, selected: false },
                { className: gates.NandGate.name, selected: false },
                { className: gates.NorGate.name, selected: false },
                { className: gates.XnorGate.name, selected: false }
            ]
        ],
        [
            PaletteComponentCategories.io,
            [
                { className: io.Input.name, selected: false },
                { className: io.Output.name, selected: false },
                { className: io.SevenSegmentDisplay.name, selected: false }
            ]
        ],
        [
            PaletteComponentCategories.decorations,
            [
                { className: decorations.Text.name, selected: false }
            ]
        ]
    ]),
    selectedSelectable: {
        selectable: null,
        concreteClassName: ""
    }
};

export const componentsReducer = createReducer(
    initialComponentsState,

    on(
        actions.setPaletteComponentMap,
        (state, { paletteComponentMap }): PaletteComponentsState =>
            functions.setSelectedPaletteComponentList(state, paletteComponentMap)
    )
);

export const componentsFeature = createFeature({
    name: 'componentsFeature',
    reducer: componentsReducer
});

export const {
    name,
    reducer,
    selectPaletteComponentMap,
    selectSelectedSelectable
} = componentsFeature
