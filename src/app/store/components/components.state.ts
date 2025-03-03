import { PaletteComponent } from "../../models/components/PaletteComponent";

export enum PaletteComponentCategories {
    gates = "Gates",
    io = "I/O",
    decorations = "Decorations"
}

export type PaletteComponentList = { // make this a map
    "Gates": PaletteComponent[];
    "I/O": PaletteComponent[];
    "Decorations": PaletteComponent[];
    // more categories ...
}

export interface PaletteComponentsState {
    paletteComponentMap: Map<PaletteComponentCategories, PaletteComponent[]>;
}