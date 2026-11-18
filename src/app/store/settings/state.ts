import { type GridMode } from "../../components/canvas-layers/grid-canvas-layer/Grid";

export interface GridSettingsState {
    gridSpacing: number;
    gridMode: GridMode;
}

/**
 * How scrolling over the diagram zooms it. Each scroll multiplies the zoom by e^(-distance × rate), where distance is
 * how far the scroll went in pixels (down is positive, and zooms out). Multiplying, rather than adding, makes a
 * scroll zoom by the same proportion at any zoom, and scrolling down then back up by the same distance returns to
 * the zoom you started at.
 */
export interface ZoomSettingsState {
    /**
     * Zoom per pixel of mouse wheel or two-finger trackpad scroll. A mouse wheel notch is about 100px in Chrome and
     * Safari, so 0.0015 zooms in by 1.16x a notch and back out by 0.86x. Trackpads send many small scrolls instead,
     * which add up the same way.
     */
    scrollRate: number;
    /**
     * Zoom per pixel of trackpad pinch. Browsers report a pinch as a scroll with ctrlKey held, in much smaller steps
     * than a wheel, so it needs a faster rate. Holding ctrl and scrolling a mouse wheel uses this rate too.
     */
    pinchRate: number;
    // TODO: change maxZoom to maxScale so it includes gridScale.  min raw cell size should be 5px regardless of grid scale, max raw cell size should be 100px.
    /** The smallest zoom, as a multiple of the grid spacing setting: 0.25 shows 20px cells 5px across. */
    minZoom: number;
    /** The largest zoom, as a multiple of the grid spacing setting: 5 shows 20px cells 100px across. */
    maxZoom: number;
    /**
     * Whether scrolling zooms the other way: scrolling up zooms out and down zooms in. Pinches aren't affected, since
     * spreading two fingers means zooming in either way; nor is scrolling with ctrl held, which browsers can't tell
     * apart from a pinch.
     */
    invertScroll: boolean;
}

export interface WorkspaceSettingsState {
    gridSettings: GridSettingsState;
    zoomSettings: ZoomSettingsState;
}

export interface SettingsState {
    leftPanelResizeByPct: boolean;
    leftPanelWidth: number;
    workspaceSettings: WorkspaceSettingsState;
}