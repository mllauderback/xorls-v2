import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { describe, beforeEach, it, expect } from 'vitest';
import { By } from '@angular/platform-browser';
import { Component, NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentPaletteContainerComponent } from './components/component-palette/container/component-palette.container.component';
import { SettingsContainerComponent } from './components/settings/container/settings.container.component';
import { provideMockStore } from '@ngrx/store/testing';

// mock components which use the store
@Component({ selector: 'app-settings-container', template: '<div></div>' })
class MockSettingsContainerComponent { }
@Component({ selector: 'app-component-palette-container', template: '<div></div>' })
class MockComponentPaletteContainerComponent { }
// @Component({ selector: 'app-workspace-tabs', template: '<div></div>' })
// class MockWorkspaceContainerComponent { }

describe('AppComponent', () => {
    let fixture: ComponentFixture<AppComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [
                AppComponent
            ],
            providers: [provideMockStore()],
            schemas: [NO_ERRORS_SCHEMA]
        })
            .overrideComponent(AppComponent, {
                remove: {
                    imports: [
                        ComponentPaletteContainerComponent,
                        SettingsContainerComponent,
                    ]
                },
                add: {
                    imports: [
                        MockComponentPaletteContainerComponent,
                        MockSettingsContainerComponent,
                    ]
                }
            })
            .compileComponents();

        fixture = TestBed.createComponent(AppComponent);
    });

    it(`should have the 'xorls' title`, () => {
        const app = fixture.componentInstance;
        expect(app.title).toEqual('xorls');
    });

    describe('Tabs', () => {
        it('should have three tabs', () => {
            const tabs = fixture.debugElement.queryAll(By.css(".navigationTabs"));
            expect(tabs.length).toEqual(3);
            tabs.forEach(tab => expect(tab).toBeTruthy());
        });
    });

    describe('Tab icons', () => {
        it('should render the Explorer tab with pi-copy icon', () => {
            const icon = fixture.debugElement.query(By.css('[data-testid="explorerTab"] i'));
            expect(icon?.nativeElement.classList).toContain('pi-copy');
        });

        it('should render the Components tab with pi-box icon', () => {
            const icon = fixture.debugElement.query(By.css('[data-testid="componentsTab"] i'));
            expect(icon?.nativeElement.classList).toContain('pi-box');
        });

        it('should render the Settings tab with pi-cog icon', () => {
            const icon = fixture.debugElement.query(By.css('[data-testid="settingsTab"] i'));
            expect(icon?.nativeElement.classList).toContain('pi-cog');
        });
    });

    describe('Tab tooltips', () => {
        it('should have correct tooltip on Explorer tab', () => {
            const tab = fixture.debugElement.query(By.css('[data-testid="explorerTab"]'));
            expect(tab.nativeElement.getAttribute('pTooltip')).toBe('Explorer');
        });

        it('should have correct tooltip on Components tab', () => {
            const tab = fixture.debugElement.query(By.css('[data-testid="componentsTab"]'));
            expect(tab.nativeElement.getAttribute('pTooltip')).toBe('Components');
        });

        it('should have correct tooltip on Settings tab', () => {
            const tab = fixture.debugElement.query(By.css('[data-testid="settingsTab"]'));
            expect(tab.nativeElement.getAttribute('pTooltip')).toBe('Settings');
        });

        it('should have showDelay of 750 on all tabs', () => {
            const tabs = fixture.debugElement.queryAll(By.css('.navigationTabs'));
            tabs.forEach(tab => {
                expect(tab.nativeElement.getAttribute('showDelay')).toBe('750');
            });
        });
    });

    describe('Tab panel content', () => {
        it.each([
            ['explorer', '0'],
            ['components', '1'],
            ['settings', '2'],
        ])('should give the %s tab and its panel the value %s', (name, value) => {
            const tabEl = fixture.debugElement.query(By.css(`[data-testid="${name}Tab"]`)).nativeElement;
            const panelEl = fixture.debugElement.query(By.css(`[data-testid="${name}TabPanel"]`)).nativeElement;
            expect(tabEl.getAttribute('value')).toBe(value);
            expect(panelEl.getAttribute('value')).toBe(value);
        });
    });

    describe('Layout structure', () => {
        it('should have flex, flex-grow on the root container', () => {
            const root = fixture.debugElement.query(By.css('div.flex.flex-col.flex-grow'));
            expect(root).toBeTruthy();
        });

        it('should have flex, flex-grow, and hide overflow on main content', () => {
            const mainContent = fixture.debugElement.query(By.css('[data-testid="mainContent"].flex.flex-grow.overflow-hidden'));
            expect(mainContent).toBeTruthy();
        });

        it('should render app-workspace-tabs', () => {
            const workspace = fixture.debugElement.query(By.css('app-workspace-tabs'));
            expect(workspace).toBeTruthy();
        });

        it('should render app-statusbar', () => {
            const statusbar = fixture.debugElement.query(By.css('app-statusbar'));
            expect(statusbar).toBeTruthy();
        });
    });
});
