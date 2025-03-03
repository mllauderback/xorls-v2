import { createFeature, createReducer, createSelector, on } from "@ngrx/store";
import { PaletteComponentList, PaletteComponentsState } from "./components.state";
import * as actions from './components.actions';
import * as gates from "../../models/components/gates";
import * as io from '../../models/components/io';
import * as decorations from '../../models/components/decorations';
import { PaletteComponent } from "../../models/components/PaletteComponent";

export const initialComponentsState: PaletteComponentsState = {
    paletteComponentList: {
        "Gates": [
            { iconUrl: "", className: gates.AndGate.name, selected: false },
            { iconUrl: "", className: gates.OrGate.name, selected: false },
            { iconUrl: "", className: gates.NotGate.name, selected: false }
            // etc
        ],
        "I/O": [
            { iconUrl: "", className: io.Input.name, selected: false },
            { iconUrl: "", className: io.Led.name, selected: false },
            { iconUrl: "", className: io.SevenSegmentDisplay.name, selected: false }
        ],
        "Decorations": [
            { iconUrl: "", className: decorations.Text.name, selected: false }
        ]
        // TODO: add more categories and components
    }
};

export const componentsReducer = createReducer(
    initialComponentsState,

    on(
        actions.setPaletteComponentList,
        (state, { paletteComponentList }): PaletteComponentsState =>
            setSelectedPaletteComponentList(state, paletteComponentList)
    )
);

export const componentsFeature = createFeature({
    name: 'componentsFeature',
    reducer: componentsReducer
});

function setSelectedPaletteComponentList(state: PaletteComponentsState, paletteComponentList: PaletteComponentList): PaletteComponentsState {
    // console.log("componentsFeature: ", selectedPaletteComponentInfo);
    return {
        ...state,
        paletteComponentList
    };
}