import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import type { Size } from './draw-helpers';
import { settle } from './draw-helpers';

/** The tabs the app opens with, in order. Mirrors WorkspaceTabsComponent.ngOnInit. */
export const INITIAL_TABS = ['Tab 1', 'Tab 2'] as const;
export type TabName = (typeof INITIAL_TABS)[number];

/**
 * Drives the workspace tabs: app-workspace-tabs, which shows one diagram workspace per tab through
 * app-xorls-tab-view, the draggable, closable tab strip.
 *
 * The tab view only renders the content of the active tab, so there is at most one workspace in the DOM.
 */
export class WorkspaceTabs {
    readonly page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    get root(): Locator {
        return this.page.locator('app-workspace-tabs');
    }

    get tabView(): Locator {
        return this.root.locator('app-xorls-tab-view');
    }

    get headerList(): Locator {
        return this.tabView.locator('.draggable-tab-header-list');
    }

    get headers(): Locator {
        return this.headerList.locator('.draggable-tab-header');
    }

    get activeHeader(): Locator {
        return this.headerList.locator('.draggable-tab-header.active');
    }

    get content(): Locator {
        return this.tabView.locator('.draggable-tab-content');
    }

    /**
     * The workspace of the active tab: the component the workspace tabs create for it. What is inside it belongs to
     * the workspace, and is tested with the workspace.
     */
    get workspace(): Locator {
        return this.content.locator('app-diagram-workspace-container');
    }

    /** What the tab view shows once every tab is closed. */
    get emptyState(): Locator {
        return this.tabView.locator('.empty-content');
    }

    async load(): Promise<void> {
        await this.page.goto('/');
        await expect(this.headers).toHaveCount(INITIAL_TABS.length);
        await expect(this.workspace).toBeVisible();
    }

    header(name: string): Locator {
        return this.headers.filter({ hasText: new RegExp(`^\\s*${name}\\s*$`) });
    }

    closeButton(name: string): Locator {
        return this.header(name).locator('.close-btn');
    }

    /** The header text of every tab, in order. */
    async names(): Promise<string[]> {
        return (await this.headers.allInnerTexts()).map(text => text.trim());
    }

    async activate(name: string): Promise<void> {
        await this.header(name).click();
        await expect(this.header(name)).toHaveClass(/\bactive\b/);
        await expect(this.workspace).toBeVisible();
    }

    /** Closes a tab with its close button and waits for its header to go. The close is animated. */
    async close(name: string): Promise<void> {
        const count = await this.headers.count();
        await this.closeButton(name).click();
        await expect(this.headers).toHaveCount(count - 1);
    }

    /**
     * Drags a tab header and drops it past the middle of another one. The CDK drop list needs the pointer to move in
     * steps, so the drag goes through page.mouse rather than locator.dragTo.
     */
    async drag(name: string, onto: string): Promise<void> {
        const from = (await this.header(name).boundingBox())!;
        const to = (await this.header(onto).boundingBox())!;
        const startX = from.x + from.width / 2;
        const y = from.y + from.height / 2;
        // past the middle of the target, on the side it is coming from
        const endX = to.x > from.x ? to.x + to.width * 0.75 : to.x + to.width * 0.25;

        await this.page.mouse.move(startX, y);
        await this.page.mouse.down();
        const steps = 10;
        for (let i = 1; i <= steps; i++) {
            await this.page.mouse.move(startX + (endX - startX) * (i / steps), y);
        }
        await this.page.mouse.up();
        // the drop animates a preview, appended to the body, into place; the header is back in the list after that
        await expect(this.page.locator('.cdk-drag-preview, .cdk-drag-placeholder')).toHaveCount(0);
    }

    /**
     * A picture of the active tab's workspace. Comparing pictures tells whether a tab's diagram changed, or is the same
     * as before, without depending on how the workspace draws it.
     */
    async snapshot(): Promise<Buffer> {
        // let the workspace finish drawing whatever just changed
        await settle(this.page);
        return this.workspace.screenshot({ animations: 'disabled' });
    }

    /**
     * The smallest width and height of the canvases in the active tab's workspace. The workspace tabs resize the
     * diagram of the active tab to fit the space it is shown in.
     */
    async canvasSize(): Promise<Size> {
        return this.workspace.locator('canvas').evaluateAll((canvases: HTMLCanvasElement[]) => ({
            width: Math.min(...canvases.map(c => c.width)),
            height: Math.min(...canvases.map(c => c.height)),
        }));
    }

    /** The space the active tab's workspace is shown in. */
    async viewportSize(): Promise<Size> {
        const box = (await this.workspace.boundingBox())!;
        return { width: Math.floor(box.width), height: Math.floor(box.height) };
    }
}
