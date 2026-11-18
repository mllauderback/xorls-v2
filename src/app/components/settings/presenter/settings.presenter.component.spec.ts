import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { describe, beforeEach, it, expect } from 'vitest';

import { SettingsPresenterComponent } from './settings.presenter.component';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { DEFAULT_ZOOM_SETTINGS } from '../../../store/settings/feature';

describe('SettingsComponent', () => {
    let component: SettingsPresenterComponent;
    let fixture: ComponentFixture<SettingsPresenterComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [SettingsPresenterComponent],
            providers: [
                provideAnimationsAsync()
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(SettingsPresenterComponent);
        component = fixture.componentInstance;
        component.settings = {
            leftPanelResizeByPct: true,
            leftPanelWidth: 30,
            workspaceSettings: {
                gridSettings: {
                    gridSpacing: 20,
                    gridMode: 'dots'
                },
                zoomSettings: { ...DEFAULT_ZOOM_SETTINGS }
            }
        };
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    describe('cell size', () => {
        function handle(): HTMLElement {
            return fixture.nativeElement.querySelector('[data-testid="gridSpacing"] [role="slider"]');
        }

        async function shown() {
            await fixture.whenStable();
            fixture.detectChanges();
        }

        function press(code: string) {
            handle().dispatchEvent(new KeyboardEvent('keydown', { code, key: code, bubbles: true, cancelable: true }));
        }

        it('should be a slider, not a text field, labelled by its label', () => {
            const fieldset = fixture.nativeElement.querySelector('[data-testid="gridSettings"]') as HTMLElement;
            const labelId = handle().getAttribute('aria-labelledby')!;

            expect(handle()).not.toBeNull();
            expect(fieldset.querySelector(`#${labelId}`)).not.toBeNull();
            expect(fieldset.querySelectorAll('input:not([type="checkbox"]):not([type="radio"])')).toHaveLength(0);
        });

        it('should range from 5px to 100px', () => {
            expect(Number(handle().getAttribute('aria-valuemin'))).toBe(5);
            expect(Number(handle().getAttribute('aria-valuemax'))).toBe(100);
        });

        it('should be at the cell size setting, and show it in its label', async () => {
            await shown();

            expect(Number(handle().getAttribute('aria-valuenow'))).toBe(20);
            expect(fixture.nativeElement.querySelector('[data-testid="gridSpacingValue"]').textContent.trim()).toBe('20px');
        });

        it('should emit whole pixels, one at a time from the keyboard', async () => {
            await shown();
            const emitted: number[] = [];
            component.gridSpacing.subscribe(value => emitted.push(value));

            press('ArrowRight');
            press('ArrowRight');
            press('ArrowLeft');

            expect(emitted).toEqual([21, 22, 21]);
        });

        it('should emit only 5px to 100px', async () => {
            await shown();
            const emitted: number[] = [];
            component.gridSpacing.subscribe(value => emitted.push(value));

            press('End');
            press('ArrowRight');
            press('Home');
            press('ArrowLeft');

            expect(Math.max(...emitted)).toBe(100);
            expect(Math.min(...emitted)).toBe(5);
        });
    });

    describe('zoom settings', () => {
        const sliders = [
            { id: 'zoomScrollRate', key: 'scrollRate', output: 'zoomScrollRate', min: 0.0005, max: 0.005, step: 0.0001, shown: '0.0015' },
            { id: 'zoomPinchRate', key: 'pinchRate', output: 'zoomPinchRate', min: 0.002, max: 0.03, step: 0.001, shown: '0.010' },
            { id: 'zoomMin', key: 'minZoom', output: 'minZoom', min: 0.1, max: 1, step: 0.05, shown: '0.25x' },
            { id: 'zoomMax', key: 'maxZoom', output: 'maxZoom', min: 1, max: 10, step: 0.5, shown: '5.0x' },
        ] as const;

        function handle(id: string): HTMLElement {
            return fixture.nativeElement.querySelector(`[data-testid="${id}"] [role="slider"]`);
        }

        async function shown() {
            // ngModel writes its value after a tick, and the slider shows it on the next change detection
            await fixture.whenStable();
            fixture.detectChanges();
        }

        function press(id: string, code: string) {
            handle(id).dispatchEvent(new KeyboardEvent('keydown', { code, key: code, bubbles: true, cancelable: true }));
        }

        it('should have no text fields for them: only sliders, and the checkbox', () => {
            const fieldset = fixture.nativeElement.querySelector('[data-testid="zoomSettings"]') as HTMLElement;

            expect(fieldset.querySelectorAll('input:not([type="checkbox"])')).toHaveLength(0);
            expect(fieldset.querySelectorAll('[role="slider"]')).toHaveLength(4);
        });

        it.each(sliders)('should have a slider for $key, labelled by its label', ({ id }) => {
            const labelId = handle(id).getAttribute('aria-labelledby')!;

            expect(handle(id)).not.toBeNull();
            expect(fixture.nativeElement.querySelector(`#${labelId}`)).not.toBeNull();
        });

        it.each(sliders)('should range $key from $min to $max', ({ id, min, max }) => {
            expect(Number(handle(id).getAttribute('aria-valuemin'))).toBe(min);
            expect(Number(handle(id).getAttribute('aria-valuemax'))).toBe(max);
        });

        it.each(sliders)('should start $key at its default, within its range', async ({ id, key, min, max }) => {
            await shown();

            expect(Number(handle(id).getAttribute('aria-valuenow'))).toBe(DEFAULT_ZOOM_SETTINGS[key]);
            expect(DEFAULT_ZOOM_SETTINGS[key]).toBeGreaterThanOrEqual(min);
            expect(DEFAULT_ZOOM_SETTINGS[key]).toBeLessThanOrEqual(max);
        });

        it.each(sliders)('should show the $key value in its label', async ({ id, shown: text }) => {
            await shown();

            expect(fixture.nativeElement.querySelector(`[data-testid="${id}Value"]`).textContent.trim()).toBe(text);
        });

        it.each(sliders)('should emit $key one step up or down from the keyboard', async ({ id, key, output, step }) => {
            await shown();
            const emitted: number[] = [];
            component[output].subscribe(value => emitted.push(value));

            press(id, 'ArrowRight');
            press(id, 'ArrowLeft');

            expect(emitted[0]).toBeCloseTo(DEFAULT_ZOOM_SETTINGS[key] + step, 10);
            expect(emitted).toHaveLength(2);
        });

        it.each(sliders)('should emit only $min to $max for $key', async ({ id, output, min, max }) => {
            await shown();
            const emitted: number[] = [];
            component[output].subscribe(value => emitted.push(value));

            press(id, 'End');
            press(id, 'ArrowRight');
            press(id, 'Home');
            press(id, 'ArrowLeft');

            expect(Math.max(...emitted)).toBe(max);
            expect(Math.min(...emitted)).toBe(min);
        });

        it('should not let the smallest zoom be set above the largest', () => {
            const { minZoom, maxZoom } = component['zoomSliders'];

            expect(minZoom.max).toBeLessThanOrEqual(maxZoom.min);
        });

        it('should emit numbers with no more decimals than the step, not 0.0016000000000000001', async () => {
            await shown();
            const emitted: number[] = [];
            component.zoomScrollRate.subscribe(value => emitted.push(value));

            for (let i = 0; i < 7; i++) press('zoomScrollRate', 'ArrowRight');

            expect(emitted.at(-1)).toBe(0.0022);
        });

        describe('invert scroll zoom', () => {
            function checkbox(): HTMLInputElement {
                return fixture.nativeElement.querySelector('input#zoomInvertScroll');
            }

            it('should have a labelled checkbox', () => {
                expect(checkbox()).not.toBeNull();
                expect(checkbox().type).toBe('checkbox');
                expect(fixture.nativeElement.querySelector('label[for="zoomInvertScroll"]')).not.toBeNull();
            });

            it('should show whether scrolling is inverted', async () => {
                await shown();
                expect(checkbox().checked).toBe(false);

                component.settings = {
                    ...component.settings!,
                    workspaceSettings: {
                        ...component.settings!.workspaceSettings,
                        zoomSettings: { ...DEFAULT_ZOOM_SETTINGS, invertScroll: true },
                    },
                };
                fixture.detectChanges();
                await shown();

                expect(checkbox().checked).toBe(true);
            });

            it('should emit invertScroll when it is clicked', async () => {
                const emitted: boolean[] = [];
                component.invertScroll.subscribe(value => emitted.push(value));
                await shown();

                checkbox().click();
                await fixture.whenStable();

                expect(emitted).toEqual([true]);
            });
        });
    });
});
