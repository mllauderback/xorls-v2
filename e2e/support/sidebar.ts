import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * The tabs of the sidebar. app.component.html gives each tab and its panel a data-testid made from its name:
 * componentsTab and componentsTabPanel. They aren't ids, because PrimeNG replaces the id of a p-tab and a p-tabpanel
 * with one it generates when it renders them.
 */
export const SIDEBAR_TABS = ['explorer', 'components', 'settings'] as const;
export type SidebarTab = (typeof SIDEBAR_TABS)[number];

/** Drives the sidebar on the left: its column of tabs and the panel each one shows. */
export class Sidebar {
    readonly page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    /** The button of a tab, in the sidebar's tab column. */
    tab(name: SidebarTab): Locator {
        return this.page.getByTestId(`${name}Tab`);
    }

    /** The panel a tab shows. */
    panel(name: SidebarTab): Locator {
        return this.page.getByTestId(`${name}TabPanel`);
    }

    /** Shows a tab's panel, if it isn't showing already, and waits for it. */
    async open(name: SidebarTab): Promise<void> {
        if (!(await this.panel(name).isVisible())) await this.tab(name).click();
        await expect(this.tab(name)).toHaveAttribute('aria-selected', 'true');
        await expect(this.panel(name)).toBeVisible();
    }
}
