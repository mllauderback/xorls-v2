import type { ComponentFixture } from "@angular/core/testing";
import { TestBed } from "@angular/core/testing";
import { describe, beforeEach, it, expect } from "vitest";
import { WorkspaceContainerComponent } from "./workspace.container.component";
import { Component, Input, NO_ERRORS_SCHEMA } from "@angular/core";
import { By } from "@angular/platform-browser";
import { WorkspacePresenterComponent } from "../presenter/workspace.presenter.component";
import { provideMockStore, MockStore } from "@ngrx/store/testing";
import type { SettingsState, WorkspaceSettingsState } from "../../../store/settings/state";
import type { MemoizedSelector } from "@ngrx/store";
import { selectWorkspaceSettings } from "../../../store/settings/feature";

@Component({ selector: 'app-workspace-presenter', template: '<div></div>' })
class MockWorkspacePresenterComponent {
    @Input() workspaceSettings?: WorkspaceSettingsState | null;
}

describe('WorkspaceContainerComponent', () => {
    let component: WorkspaceContainerComponent;
    let fixture: ComponentFixture<WorkspaceContainerComponent>;
    let store: MockStore;
    let mockSelectWorkspaceSettings: MemoizedSelector<SettingsState, WorkspaceSettingsState>;

    const initialState: Partial<SettingsState> = {
        workspaceSettings: {
            gridSettings: {
                gridSpacing: 20,
                gridMode: 'dots'
            }
        }
    };
    const mockWorkspaceSettings: WorkspaceSettingsState = initialState.workspaceSettings!;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [WorkspaceContainerComponent],
            providers: [provideMockStore({ initialState })],
            schemas: [NO_ERRORS_SCHEMA]
        }).overrideComponent(WorkspaceContainerComponent, {
            remove: {
                imports: [WorkspacePresenterComponent]
            },
            add: {
                imports: [MockWorkspacePresenterComponent]
            }
        })
            .compileComponents();

        fixture = TestBed.createComponent(WorkspaceContainerComponent);
        store = TestBed.inject(MockStore);
        mockSelectWorkspaceSettings = store.overrideSelector(selectWorkspaceSettings, mockWorkspaceSettings);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should have app-workspace-presenter', () => {
        const presenter = fixture.debugElement.query(By.css('app-workspace-presenter'));
        const presenterEl = fixture.debugElement.query(By.directive(MockWorkspacePresenterComponent));
        expect(presenter).toBeTruthy();
        expect(presenterEl).toBeTruthy();
    });

    it('should inject the Store', () => {
        expect(component['store']).toBeTruthy();
    });

    it('should select workspaceSettings$ from store', () => {
        let emittedValue: WorkspaceSettingsState | undefined;
        component['workspaceSettings$'].subscribe((val) => {
            emittedValue = val;
        });
        expect(emittedValue).toEqual(mockWorkspaceSettings);
    });

    it('should pass workspaceSettinsg to presenter', async () => {
        await fixture.whenStable();

        const presenterEl = fixture.debugElement.query(By.directive(MockWorkspacePresenterComponent));

        expect(presenterEl.componentInstance.workspaceSettings).toEqual(mockWorkspaceSettings);
    });

    it('should update presenter when store emits new value', async () => {
        await fixture.whenStable();

        const updatedSettings: WorkspaceSettingsState = {
            gridSettings: {
                gridSpacing: 10,
                gridMode: "lines"
            }
        };

        mockSelectWorkspaceSettings.setResult(updatedSettings);
        store.refreshState();
        fixture.detectChanges();
        await fixture.whenStable();

        const presenterEl = fixture.debugElement.query(
            By.directive(MockWorkspacePresenterComponent)
        );

        expect(presenterEl.componentInstance.workspaceSettings).toEqual(updatedSettings);
    });

    it('should not pass null or undefined settings to the presenter', () => {
        store.overrideSelector(selectWorkspaceSettings, null as unknown as WorkspaceSettingsState);
        store.refreshState();

        const presenterEl = fixture.debugElement.query(
            By.directive(MockWorkspacePresenterComponent)
        );

        expect(presenterEl.componentInstance.workspaceSettings).toEqual(initialState.workspaceSettings!);
    });
});