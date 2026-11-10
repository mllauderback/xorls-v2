import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { DividerModule } from 'primeng/divider';
import { describe, beforeEach, it, expect } from 'vitest';

import { SelectablePropertiesPresenterComponent } from './selectable-properties.presenter.component';

/** PrimeNG's scroll panel measures its content to size its scroll bars, which the test DOM can't do (calc(NaN%)). */
// eslint-disable-next-line @angular-eslint/component-selector -- it has to match the selector of the component it replaces
@Component({ selector: 'p-scrollpanel', template: '<ng-content />' })
class StubScrollPanelComponent { }

describe('SelectablePropertiesComponent', () => {
    let component: SelectablePropertiesPresenterComponent;
    let fixture: ComponentFixture<SelectablePropertiesPresenterComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [SelectablePropertiesPresenterComponent]
        })
            .overrideComponent(SelectablePropertiesPresenterComponent, {
                set: { imports: [DividerModule, StubScrollPanelComponent] }
            })
            .compileComponents();

        fixture = TestBed.createComponent(SelectablePropertiesPresenterComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should say nothing is selected when there is no selection', () => {
        component.selectable = null;
        fixture.detectChanges();

        expect(fixture.nativeElement.textContent).toContain('Nothing is selected.');
    });

    it('should show the class name of the selected component', () => {
        component.selectable = { workspaceId: 'workspace-1', id: 'gate-1', className: 'AndGate' };
        fixture.detectChanges();

        expect(fixture.nativeElement.textContent).toContain('AndGate Properties');
        expect(fixture.nativeElement.textContent).not.toContain('Nothing is selected.');
    });
});
