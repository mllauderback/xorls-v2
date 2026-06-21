import type { PaletteComponent } from "../../models/components/PaletteComponent";
import type { PaletteComponentsState, PaletteComponentCategories } from "./state";

export function setSelectedPaletteComponentList(state: PaletteComponentsState, paletteComponentMap: Map<PaletteComponentCategories, PaletteComponent[]>): PaletteComponentsState {
    // console.log("componentsFeature: ", paletteComponentMap);
    return {
        ...state,
        paletteComponentMap
    };
}