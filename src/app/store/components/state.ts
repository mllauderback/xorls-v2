import type { ComponentType } from "../../models/components/Component";
import type { PaletteComponent } from "../../models/components/PaletteComponent";
import type { SerializedPropertyRecord } from "../../models/Property";

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
    /** The kind of component, so the UI can show what it is without looking it up. */
    type: ComponentType;

    // TODO: add serialized object data for each selectable type (component/io/decoration/etc)
}

/**
 * What a properties snapshot belongs to. A preview is identified by its workspace and component type rather than by
 * the ghost's id, because a new ghost (with a new id) takes over after every placement and keeps the edited values.
 */
export type PropertiesTarget =
    | { kind: 'preview', workspaceId: string, type: ComponentType }
    | { kind: 'selected', workspaceId: string, id: string, type: ComponentType };


/** The properties shown in the properties panel, and what they belong to. */
export interface SelectableProperties {
    target: PropertiesTarget;
    values: SerializedPropertyRecord;
}

export interface PaletteComponentsState {
    paletteComponents: PaletteComponentRecord;
    /** The palette entry currently waiting to be placed in the workspace, or null once it has been placed/cancelled. */
    selectedPaletteComponent: PaletteComponent | null;
    /** The selected placed component, or null. A component that is only being previewed is never in here. */
    selectedSelectable: SelectedSelectable | null;
    /**
     * The properties of the previewed or selected component, or null when there is neither. The workspace that owns
     * the component keeps the instance in step with these values.
     */
    selectableProperties: SelectableProperties | null;
}
