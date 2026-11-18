import type { Locator, Page } from '@playwright/test';

/**
 * Adds a plain text field to the page, in its bottom left corner (over the sidebar, away from the diagram), and
 * returns it.
 *
 * For tests of what happens while someone types in a field: keys and middle clicks there are left alone, and the
 * diagram doesn't take the focus from it. The app's own settings are sliders and checkboxes, with no field to type
 * in, but those rules are for any field, such as ones that come later.
 */
export async function addTextField(page: Page): Promise<Locator> {
    await page.evaluate(() => {
        const field = document.createElement('input');
        field.type = 'text';
        field.dataset['testid'] = 'testTextField';
        Object.assign(field.style, { position: 'fixed', left: '4px', bottom: '4px', width: '120px', zIndex: '10000' });
        document.body.append(field);
    });
    return page.getByTestId('testTextField');
}
