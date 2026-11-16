import type { Locator } from '@playwright/test';
import type { Size } from './draw-helpers';
import { Point } from './draw-helpers';

/** The canvas layers of a diagram workspace, bottom to top, by what they hold. */
export const LAYERS = {
    grid: 'app-grid-canvas-layer',
    component: 'app-component-canvas-layer',
    io: 'app-io-canvas-layer',
    wire: 'app-wire-canvas-layer',
    activeComponent: 'app-active-component-canvas-layer',
    activeWire: 'app-active-wire-canvas-layer',
} as const;
export type Layer = keyof typeof LAYERS;

/**
 * Where something is drawn on a layer: how many pixels, the box around them in client (page) coordinates, and
 * their average color. A layer's canvas is shown at its own size, so a canvas pixel is a CSS pixel.
 */
export interface Drawn {
    /** Number of pixels drawn on a canvas layer */
    count: number;
    left: number;
    top: number;
    right: number;
    bottom: number;
    /** Average red, green and blue of the drawn pixels, 0-255, weighted by how opaque they are. */
    color: Color;
}

/** A rectangle of whole pixels, in client (page) coordinates. */
export interface Region extends Size {
    left: number;
    top: number;
}

/** How many pixels are drawn in each column and each row of a region. */
export interface Profile {
    region: Region;
    /** Drawn pixels per column, left to right. */
    columns: number[];
    /** Drawn pixels per row, top to bottom. */
    rows: number[];
}

/** Consecutive columns or rows that count as drawn. */
export interface Run {
    /** The first pixel of the run, in client coordinates. */
    start: number;
    /** The last pixel of the run, in client coordinates. */
    end: number;
    length: number;
}

export interface Color {
    r: number;
    g: number;
    b: number;
    a: number;
}

/** A color on a canvas and how many pixels have it. Channels are 0-255. */
export interface ColorCount {
    color: Color;
    count: number;
}

/**
 * Reads the pixels of one canvas layer of a diagram workspace: what the layer draws, where, in which color and how
 * thick, and whether its pixels stay the same. A DiagramWorkspace hands these out with layer().
 *
 * Regions and positions are in client coordinates. A layer's canvas is shown at its own size, so a canvas pixel is a
 * CSS pixel. Without a region, the methods that take one read the part of the layer that is shown in the workspace.
 */
export class CanvasLayer {
    /** The workspace presenter the layer is in: the layer's canvas can be bigger than what the presenter shows. */
    readonly presenter: Locator;
    readonly name: Layer;

    constructor(presenter: Locator, name: Layer) {
        this.presenter = presenter;
        this.name = name;
    }

    get canvas(): Locator {
        return this.presenter.locator(`${LAYERS[this.name]} canvas`);
    }

    /**
     * Calculates information about what is drawn on the whole layer.
     * Returns Drawn object or null of drawn pixel count is 0.
     * 
     * @returns count: The number of pixels with alpha > 0,
     *          left: layer x position of left-most drawn pixel,
     *          right: layer x position of right-most drawn pixel,
     *          top: layer y position of top-most drawn pixel,
     *          bottom: layer y position of bottom-most drawn pixel,
     *          color: The average color (rbga) of all counted pixels,
     * 
     *          or null if count === 0
     */
    async drawn(): Promise<Drawn | null> {
        return this.canvas.evaluate((canvas: HTMLCanvasElement) => {
            const rect = canvas.getBoundingClientRect();
            const { data, width, height } = canvas.getContext('2d', { willReadFrequently: true })!
                .getImageData(0, 0, canvas.width, canvas.height);
            let count = 0, left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
            let r = 0, g = 0, b = 0, a = 0;
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const i = (y * width + x) * 4;
                    const alpha = data[i + 3];
                    if (alpha === 0) continue;
                    count++;
                    left = Math.min(left, x); right = Math.max(right, x);
                    top = Math.min(top, y); bottom = Math.max(bottom, y);
                    r += data[i] * alpha; g += data[i + 1] * alpha; b += data[i + 2] * alpha; a += alpha;
                }
            }
            if (count === 0) return null;
            return {
                count,
                left: rect.left + left, top: rect.top + top, right: rect.left + right, bottom: rect.top + bottom,
                color: { r: r / a, g: g / a, b: b / a, a: a / count },
            };
        });
    }

    /** The middle of what is drawn on the layer, in client coordinates, or null if nothing is drawn. */
    async drawnCenter(): Promise<Point | null> {
        const drawn = await this.drawn();
        return drawn && { x: (drawn.left + drawn.right) / 2, y: (drawn.top + drawn.bottom) / 2 };
    }

    /** The part of the layer that is shown in the workspace: the canvas can be bigger than the workspace. */
    async visibleRegion(): Promise<Region> {
        const view = (await this.presenter.boundingBox())!;
        const canvas = (await this.canvas.boundingBox())!;
        const left = Math.ceil(Math.max(view.x, canvas.x));
        const top = Math.ceil(Math.max(view.y, canvas.y));
        const right = Math.floor(Math.min(view.x + view.width, canvas.x + canvas.width));
        const bottom = Math.floor(Math.min(view.y + view.height, canvas.y + canvas.height));
        return { left, top, width: right - left, height: bottom - top };
    }

    /**
     * How many pixels are drawn in each column and row of a region
     * 
     * @param region The region to profile
     * @param minAlpha How opaque a pixel has to be to count as drawn, 1-255. The default counts any pixel that is
     * not fully transparent; a higher one leaves out the near-invisible fringe that rounding in the canvas can leave
     * next to a line whose width isn't a whole number of diagram units.
     * @returns The region and the list of counts
     */
    async profile(region?: Region, minAlpha = 1): Promise<Profile> {
        const target = region ?? await this.visibleRegion();
        const counts = await this.canvas.evaluate((canvas: HTMLCanvasElement, { r, minAlpha }: { r: Region, minAlpha: number }) => {
            const rect = canvas.getBoundingClientRect();
            const { data } = canvas.getContext('2d', { willReadFrequently: true })!
                .getImageData(r.left - rect.left, r.top - rect.top, r.width, r.height);
            const columns = new Array<number>(r.width).fill(0);
            const rows = new Array<number>(r.height).fill(0);
            for (let y = 0; y < r.height; y++) {
                for (let x = 0; x < r.width; x++) {
                    if (data[(y * r.width + x) * 4 + 3] < minAlpha) continue;
                    columns[x]++;
                    rows[y]++;
                }
            }
            return { columns, rows };
        }, { r: target, minAlpha });
        return { region: target, ...counts };
    }

    /** The colors of the drawn pixels in a region, the most common first. */
    async colors(region?: Region): Promise<ColorCount[]> {
        const target = region ?? await this.visibleRegion();
        return this.canvas.evaluate((canvas: HTMLCanvasElement, r: Region) => {
            const rect = canvas.getBoundingClientRect();
            const { data } = canvas.getContext('2d', { willReadFrequently: true })!
                .getImageData(r.left - rect.left, r.top - rect.top, r.width, r.height);
            const counts = new Map<number, number>();
            for (let i = 0; i < data.length; i += 4) {
                if (data[i + 3] === 0) continue;
                // the four channels packed in one number
                const key = ((data[i] * 256 + data[i + 1]) * 256 + data[i + 2]) * 256 + data[i + 3];
                counts.set(key, (counts.get(key) ?? 0) + 1);
            }
            return [...counts.entries()]
                .sort((a, b) => b[1] - a[1])
                .map(([key, count]) => ({
                    color: {
                        r: Math.floor(key / 256 ** 3),
                        g: Math.floor(key / 256 ** 2) % 256,
                        b: Math.floor(key / 256) % 256,
                        a: key % 256
                    },
                    count,
                }));
        }, target);
    }

    /**
     * A hash of every pixel in a region. Two fingerprints are equal when the layer shows exactly the same pixels in
     * the two regions, which have to be the same size.
     */
    async fingerprint(region?: Region): Promise<string> {
        const target = region ?? await this.visibleRegion();
        return this.canvas.evaluate((canvas: HTMLCanvasElement, r: Region) => {
            const rect = canvas.getBoundingClientRect();
            const { data } = canvas.getContext('2d', { willReadFrequently: true })!
                .getImageData(r.left - rect.left, r.top - rect.top, r.width, r.height);
            // FNV-1a
            let hash = 0x811c9dc5;
            for (const byte of data) {
                hash ^= byte;
                hash = Math.imul(hash, 0x01000193);
            }
            return `${r.width}x${r.height}:${(hash >>> 0).toString(16)}`;
        }, target);
    }
}

/** A region moved by dx, dy. */
export function shifted(region: Region, dx: number, dy: number): Region {
    return { ...region, left: region.left + dx, top: region.top + dy };
}

/**
 * The runs of consecutive columns (or rows) of a profile that count as drawn.
 *
 * @param counts The profile's columns or rows
 * @param origin The client coordinate of the first one: the region's left for columns, its top for rows
 * @param isDrawn Whether a column or row with this many drawn pixels counts. By default, any drawn pixel does.
 */
export function runs(counts: number[], origin: number, isDrawn: (count: number) => boolean = count => count > 0): Run[] {
    const found: Run[] = [];
    let start = -1;
    for (let i = 0; i <= counts.length; i++) {
        const drawn = i < counts.length && isDrawn(counts[i]);
        if (drawn && start === -1) start = i;
        if (!drawn && start !== -1) {
            found.push({ start: origin + start, end: origin + i - 1, length: i - start });
            start = -1;
        }
    }
    return found;
}
