import type { ApplicationConfig} from '@angular/core';
import { provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { providePrimeNG } from 'primeng/config';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideStoreDevtools } from '@ngrx/store-devtools';

import Aura from '@primeuix/themes/aura';

import { routes } from './app.routes';
import { provideState, provideStore } from '@ngrx/store';
import { settingsFeature } from './store/settings/feature';
import { workspaceFeature } from './store/workspace/feature';
import { componentsFeature } from './store/components/feature';

export const appConfig: ApplicationConfig = {
    providers: [
        provideAnimationsAsync(),
        providePrimeNG({
            theme: {
                preset: Aura
            }
        }),
        provideZoneChangeDetection({ eventCoalescing: true }),
        provideRouter(routes),
        // selectedSelectable holds a live component instance that the workspace moves with the mouse while it's a
        // ghost. NgRx's dev-mode immutability checks deep-freeze state and actions, which would make that throw.
        provideStore({}, {
            runtimeChecks: {
                strictStateImmutability: false,
                strictActionImmutability: false
            }
        }),
        provideState(settingsFeature),
        provideState(workspaceFeature),
        provideState(componentsFeature),
        provideStoreDevtools({
            maxAge: 25,
            autoPause: true
        })
    ]
};
