import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { ComponentPalette } from './component-palette';
import { settle } from './draw-helpers';

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

/** The grid spacing the app starts with. Mirrors the settings store's initial state. */
export const DEFAULT_GRID_SPACING = 20;

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
    color: { r: number, g: number, b: number };
    /** Average opacity of the drawn pixels, 0-255. */
    alpha: number;
}

/** Same shape as Point interface from src/app/models/Point.ts */
export interface Point {
    x: number;
    y: number;
}

/**
 * Drives the diagram workspace of the active tab: app-diagram-workspace-container, its controller, and the
 * app-diagram-workspace-presenter with its stack of canvas layers.
 *
 * Positions are given relative to the middle of the workspace, so tests don't depend on where it is on the page.
 */
export class DiagramWorkspace {
    readonly page: Page;
    readonly palette: ComponentPalette;

    constructor(page: Page) {
        this.page = page;
        this.palette = new ComponentPalette(page);
    }

    get container(): Locator {
        return this.page.locator('app-workspace-tabs .draggable-tab-content app-diagram-workspace-container');
    }

    get presenter(): Locator {
        return this.container.locator('app-diagram-workspace-presenter');
    }

    get canvases(): Locator {
        return this.presenter.locator('canvas');
    }

    canvas(layer: Layer): Locator {
        return this.presenter.locator(`${LAYERS[layer]} canvas`);
    }

    async open(): Promise<void> {
        await this.page.goto('/');
        await expect(this.presenter).toBeVisible();
        await expect(this.canvases).toHaveCount(Object.keys(LAYERS).length);
    }

    /** The middle of the workspace, in client coordinates. */
    async center(): Promise<Point> {
        const box = (await this.presenter.boundingBox())!;
        return { x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2) };
    }

    /** A point relative to the middle of the workspace, in client coordinates. */
    async atCenter(offset: Point = { x: 0, y: 0 }): Promise<Point> {
        const center = await this.center();
        return { x: center.x + offset.x, y: center.y + offset.y };
    }

    /**
     * Moves the mouse to a point relative to the middle of the workspace, in steps, so the workspace sees moves over it.
     */
    async moveFromCenterTo(offset: Point = { x: 0, y: 0 }): Promise<Point> {
        const point = await this.atCenter(offset);
        await this.page.mouse.move(point.x, point.y, { steps: 4 });
        await settle(this.page);
        return point;
    }

    /** Picks a component in the palette, so that it is waiting to be placed. */
    async pickPaletteComponent(type = 'AndGate', category: 'Gates' | 'I/O' | 'Decorations' = 'Gates'): Promise<void> {
        if (!(await this.palette.tabPanel.isVisible())) await this.palette.componentsTab.click();
        await this.palette.expand(category);
        await this.palette.clickTile(type);
        await expect(this.palette.checkbox(type)).toBeChecked();
    }

    /** Clicks at a point relative to the middle of the workspace, after moving the mouse there. */
    async clickFromCenterAt(offset: Point = { x: 0, y: 0 }, button: 'left' | 'right' | 'middle' = 'left'): Promise<Point> {
        const point = await this.moveFromCenterTo(offset);
        await this.page.mouse.click(point.x, point.y, { button });
        await settle(this.page);
        return point;
    }

    /**
     * Picks a component and places it at a point relative to the middle of the workspace, then presses Escape so
     * nothing is left following the mouse.
     */
    async place(offset: Point = { x: 0, y: 0 }, type = 'AndGate'): Promise<void> {
        await this.pickPaletteComponent(type);
        // come in from the side, so the ghost is shown before the click
        await this.moveFromCenterTo({ x: offset.x - 30, y: offset.y - 30 });
        await this.clickFromCenterAt(offset);
        await this.page.keyboard.press('Escape');
        await expect(this.palette.checkedCheckboxes).toHaveCount(0);
        await settle(this.page);
    }

    /** Drags on the workspace from a point relative to its middle, by dx, dy. Without releasing if `release` is false. */
    async drag(from: Point, by: Point, release = true): Promise<void> {
        const start = await this.atCenter(from);
        await this.page.mouse.move(start.x, start.y);
        await this.page.mouse.down();
        await this.page.mouse.move(start.x + by.x, start.y + by.y, { steps: 10 });
        if (release) await this.page.mouse.up();
        await settle(this.page);
    }

    /** The mouse cursor the workspace sets over the diagram. */
    async cursor(): Promise<string> {
        return this.presenter.evaluate(el => el.style.cursor);
    }

    /**
     * Calculates information about what is drawn on a canvas layer.
     * Returns Drawn object or null of drawn pixel count is 0.
     * 
     * @param layer The canvas layer to analyze.
     * @returns count: The number of pixels with alpha > 0,
     *          left: layer x position of left-most drawn pixel,
     *          right: layer x position of right-most drawn pixel,
     *          top: layer y position of top-most drawn pixel,
     *          bottom: layer y position of bottom-most drawn pixel,
     *          color: The average color of all counted pixels,
     *          alpha: average alpha of all counted pixels.
     * 
     *          or null if count === 0
     */
    async drawn(layer: Layer): Promise<Drawn | null> {
        return this.canvas(layer).evaluate((canvas: HTMLCanvasElement) => {
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
                color: { r: r / a, g: g / a, b: b / a },
                alpha: a / count,
            };
        });
    }

    /** The middle of what is drawn on a layer, in client coordinates. */
    async drawnCenter(layer: Layer): Promise<Point | null> {
        const drawn = await this.drawn(layer);
        return drawn && { x: (drawn.left + drawn.right) / 2, y: (drawn.top + drawn.bottom) / 2 };
    }
}
