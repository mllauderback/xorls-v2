# Xorls-v2

<img width="1490" height="799" alt="image" src="https://github.com/user-attachments/assets/2dd47af0-ffb5-41d7-9676-01174d1a7024" />

## Introduction
This is the first product in a small suite of products designed to make designing and testing digital logic schematics easier and more accessible.  Most current web-based digital logic schematic design tools are woefully underfeatured and awkward to use, making them impractical for complex designs.  There are number of good digital logic simulators available as native applications, but these either cost significant money like Quartus, or, while well-featured, look outdated and can be awkward to use like Logisim and Logisim-evolution.  While Logisim is a good application, one thing it lacks is cloud support and a web-based application for managing projects on the go.  That is where Xorls-v2 comes in.  This Angular-based application is a robust web app allowing users to design and simulate schematis in a browser and save designs to the cloud, giving them the ability to access and edit projects from anywhere over the internet.

## Development server

To start a local development server, run:
```bash
npm run start
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`.

## Code scaffolding

Xorls-v2 uses the default Angular CLI.  Components should be added under the `app/components` folder and should follow a presenter-container pattern for integration with NgRX.

Any interfaces/classes used in business logic are stored in `app/models` under and appropriate categorized subdirectory if necessary.

Services should be added to the `app/services` folder.

New NgRX store additions should be added to an appropriate categorized directory in `app/store`.  Each category contains its own store and feature under `state.ts`.

Xorls-v2 uses tailwindcss to organize element styling.  Custom styles can be added in a separate SCSS file scoped as locally as possible.  Tailwind classes are highly preferred to custom SCSS, but use of custom SCSS is largely up to discression.

## Building

To build the project run:

```bash
npm run build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Testing (Coming soon)
All components and services should have their own separate files for unit tests.
Each store should have its own separate files for unit testing mock selectors and reducers, and a file for integration tests.
End-to-end tests should be added to an appropriate categorized directory in `app/e2e`.  For component e2e tests, that directory should be the name of the component.

### Running unit tests

Unit tests are run using [Vitest](https://vitest.dev/).  For now, vitest is restricted to using only jsdom.  To run unit tests, use the following command:

```bash
npm run test
```

### Running end-to-end tests

End-to-end tests are written using playwright.  To install configured browsers, run `npx playwright install`.  To run e2e tests, use the following command:

```bash
npm run e2e
```
