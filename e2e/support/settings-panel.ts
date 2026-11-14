import { expect, Page } from "@playwright/test"
import { settle } from "./draw-helpers";
import { Sidebar } from "./sidebar";

export class SettingsPanel {
    readonly page: Page;
    readonly sidebar: Sidebar;

    constructor(page: Page) {
        this.page = page;
        this.sidebar = new Sidebar(page);
    }

    /**
     * Opens the settigns in the sidebar and expands the grid settings inside it.
     */
    async openGridSettings(): Promise<void> {
        await this.sidebar.open('settings');
        const fieldset = this.page.getByTestId('gridSettings');
        const toggle = fieldset.locator('legend button');
        await expect(toggle).toBeVisible();
        if ((await toggle.getAttribute('aria-expanded')) !== 'true') await toggle.click();
        await expect(toggle).toHaveAttribute('aria-expanded', 'true');
        await expect(fieldset.locator('fieldset')).not.toHaveClass(/p-fieldset-collapsed/);
        // the section loses its collapsed class as soon as it is toggled, and then animates open for a few hundred
        // milliseconds. Its fields are only safe to use once that is done.
        await expect(fieldset.locator('.p-fieldset-content-container')).not.toHaveClass(/ng-animating/);
    }

    /** Sets the grid's cell size in the settings. The settings have to be open. */
    async setGridSpacing(spacing: number): Promise<void> {
        const input = this.page.locator('#gridSpacing');
        await input.fill(String(spacing));
        await input.press('Tab');
        await settle(this.page);
    }

    /**
     * Sets the grid's display mode in the settings and checks that the settings show it selected. The settings have
     * to be open.
     */
    async setGridMode(mode: 'lines' | 'dots'): Promise<void> {
        const option = this.page.locator('#gridMode p-togglebutton').filter({ hasText: new RegExp(`^\\s*${mode}\\s*$`) });
        // nothing to click when it is already the selected one
        if ((await option.getAttribute('aria-pressed')) !== 'true') await option.click();
        await expect(option).toHaveAttribute('aria-pressed', 'true');
        await settle(this.page);
    }
}
