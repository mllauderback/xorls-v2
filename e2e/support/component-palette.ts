import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

/** The palette categories, in the order the palette shows them. Mirrors PaletteComponentCategories. */
export const CATEGORIES = ['Gates', 'I/O', 'Decorations'] as const;
export type Category = (typeof CATEGORIES)[number];

/** The component types of each category, in the order the palette shows them. Mirrors initialComponentsState. */
export const COMPONENTS: Record<Category, readonly string[]> = {
    'Gates': ['AndGate', 'OrGate', 'XorGate', 'NotGate', 'Buffer', 'NandGate', 'NorGate', 'XnorGate'],
    'I/O': ['Input', 'Output', 'SevenSegmentDisplay'],
    'Decorations': ['Text'],
};

/**
 * Drives the component palette in the left sidebar.
 *
 * PrimeNG replaces the ids set on p-tab / p-tabpanel (componentsTab, componentsTabPanel, ...) with its own generated
 * ones, so the sidebar tabs are found by their value instead. The palette tiles keep their ids: each checkbox's id
 * is its component type.
 */
export class ComponentPalette {
    readonly page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    /** The sidebar tab that opens the palette. */
    get componentsTab(): Locator {
        return this.page.locator('p-tab[value="1"]');
    }

    /** The sidebar tab panel the palette lives in. */
    get tabPanel(): Locator {
        return this.page.locator('p-tabpanel[value="1"]');
    }

    get root(): Locator {
        return this.tabPanel.locator('app-component-palette-presenter');
    }

    get accordionPanels(): Locator {
        return this.root.locator('p-accordion-panel');
    }

    get headers(): Locator {
        return this.root.locator('p-accordion-header');
    }

    /** The properties panel below the palette. */
    get propertiesPanel(): Locator {
        return this.tabPanel.locator('app-selectable-properties-container');
    }

    /** Every palette checkbox in every category. */
    get allCheckboxes(): Locator {
        return this.root.locator('.grid-selection-checkbox');
    }

    /** The checked palette checkboxes, in every category. */
    get checkedCheckboxes(): Locator {
        return this.root.locator('.grid-selection-checkbox:checked');
    }

    /** Loads the app and opens the components tab in the sidebar. */
    async open(): Promise<void> {
        await this.page.goto('/');
        await this.componentsTab.click();
        await expect(this.tabPanel).toBeVisible();
        await expect(this.root).toBeVisible();
    }

    header(category: Category): Locator {
        return this.panel(category).locator('p-accordion-header');
    }

    panel(category: Category): Locator {
        // the inner locator of `has` is relative to each panel, so it can't start from the page
        const header = this.page.locator('p-accordion-header', { hasText: new RegExp(`^\\s*${escapeRegExp(category)}\\s*$`) });
        return this.accordionPanels.filter({ has: header });
    }

    /** The grid selection panel of one category. */
    grid(category: Category): Locator {
        return this.panel(category).locator('app-grid-selection-panel');
    }

    checkbox(type: string): Locator {
        return this.root.locator(`input.grid-selection-checkbox[id="${type}"]`);
    }

    /** The visible tile of a component. The checkbox itself is clipped out of view; the label is what gets clicked. */
    tile(type: string): Locator {
        return this.root.locator(`label.grid-selection-label[for="${type}"]`);
    }

    async isExpanded(category: Category): Promise<boolean> {
        return (await this.header(category).getAttribute('aria-expanded')) === 'true';
    }

    /** Opens a category, if it isn't open already, and waits for its tiles to show. */
    async expand(category: Category): Promise<void> {
        if (!(await this.isExpanded(category))) await this.header(category).click();
        await expect(this.header(category)).toHaveAttribute('aria-expanded', 'true');
        await expect(this.grid(category)).toBeVisible();
    }

    /** Closes a category, if it is open, and waits for its tiles to hide. */
    async collapse(category: Category): Promise<void> {
        if (await this.isExpanded(category)) await this.header(category).click();
        await expect(this.header(category)).toHaveAttribute('aria-expanded', 'false');
        await expect(this.grid(category)).toBeHidden();
    }

    /** Clicks a component's tile. Its category has to be open. */
    async clickTile(type: string): Promise<void> {
        await this.tile(type).click();
    }

    /** The type of every checked component, in palette order. */
    async checkedTypes(): Promise<string[]> {
        return this.checkedCheckboxes.evaluateAll(inputs => inputs.map(input => input.id));
    }
}

function escapeRegExp(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
}

/** The diagram workspace that is being shown. Its top canvas layer is the one that gets the mouse. */
export function activeWorkspace(page: Page): Locator {
    return page.locator('app-diagram-workspace-presenter:visible').first();
}
