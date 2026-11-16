import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import type { Layer } from './canvas-layer';
import { CanvasLayer, LAYERS } from './canvas-layer';
import { ComponentPalette } from './component-palette';
import type { Size } from './draw-helpers';
import { growWindow, Point, settle } from './draw-helpers';

export type MouseButton = 'left' | 'right' | 'middle';
export type PanButton = 'right' | 'middle';
export const PAN_BUTTONS: readonly PanButton[] = ['right', 'middle'];

export interface DragOptions {
    /** The button to drag with. */
    button?: MouseButton;
    /** False to keep the button held when the drag is done. True by default. */
    release?: boolean;
}

export type PanOptions = DragOptions & { button?: PanButton };

/** The grid spacing the app starts with. Mirrors the settings store's initial state. */
export const DEFAULT_GRID_SPACING = 20;

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

    /** One of the workspace's canvas layers, to read what is drawn on it. */
    layer(name: Layer): CanvasLayer {
        return new CanvasLayer(this.presenter, name);
    }

    async load(): Promise<void> {
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
        await this.palette.sidebar.open('components');
        await this.palette.expand(category);
        await this.palette.clickTile(type);
        await expect(this.palette.checkbox(type)).toBeChecked();
    }

    /** Clicks at a point relative to the middle of the workspace, after moving the mouse there. */
    async clickFromCenterAt(offset: Point = { x: 0, y: 0 }, button: MouseButton = 'left'): Promise<Point> {
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

    /** Drags on the workspace from a point relative to its middle, by dx, dy. With the left button by default. */
    async drag(from: Point, by: Point, { button = 'left', release = true }: DragOptions = {}): Promise<void> {
        const start = await this.atCenter(from);
        await this.page.mouse.move(start.x, start.y);
        await this.page.mouse.down({ button });
        await this.page.mouse.move(start.x + by.x, start.y + by.y, { steps: 10 });
        if (release) await this.page.mouse.up({ button });
        await settle(this.page);
    }

    /**
     * Pans the diagram: drags with a pan button (right by default, or middle) from a point relative to the middle of
     * the workspace, by dx, dy. A pan that isn't released is ended with releasePan().
     */
    async pan(from: Point, by: Point, { button = 'right', release = true }: PanOptions = {}): Promise<void> {
        await this.drag(from, by, { button, release });
    }

    /** Releases the button of a pan that was started with `release: false`. */
    async releasePan(button: PanButton = 'right'): Promise<void> {
        await this.page.mouse.up({ button });
        await settle(this.page);
    }

    /**
     * Makes the browser window bigger and waits until the workspace has grown with it, its canvases cover it again
     * and they have been redrawn.
     *
     * @returns The size the window had
     */
    async growWindow(by?: Size): Promise<Size> {
        const presenter = this.presenter;
        async function width() {
            return (await presenter.boundingBox())!.width;
        }
        const widthBefore = await width();
        const before = await growWindow(this.page, by);

        await expect.poll(width).toBeGreaterThan(widthBefore);
        await expect.poll(async () => {
            const box = (await presenter.boundingBox())!;
            return this.canvases.evaluateAll(
                (canvases: HTMLCanvasElement[], view: Size) => canvases.every(c => c.width >= view.width && c.height >= view.height),
                { width: Math.floor(box.width), height: Math.floor(box.height) }
            );
        }).toBe(true);
        await settle(this.page);
        return before;
    }

    /** The mouse cursor the workspace sets over the diagram. */
    async cursor(): Promise<string> {
        return this.presenter.evaluate(el => el.style.cursor);
    }
}
