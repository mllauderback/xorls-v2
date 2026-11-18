import { expect, Page } from "@playwright/test"
import type { Locator } from "@playwright/test";
import { settle } from "./draw-helpers";
import { Sidebar } from "./sidebar";

/** The ids of the zoom settings' fields. */
export const zoomSettingsFields = ['zoomScrollRate', 'zoomPinchRate', 'zoomMin', 'zoomMax'] as const;
export type ZoomSettingField = typeof zoomSettingsFields[number];

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
        await this.openSection('gridSettings');
    }

    /**
     * Opens the settings in the sidebar and expands the zoom settings inside it.
     */
    async openZoomSettings(): Promise<void> {
        await this.openSection('zoomSettings');
    }

    /** The handle of a zoom setting's slider, by the slider's test id. */
    zoomSlider(field: ZoomSettingField): Locator {
        return this.page.getByTestId(field).getByRole('slider');
    }

    /**
     * Sets one of the zoom settings with its slider. The value has to be one the slider can stop at. The zoom
     * settings have to be open.
     */
    async setZoomSetting(field: ZoomSettingField, value: number): Promise<void> {
        await setSlider(this.zoomSlider(field), value);
        await settle(this.page);
    }

    /**
     * Checks or unchecks "Invert scroll zoom", and checks that it shows that way. The zoom settings have to be open.
     */
    async setInvertScroll(inverted: boolean): Promise<void> {
        const checkbox = this.page.locator('#zoomInvertScroll');
        if ((await checkbox.isChecked()) !== inverted) await this.page.locator('label[for="zoomInvertScroll"]').click();
        await expect(checkbox).toBeChecked({ checked: inverted });
        await settle(this.page);
    }

    /** The value a zoom setting's slider is at. The zoom settings have to be open. */
    async zoomSetting(field: ZoomSettingField): Promise<number> {
        return sliderValue(this.zoomSlider(field));
    }

    /** Opens the settings in the sidebar and expands one of its sections, by its test id. */
    private async openSection(testId: string): Promise<void> {
        await this.sidebar.open('settings');
        const fieldset = this.page.getByTestId(testId);
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
        await setSlider(this.gridSpacingSlider, spacing);
        await settle(this.page);
    }

    /** The handle of the cell size slider. */
    get gridSpacingSlider(): Locator {
        return this.page.getByTestId('gridSpacing').getByRole('slider');
    }

    /** The cell size the slider is at. The grid settings have to be open. */
    async gridSpacing(): Promise<number> {
        return sliderValue(this.gridSpacingSlider);
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

/** The value a slider is at. */
async function sliderValue(slider: Locator): Promise<number> {
    return Number(await slider.getAttribute('aria-valuenow'));
}

/**
 * Moves a slider to a value one step at a time.
 */
async function setSlider(slider: Locator, value: number): Promise<void> {
    const min = Number(await slider.getAttribute('aria-valuemin'));
    const max = Number(await slider.getAttribute('aria-valuemax'));
    if (value < min || value > max) throw new Error(`${value} is outside the slider's range, ${min} to ${max}`);

    await slider.focus();
    let current = await sliderValue(slider);
    const up = current < value;
    while (current !== value) {
        // a step past the value means it is between two of the slider's steps
        if (up ? current > value : current < value) throw new Error(`The slider doesn't stop at ${value}`);
        current = await pressOnSlider(slider, up ? 'ArrowRight' : 'ArrowLeft');
    }
}

/**
 * Presses a key on a slider and waits for it to move.
 *
 * @returns The value it moved to
 */
async function pressOnSlider(slider: Locator, key: string): Promise<number> {
    const before = await sliderValue(slider);
    await slider.press(key);
    await expect.poll(() => sliderValue(slider)).not.toBe(before);
    return sliderValue(slider);
}
