import { expect, Page } from "@playwright/test"
import { settle } from "./draw-helpers";

export class SettingsPanel {
    readonly page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    /**
     * Opens the settigns in the sidebar and expands the grid settings inside it.
     */
    async openGridSettings(): Promise<void> {
        await this.page.locator('p-tab[value="2"]').click();
        const toggle = this.page.getByRole('button', { name: 'Grid Settings' });
        await expect(toggle).toBeVisible();
        if ((await toggle.getAttribute('aria-expanded')) !== 'true') await toggle.click();
        await expect(toggle).toHaveAttribute('aria-expanded', 'true');
        await expect(this.page.locator('p-fieldset').filter({ has: toggle })).not.toHaveClass(/p-fieldset-collapsed/);
    }

    /** Sets the grid's cell size in the settings. The settings have to be open. */
    async setGridSpacing(spacing: number): Promise<void> {
        const input = this.page.locator('#gridSpacing');
        await input.fill(String(spacing));
        await input.press('Tab');
        await settle(this.page);
    }

    /** Sets the grid's display mode in the settings. The settings have to be open. */
    async setGridMode(mode: 'lines' | 'dots'): Promise<void> {
        await this.page.locator('p-selectbutton').getByText(mode, { exact: true }).click();
        await settle(this.page);
    }
}
