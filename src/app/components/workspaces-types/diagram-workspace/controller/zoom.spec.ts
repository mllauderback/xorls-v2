import { describe, expect, it } from 'vitest';
import type { ZoomSettingsState } from '../../../../store/settings/state';
import { DEFAULT_ZOOM_SETTINGS } from '../../../../store/settings/feature';
import { PIXELS_PER_LINE, usableZoomSettings, WheelDeltaMode, zoomAfterScroll } from './zoom';

const config: ZoomSettingsState = { scrollRate: 0.001, pinchRate: 0.01, minZoom: 0.5, maxZoom: 4, invertScroll: false };
const inverted: ZoomSettingsState = { ...config, invertScroll: true };

function scroll(deltaY: number, deltaMode: number = WheelDeltaMode.Pixel, ctrlKey = false) {
    return { deltaY, deltaMode, ctrlKey };
}

describe('zoomAfterScroll', () => {
    it('should zoom out scrolling down and in scrolling up', () => {
        expect(zoomAfterScroll(1, scroll(100), config, 600)).toBeLessThan(1);
        expect(zoomAfterScroll(1, scroll(-100), config, 600)).toBeGreaterThan(1);
    });

    it('should leave the zoom alone for a scroll with no vertical distance', () => {
        expect(zoomAfterScroll(1.7, scroll(0), config, 600)).toBe(1.7);
    });

    it('should multiply the zoom by e^(-distance × scroll rate)', () => {
        expect(zoomAfterScroll(2, scroll(-200), config, 600)).toBeCloseTo(2 * Math.exp(0.2));
    });

    it('should zoom by the same proportion at any zoom', () => {
        const atOne = zoomAfterScroll(1, scroll(-100), config, 600);
        const atThree = zoomAfterScroll(3, scroll(-100), config, 600);

        expect(atThree / 3).toBeCloseTo(atOne);
    });

    it('should come back to the same zoom after scrolling down and back up by the same distance', () => {
        const down = zoomAfterScroll(1.3, scroll(150), config, 600);

        expect(zoomAfterScroll(down, scroll(-150), config, 600)).toBeCloseTo(1.3);
    });

    it('should add many small scrolls up to the same zoom as one big one, as a trackpad sends them', () => {
        let zoom = 1;
        for (let i = 0; i < 25; i++) zoom = zoomAfterScroll(zoom, scroll(-4), config, 600);

        expect(zoom).toBeCloseTo(zoomAfterScroll(1, scroll(-100), config, 600));
    });

    it('should count a scroll by lines as PIXELS_PER_LINE pixels a line', () => {
        expect(zoomAfterScroll(1, scroll(-3, WheelDeltaMode.Line), config, 600))
            .toBeCloseTo(zoomAfterScroll(1, scroll(-3 * PIXELS_PER_LINE), config, 600));
    });

    it('should zoom a 3-line wheel notch about as far as a 100px one', () => {
        const byLines = zoomAfterScroll(1, scroll(-3, WheelDeltaMode.Line), config, 600);
        const byPixels = zoomAfterScroll(1, scroll(-100), config, 600)

        expect(Math.abs(byLines / byPixels - 1)).toBeLessThan(0.01);
    });

    it('should count a scroll by pages as pageHeight pixels a page', () => {
        expect(zoomAfterScroll(1, scroll(1, WheelDeltaMode.Page), config, 600))
            .toBeCloseTo(zoomAfterScroll(1, scroll(600), config, 600));
    });

    it('should zoom a pinch (ctrlKey) at the pinch rate', () => {
        expect(zoomAfterScroll(1, scroll(-10, WheelDeltaMode.Pixel, true), config, 600)).toBeCloseTo(Math.exp(0.1));
    });

    describe('inverted', () => {
        it('should zoom in scrolling down and out scrolling up', () => {
            expect(zoomAfterScroll(1, scroll(100), inverted, 600)).toBeGreaterThan(1);
            expect(zoomAfterScroll(1, scroll(-100), inverted, 600)).toBeLessThan(1);
        });

        it('should zoom by the same amount as not inverted, the other way', () => {
            expect(zoomAfterScroll(1, scroll(100), inverted, 600)).toBeCloseTo(zoomAfterScroll(1, scroll(-100), config, 600));
        });

        it('should invert scrolls by lines and by pages too', () => {
            expect(zoomAfterScroll(1, scroll(3, WheelDeltaMode.Line), inverted, 600)).toBeGreaterThan(1);
            expect(zoomAfterScroll(1, scroll(1, WheelDeltaMode.Page), inverted, 600)).toBeGreaterThan(1);
        });

        it('should not invert a pinch (ctrlKey): spreading fingers zooms in either way', () => {
            const pinch = scroll(-10, WheelDeltaMode.Pixel, true);

            expect(zoomAfterScroll(1, pinch, inverted, 600)).toBe(zoomAfterScroll(1, pinch, config, 600));
            expect(zoomAfterScroll(1, pinch, inverted, 600)).toBeGreaterThan(1);
        });

        it('should stay within the zoom limits', () => {
            expect(zoomAfterScroll(1, scroll(100000), inverted, 600)).toBe(config.maxZoom);
            expect(zoomAfterScroll(1, scroll(-100000), inverted, 600)).toBe(config.minZoom);
        });
    });

    it('should stay within the zoom limits', () => {
        expect(zoomAfterScroll(1, scroll(-100000), config, 600)).toBe(config.maxZoom);
        expect(zoomAfterScroll(1, scroll(100000), config, 600)).toBe(config.minZoom);
        expect(zoomAfterScroll(config.maxZoom, scroll(-100), config, 600)).toBe(config.maxZoom);
    });
});

describe('DEFAULT_ZOOM_SETTINGS', () => {
    it('should not invert scrolling', () => {
        expect(DEFAULT_ZOOM_SETTINGS.invertScroll).toBe(false);
    });

    it('should zoom in 1.16x for a 100px mouse wheel notch, and keep its limits around 1', () => {
        expect(zoomAfterScroll(1, scroll(-100), DEFAULT_ZOOM_SETTINGS, 600)).toBeCloseTo(1.16, 2);
        expect(DEFAULT_ZOOM_SETTINGS.minZoom).toBeLessThan(1);
        expect(DEFAULT_ZOOM_SETTINGS.maxZoom).toBeGreaterThan(1);
    });

    it('should be usable as they are', () => {
        expect(usableZoomSettings(DEFAULT_ZOOM_SETTINGS, config)).toEqual(DEFAULT_ZOOM_SETTINGS);
    });
});

describe('usableZoomSettings', () => {
    const current = config;

    it('should take every setting that is a number above zero, and invertScroll', () => {
        const next = { scrollRate: 0.004, pinchRate: 0.02, minZoom: 0.1, maxZoom: 10, invertScroll: true };

        expect(usableZoomSettings(next, current)).toEqual(next);
    });

    it('should keep the current one for a setting that is empty, zero, negative or not a number', () => {
        const next = { scrollRate: null, pinchRate: 0, minZoom: Number.NaN, maxZoom: Infinity };

        expect(usableZoomSettings(next, current)).toEqual(current);
    });

    it('should take invertScroll if it is true or false, and otherwise keep the current one', () => {
        expect(usableZoomSettings({ invertScroll: true }, current).invertScroll).toBe(true);
        expect(usableZoomSettings({ invertScroll: false }, inverted).invertScroll).toBe(false);
        for (const invertScroll of [null, undefined, 1, 'true']) {
            expect(usableZoomSettings({ invertScroll }, inverted).invertScroll).toBe(true);
        }
    });

    it('should keep the current one for a setting that is missing, and take the rest', () => {
        expect(usableZoomSettings({ scrollRate: 0.004 }, current)).toEqual({ ...current, scrollRate: 0.004 });
    });

    it('should keep the current ones without any settings', () => {
        expect(usableZoomSettings(null, current)).toEqual(current);
        expect(usableZoomSettings(undefined, current)).toEqual(current);
    });

    it('should keep the current limits when the smallest zoom would be larger than the largest', () => {
        expect(usableZoomSettings({ ...current, minZoom: 6 }, current)).toEqual(current);
        expect(usableZoomSettings({ ...current, maxZoom: 0.3 }, current)).toEqual(current);
    });

    it('should take limits that are the same zoom', () => {
        expect(usableZoomSettings({ ...current, minZoom: 2, maxZoom: 2 }, current)).toEqual({ ...current, minZoom: 2, maxZoom: 2 });
    });

    it('should not change the settings it is given', () => {
        const before = { ...current };

        usableZoomSettings({ scrollRate: 0.009 }, current);

        expect(current).toEqual(before);
    });
});
