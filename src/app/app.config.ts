import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { providePrimeNG } from 'primeng/config';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideStoreDevtools } from '@ngrx/store-devtools';

import Aura from '@primeng/themes/aura';

import { routes } from './app.routes';
import { provideState, provideStore } from '@ngrx/store';
import { settingsFeature } from './store/settings/feature';
import { workspaceFeature } from './store/workspace/feature';
import { componentsFeature } from './store/components/components.feature';

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
        provideStore(),
        provideState(settingsFeature),
        provideState(workspaceFeature),
        provideState(componentsFeature),
        provideStoreDevtools({
            maxAge: 25,
            autoPause: true
        })
    ]
};
