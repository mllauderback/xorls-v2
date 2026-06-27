import { type Point } from "../../models/Point";

export type MouseMode = 'select' | 'place' | 'pan';

// will meaningfully diverge from WorkspaceState when code workspaces are supported
export interface DiagramWorkspaceState {
    mouseMode: MouseMode;
    mousePosition: Point;
}

// ignore lint error on this for now - will not be empty when code workspaces are implemented
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface CodeWorkspaceState { }

export interface WorkspaceState {
    // just store everything here.  we can use custom selectors for a specific workspace type
    mouseMode: MouseMode;
    mousePosition: Point;
}