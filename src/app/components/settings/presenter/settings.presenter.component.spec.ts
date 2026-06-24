import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { describe, beforeEach, it, expect } from 'vitest';

import { SettingsPresenterComponent } from './settings.presenter.component';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

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
                }
            }
        };
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
