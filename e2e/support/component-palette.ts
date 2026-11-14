import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { Sidebar } from './sidebar';

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
 * Drives the component palette in the "components" tab of the sidebar. The palette tiles keep the ids they are given:
 * each checkbox's id is its component type.
 */
export class ComponentPalette {
    readonly page: Page;
    readonly sidebar: Sidebar;

    constructor(page: Page) {
        this.page = page;
        this.sidebar = new Sidebar(page);
    }

    /** The sidebar tab that opens the palette. */
    get componentsTab(): Locator {
        return this.sidebar.tab('components');
    }

    /** The sidebar tab panel the palette lives in. */
    get tabPanel(): Locator {
        return this.sidebar.panel('components');
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
    async load(): Promise<void> {
        await this.page.goto('/');
        await this.sidebar.open('components');
        await expect(this.root).toBeVisible();
    }

    header(category: Category): Locator {
        return this.panel(category).locator('p-accordion-header');
    }

    /**
     * The accordion panel of one category, found by the data-testid the palette gives it: the category's name in
     * lower case with anything that isn't a letter or a digit turned into a dash. "I/O" has paletteCategory-i-o.
     */
    panel(category: Category): Locator {
        const id = `paletteCategory-${category.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
        return this.root.getByTestId(id);
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
