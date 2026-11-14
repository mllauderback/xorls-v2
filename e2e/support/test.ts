import type { Locator } from '@playwright/test';
import { test as base } from '@playwright/test';

export interface AnimationOptions {
    /**
     * Whether the app animates while a test runs. Off by default, so that tests don't have to wait for an
     * animation to end, or race one. Turn it on for the tests that are about an animation:
     *
     *     test.describe('animations', () => {
     *         test.use({ animations: true });
     *         ...
     *     });
     *
     * It applies to a whole file or describe block, not to a single test.
     */
    animations: boolean;
}

/**
 * Playwright's test, with the app's animations turned off unless a test asks for them. Import `test` from here
 * instead of from @playwright/test.
 *
 * The app animates in three ways, and each is turned off its own way, before the page loads:
 * - Angular animations (PrimeNG's accordion and fieldset): the app provides no-op animations when it finds the
 *   __e2eNoAnimations flag on the window. See app.config.ts.
 * - CSS transitions and animations (the tab strip's drag and drop): a stylesheet gives them no duration.
 * - The Web Animations API (closing a tab): Element.animate is given no duration, so it finishes at once and
 *   still fires its finish event.
 */
export const test = base.extend<AnimationOptions & { applyAnimationOption: void }>({
    animations: [false, { option: true }],

    applyAnimationOption: [async ({ page, animations }, use) => {
        if (!animations) {
            await page.addInitScript(() => {
                (window as Window & { __e2eNoAnimations?: boolean }).__e2eNoAnimations = true;

                const style = document.createElement('style');
                style.dataset['e2e'] = 'no-animations';
                style.textContent = `*, *::before, *::after {
                    transition-duration: 0s !important;
                    transition-delay: 0s !important;
                    animation-duration: 0s !important;
                    animation-delay: 0s !important;
                }`;
                // the script runs before the page's own markup is parsed
                const add = () => document.head.append(style);
                if (document.head) add();
                else document.addEventListener('DOMContentLoaded', add, { once: true });

                const animate = Element.prototype.animate;
                Element.prototype.animate = function (keyframes, options) {
                    const instant = typeof options === 'object' ? { ...options, duration: 0, delay: 0 } : 0;
                    return animate.call(this, keyframes, instant);
                };
            });
        }
        await use();
    }, { auto: true }],
});

/** An animation that started in a watched element. */
export interface StartedAnimation {
    /**
     * How it was animated: by Angular's animations (PrimeNG's accordion and fieldset), a CSS transition, or a CSS
     * @keyframes animation.
     */
    kind: 'angular' | 'transition' | 'keyframes';
    /** The element that was animated, as its tag and classes: div.draggable-tab-header.active */
    target: string;
    /** The CSS property a transition changes, or the name of the @keyframes of a keyframes animation. */
    name?: string;
}

/**
 * Starts watching an element, and everything in it, for Angular and CSS animations. An animation can be over within
 * a few frames, too fast to catch by looking afterwards, so this records each one as it starts:
 * - Angular animations by the ng-animating class Angular puts on an element for as long as it animates it,
 * - CSS transitions and @keyframes animations by the events the browser fires when one starts.
 *
 * It doesn't see animations made with Element.animate(), which fire no event. Read those with getAnimations().
 *
 * An animation starts a frame or two after what causes it, so poll the result:
 *
 *     const animations = await watchAnimations(panel);
 *     await header.click();
 *     await expect.poll(async () => (await animations()).map(a => a.kind)).toContain('angular');
 *
 * @returns A function that gives the animations that started in the element since the watch began, in order
 */
export async function watchAnimations(element: Locator): Promise<() => Promise<StartedAnimation[]>> {
    type Watched = HTMLElement & { __e2eAnimations?: StartedAnimation[] };
    await element.evaluate((root: Watched) => {
        const started: StartedAnimation[] = [];
        root.__e2eAnimations = started;
        const describe = (target: Element) => [target.tagName.toLowerCase(), ...target.classList].join('.');

        // Angular: ng-animating is added when an animation starts, and removed when it ends
        const animating = new WeakSet<Element>();
        new MutationObserver(records => {
            for (const { target } of records) {
                if (!(target instanceof Element)) continue;
                const now = target.classList.contains('ng-animating');
                if (now && !animating.has(target)) started.push({ kind: 'angular', target: describe(target) });
                if (now) animating.add(target);
                else animating.delete(target);
            }
        }).observe(root, { attributes: true, attributeFilter: ['class'], subtree: true });

        // CSS: both events bubble up to the watched element
        root.addEventListener('transitionrun', (event: TransitionEvent) => {
            if (event.target instanceof Element) {
                started.push({ kind: 'transition', target: describe(event.target), name: event.propertyName });
            }
        });
        root.addEventListener('animationstart', (event: AnimationEvent) => {
            if (event.target instanceof Element) {
                started.push({ kind: 'keyframes', target: describe(event.target), name: event.animationName });
            }
        });
    });
    return () => element.evaluate((root: Watched) => [...(root.__e2eAnimations ?? [])]);
}
