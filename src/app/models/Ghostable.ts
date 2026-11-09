export interface Ghostable {
    /**
     * True while the object is in a preview state: either a new object being previewed before it is
     * placed, or an existing object being dragged around the workspace. The render service draws
     * ghosts in a lighter style, which takes precedence over the selected style.
     */
    isGhost: boolean;
}

export function isGhostable(obj: unknown): obj is Ghostable {
    return typeof obj === 'object' && obj !== null && 'isGhost' in obj;
}
