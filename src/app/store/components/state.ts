import type { PaletteComponent } from "../../models/components/PaletteComponent";

export enum PaletteComponentCategories {
    gates = "Gates",
    io = "I/O",
    decorations = "Decorations"
}

/** The palette components of each category. Every category is there, and the order of the keys is the order they are shown in. */
export type PaletteComponentRecord = Record<PaletteComponentCategories, PaletteComponent[]>;

/**
 * Which component is selected. This is a reference, not the component: the instance stays in the workspace it was
 * placed in, and the id is how to find it again. Keeping instances out of the store keeps the state plain data, so
 * it can be frozen, logged by the devtools, and sent to a web worker.
 */
export interface SelectedSelectable {
    /** The workspace the component is in. A component id only means something inside one diagram. */
    workspaceId: string;
    /** The component's id. */
    id: string;
    /** The component's class name, so the UI can show what kind of component it is without looking it up. */
    type: string;

    // TODO: add serialized object data for each selectable type (component/io/decoration/etc)
}

export interface PaletteComponentsState {
    paletteComponents: PaletteComponentRecord;
    /** The palette entry currently waiting to be placed in the workspace, or null once it has been placed/cancelled. */
    selectedPaletteComponent: PaletteComponent | null;
    /** The selected placed component, or null. A component that is only being previewed is never in here. */
    selectedSelectable: SelectedSelectable | null;
}
