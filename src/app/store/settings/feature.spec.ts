import { describe, expect, it } from 'vitest';
import * as actions from './actions';
import { DEFAULT_ZOOM_SETTINGS, initialSettingsState, settingsReducer } from './feature';

describe('settingsReducer', () => {
    describe('zoom settings', () => {
        it('should start at the default zoom settings', () => {
            expect(initialSettingsState.workspaceSettings.zoomSettings).toEqual(DEFAULT_ZOOM_SETTINGS);
            expect(initialSettingsState.workspaceSettings.zoomSettings).not.toBe(DEFAULT_ZOOM_SETTINGS);
        });

        it('should change only the zoom settings it is given', () => {
            const state = settingsReducer(initialSettingsState, actions.updateZoomScrollRate({ scrollRate: 0.004 }));

            expect(state.workspaceSettings.zoomSettings).toEqual({ ...DEFAULT_ZOOM_SETTINGS, scrollRate: 0.004 });
        });

        it('should add up changes, one setting at a time', () => {
            let state = settingsReducer(initialSettingsState, actions.updateMinZoom({ minZoom: 0.5 }));
            state = settingsReducer(state, actions.updateMaxZoom({ maxZoom: 3 }));

            expect(state.workspaceSettings.zoomSettings).toEqual({ ...DEFAULT_ZOOM_SETTINGS, minZoom: 0.5, maxZoom: 3 });
        });

        it('should invert scrolling and keep the other zoom settings', () => {
            const sped = settingsReducer(initialSettingsState, actions.updateZoomScrollRate({ scrollRate: 0.004 }));

            const state = settingsReducer(sped, actions.setZoomScrollInversion({ invertScroll: true }));

            expect(state.workspaceSettings.zoomSettings).toEqual({ ...DEFAULT_ZOOM_SETTINGS, scrollRate: 0.004, invertScroll: true });
        });

        it('should leave the grid settings and the rest of the state alone', () => {
            const state = settingsReducer(initialSettingsState, actions.updateZoomPinchRate({ pinchRate: 0.02 }));

            expect(state.workspaceSettings.gridSettings).toBe(initialSettingsState.workspaceSettings.gridSettings);
            expect(state.leftPanelWidth).toBe(initialSettingsState.leftPanelWidth);
        });

        it('should not change the state it was given', () => {
            const before = structuredClone(initialSettingsState);

            settingsReducer(initialSettingsState, actions.updateZoomPinchRate({ pinchRate: 0.03 }));

            expect(initialSettingsState).toEqual(before);
        });

        it('should keep the zoom settings when the grid settings change', () => {
            const zoomed = settingsReducer(initialSettingsState, actions.updateZoomScrollRate({ scrollRate: 0.004 }));

            const state = settingsReducer(zoomed, actions.updateGridSpacing({ spacing: 30 }));

            expect(state.workspaceSettings.zoomSettings.scrollRate).toBe(0.004);
        });
    });
});
