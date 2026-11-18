import type { ZoomSettingsState } from '../../../../store/settings/state';

/*
 * How scrolling zooms the diagram, from the zoom settings: see ZoomSettingsState for what each setting does, and
 * DEFAULT_ZOOM_SETTINGS for where they start.
 */

/** The values of WheelEvent.deltaMode: what deltaY is measured in. */
export const WheelDeltaMode = { Pixel: 0, Line: 1, Page: 2 } as const;

/** 
 * Conversion factor for pixels in a line for wheels/browsers that scroll by line vs by pixel.
 * Firefox reports a scroll notch at ~3 lines vs 100px.
 */
export const PIXELS_PER_LINE = 33;

/**
 * The zoom after a scroll, within the settings' limits.
 *
 * @param zoom The zoom before the scroll
 * @param event The scroll. Only its vertical distance counts
 * @param settings How fast scrolls zoom, and how far
 * @param pageHeight How many pixels a page is, for wheels that scroll by pages: the height of the diagram
 */
export function zoomAfterScroll(
    zoom: number,
    event: Pick<WheelEvent, 'deltaY' | 'deltaMode' | 'ctrlKey'>,
    settings: ZoomSettingsState,
    pageHeight: number
): number {
    const pixelsPerUnit = event.deltaMode === WheelDeltaMode.Line ? PIXELS_PER_LINE
        : event.deltaMode === WheelDeltaMode.Page ? pageHeight
            : 1;
    const rate = event.ctrlKey ? settings.pinchRate : settings.scrollRate;
    // scrolling up (a negative distance) zooms in, unless scrolling is inverted; a pinch is never inverted
    const direction = settings.invertScroll && !event.ctrlKey ? 1 : -1;
    const zoomed = zoom * Math.exp(direction * event.deltaY * pixelsPerUnit * rate);
    return Math.min(settings.maxZoom, Math.max(settings.minZoom, zoomed));
}

/**
 * The zoom settings to zoom with, from what the store has: each number setting that is a number above zero, and
 * invertScroll if it is true or false; for any other, the one in use now.
 *
 * @param next What the store has
 * @param current The settings in use now
 */
export function usableZoomSettings(
    next: Partial<Record<keyof ZoomSettingsState, unknown>> | null | undefined,
    current: ZoomSettingsState
): ZoomSettingsState {
    // Safety check for when user settings are pulled from a DB
    function usable(key: Exclude<keyof ZoomSettingsState, 'invertScroll'>): number {
        const value = next?.[key];
        return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : current[key];
    }
    const minZoom = usable('minZoom');
    const maxZoom = usable('maxZoom');
    const limitsUsable = minZoom <= maxZoom;
    return {
        scrollRate: usable('scrollRate'),
        pinchRate: usable('pinchRate'),
        minZoom: limitsUsable ? minZoom : current.minZoom,
        maxZoom: limitsUsable ? maxZoom : current.maxZoom,
        invertScroll: typeof next?.invertScroll === 'boolean' ? next.invertScroll : current.invertScroll,
    };
}
