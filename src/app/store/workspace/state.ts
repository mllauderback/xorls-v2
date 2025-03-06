import { type Point } from "../../models/Point";

export type MouseMode = 'select' | 'place' | 'pan';

export interface WorkspaceState {
    mouseMode: MouseMode;
    mousePosition: Point;
}