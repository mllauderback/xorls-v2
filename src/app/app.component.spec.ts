import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { describe, beforeEach, it, expect } from 'vitest';
import { By } from '@angular/platform-browser';
import { Component, NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentPaletteContainerComponent } from './components/component-palette/container/component-palette.container.component';
import { SettingsContainerComponent } from './components/settings/container/settings.container.component';
import { WorkspaceContainerComponent } from './components/workspace/container/workspace.container.component';

// mock components which use the store
@Component({ selector: 'app-settings-container', template: '<div></div>' })
class MockSettingsContainerComponent { }
@Component({ selector: 'app-component-palette-container', template: '<div></div>' })
class MockComponentPaletteContainerComponent { }
@Component({ selector: 'app-workspace-container', template: '<div></div>' })
class MockWorkspaceContainerComponent { }

describe('AppComponent', () => {
    let fixture: ComponentFixture<AppComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [
                AppComponent
            ],
            schemas: [NO_ERRORS_SCHEMA]
        })
            .overrideComponent(AppComponent, {
                remove: {
                    imports: [
                        ComponentPaletteContainerComponent,
                        SettingsContainerComponent,
                        WorkspaceContainerComponent
                    ]
                },
                add: {
                    imports: [
                        MockComponentPaletteContainerComponent,
                        MockSettingsContainerComponent,
                        MockWorkspaceContainerComponent
                    ]
                }
            })
            .compileComponents();

        fixture = TestBed.createComponent(AppComponent);
    });

    it('should create the app', () => {
        const app = fixture.componentInstance;
        expect(app).toBeTruthy();
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
            const icon = fixture.debugElement.query(By.css('#explorerTab i'));
            expect(icon?.nativeElement.classList).toContain('pi-copy');
        });

        it('should render the Components tab with pi-box icon', () => {
            const icon = fixture.debugElement.query(By.css('#componentsTab i'));
            expect(icon?.nativeElement.classList).toContain('pi-box');
        });

        it('should render the Settings tab with pi-cog icon', () => {
            const icon = fixture.debugElement.query(By.css('#settingsTab i'));
            expect(icon?.nativeElement.classList).toContain('pi-cog');
        });
    });

    describe('Tab tooltips', () => {
        it('should have correct tooltip on Explorer tab', () => {
            const tab = fixture.debugElement.query(By.css('#explorerTab'));
            expect(tab.nativeElement.getAttribute('pTooltip')).toBe('Explorer');
        });

        it('should have correct tooltip on Components tab', () => {
            const tab = fixture.debugElement.query(By.css('#componentsTab'));
            expect(tab.nativeElement.getAttribute('pTooltip')).toBe('Components');
        });

        it('should have correct tooltip on Settings tab', () => {
            const tab = fixture.debugElement.query(By.css('#settingsTab'));
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
        it('should have Explorer panel (idk yet, this just passes for now)', () => {
            const panel = fixture.debugElement.query(By.css('#explorerTabPanel'));
            expect(panel).toBeTruthy();
        });

        it('should have Components panel', () => {
            const palette = fixture.debugElement.query(By.css('#componentsTabPanel'));
            expect(palette).toBeTruthy();
        });

        it('should have Settings panel', () => {
            const settings = fixture.debugElement.query(By.css('#settingsTabPanel'));
            expect(settings).toBeTruthy();
        });

        it('should give Explorer tab and panel the same value attribute', () => {
            const tabEl = fixture.debugElement.query(By.css('#explorerTab')).nativeElement;
            const panelEl = fixture.debugElement.query(By.css('#explorerTabPanel')).nativeElement;
            expect(tabEl.getAttribute('value')).toBe(panelEl.getAttribute('value'));
        });

        it('should give Components tab and panel the same value attribute', () => {
            const tabEl = fixture.debugElement.query(By.css('#componentsTab')).nativeElement;
            const panelEl = fixture.debugElement.query(By.css('#componentsTabPanel')).nativeElement;
            expect(tabEl.getAttribute('value')).toBe(panelEl.getAttribute('value'));
        });

        it('should give Settings tab and panel the same value attribute', () => {
            const tabEl = fixture.debugElement.query(By.css('#settingsTab')).nativeElement;
            const panelEl = fixture.debugElement.query(By.css('#settingsTabPanel')).nativeElement;
            expect(tabEl.getAttribute('value')).toBe(panelEl.getAttribute('value'));
        });
    });

    describe('Tab default state', () => {
        it('should make Explorer tab the default (value=0)', () => {
            const explorerTab = fixture.debugElement.query(By.css('#explorerTab'));
            expect(explorerTab.nativeElement.getAttribute('value')).toBe('0');
        });

        it('should make Components tab value=1', () => {
            const tabEl = fixture.debugElement.query(By.css('#componentsTab')).nativeElement;
            expect(tabEl.getAttribute('value')).toBe('1');
        });

        it('should make Settings tab value=2', () => {
            const tabEl = fixture.debugElement.query(By.css('#settingsTab')).nativeElement;
            expect(tabEl.getAttribute('value')).toBe('2');
        });
    });

    describe('Layout structure', () => {
        it('should have flex, flex-grow on the root container', () => {
            const root = fixture.debugElement.query(By.css('div.flex.flex-col.flex-grow'));
            expect(root).toBeTruthy();
        });

        it('should have flex, flex-grow, and hide overflow on main content', () => {
            const mainContent = fixture.debugElement.query(By.css('#mainContent.flex.flex-grow.overflow-hidden'));
            expect(mainContent).toBeTruthy();
        });

        it('should render app-workspace-container', () => {
            const workspace = fixture.debugElement.query(By.css('app-workspace-container'));
            expect(workspace).toBeTruthy();
        });

        it('should render app-statusbar', () => {
            const statusbar = fixture.debugElement.query(By.css('app-statusbar'));
            expect(statusbar).toBeTruthy();
        });
    });
});
