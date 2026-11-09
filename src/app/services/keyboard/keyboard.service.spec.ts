import type { DestroyRef } from '@angular/core';
import { NgZone } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isEditableTarget, KeyboardService, matchesKeyCombo, parseKeyCombo } from './keyboard.service';

const keyEvent = (key: string, init: KeyboardEventInit = {}) =>
    new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });

/** Dispatches a key press on the target and returns the event so its defaultPrevented can be checked. */
const press = (key: string, init: KeyboardEventInit = {}, target: EventTarget = document.body) => {
    const event = keyEvent(key, init);
    target.dispatchEvent(event);
    return event;
};

describe('parseKeyCombo', () => {
    it('should parse a plain key', () => {
        expect(parseKeyCombo('Escape')).toEqual({ key: 'escape', ctrl: false, shift: false, alt: false, meta: false, mod: false });
    });

    it('should ignore case and spaces', () => {
        expect(parseKeyCombo(' Ctrl + Shift + Z ')).toMatchObject({ key: 'z', ctrl: true, shift: true });
    });

    it('should parse modifiers and their aliases', () => {
        expect(parseKeyCombo('control+a')).toMatchObject({ ctrl: true });
        expect(parseKeyCombo('option+a')).toMatchObject({ alt: true });
        expect(parseKeyCombo('cmd+a')).toMatchObject({ meta: true });
        expect(parseKeyCombo('command+a')).toMatchObject({ meta: true });
        expect(parseKeyCombo('mod+a')).toMatchObject({ mod: true });
    });

    it('should parse key aliases', () => {
        expect(parseKeyCombo('esc').key).toBe('escape');
        expect(parseKeyCombo('space').key).toBe(' ');
        expect(parseKeyCombo('ctrl+plus').key).toBe('+');
        expect(parseKeyCombo('del').key).toBe('delete');
        expect(parseKeyCombo('left').key).toBe('arrowleft');
    });

    it.each(['', '   ', 'ctrl', 'ctrl+', 'a+b', '+'])('should throw for the invalid combination "%s"', (combo) => {
        expect(() => parseKeyCombo(combo)).toThrow('Invalid key combination');
    });
});

describe('matchesKeyCombo', () => {
    it('should match the key regardless of case', () => {
        expect(matchesKeyCombo(parseKeyCombo('z'), keyEvent('Z'))).toBe(true);
        expect(matchesKeyCombo(parseKeyCombo('escape'), keyEvent('Escape'))).toBe(true);
        expect(matchesKeyCombo(parseKeyCombo('escape'), keyEvent('Enter'))).toBe(false);
    });

    it('should require modifiers to match exactly', () => {
        expect(matchesKeyCombo(parseKeyCombo('z'), keyEvent('z', { ctrlKey: true }))).toBe(false);
        expect(matchesKeyCombo(parseKeyCombo('escape'), keyEvent('Escape', { shiftKey: true }))).toBe(false);
        expect(matchesKeyCombo(parseKeyCombo('ctrl+z'), keyEvent('z'))).toBe(false);
        expect(matchesKeyCombo(parseKeyCombo('ctrl+z'), keyEvent('z', { ctrlKey: true }))).toBe(true);
        expect(matchesKeyCombo(parseKeyCombo('ctrl+z'), keyEvent('z', { ctrlKey: true, shiftKey: true }))).toBe(false);
        expect(matchesKeyCombo(parseKeyCombo('ctrl+shift+z'), keyEvent('Z', { ctrlKey: true, shiftKey: true }))).toBe(true);
        expect(matchesKeyCombo(parseKeyCombo('alt+a'), keyEvent('a', { altKey: true }))).toBe(true);
        expect(matchesKeyCombo(parseKeyCombo('cmd+a'), keyEvent('a', { metaKey: true }))).toBe(true);
    });

    it('should accept either ctrl or cmd for mod, but not neither', () => {
        const mod = parseKeyCombo('mod+z');
        expect(matchesKeyCombo(mod, keyEvent('z', { ctrlKey: true }))).toBe(true);
        expect(matchesKeyCombo(mod, keyEvent('z', { metaKey: true }))).toBe(true);
        expect(matchesKeyCombo(mod, keyEvent('z'))).toBe(false);
        expect(matchesKeyCombo(mod, keyEvent('z', { ctrlKey: true, shiftKey: true }))).toBe(false);
    });
});

describe('isEditableTarget', () => {
    it.each(['input', 'textarea', 'select'])('should be true for a %s', (tag) => {
        expect(isEditableTarget(document.createElement(tag))).toBe(true);
    });

    it('should be true for a content-editable element', () => {
        const el = document.createElement('div');
        Object.defineProperty(el, 'isContentEditable', { value: true });
        expect(isEditableTarget(el)).toBe(true);
    });

    it.each(['text', 'search', 'email', 'number', 'password', 'url', 'tel'])('should be true for a %s input', (type) => {
        const input = document.createElement('input');
        input.type = type;
        expect(isEditableTarget(input)).toBe(true);
    });

    it.each(['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'color', 'file'])('should be false for a %s input, which takes no typed text', (type) => {
        const input = document.createElement('input');
        input.type = type;
        expect(isEditableTarget(input)).toBe(false);
    });

    it('should be false for other elements and non-elements', () => {
        expect(isEditableTarget(document.createElement('div'))).toBe(false);
        expect(isEditableTarget(document.createElement('canvas'))).toBe(false);
        expect(isEditableTarget(window)).toBe(false);
        expect(isEditableTarget(null)).toBe(false);
    });
});

describe('KeyboardService', () => {
    let service: KeyboardService;
    let removers: (() => void)[];

    /** Registers a handler and removes it after the test. */
    const on = (...args: Parameters<KeyboardService['on']>) => {
        const remove = service.on(...args);
        removers.push(remove);
        return remove;
    };

    beforeEach(() => {
        service = TestBed.inject(KeyboardService);
        removers = [];
    });

    afterEach(() => removers.forEach(remove => remove()));

    describe('handling', () => {
        it('should call the handler for its key, with the event', () => {
            const handler = vi.fn();
            on('Escape', handler);

            const event = press('Escape');

            expect(handler).toHaveBeenCalledOnce();
            expect(handler).toHaveBeenCalledWith(event);
        });

        it('should not call the handler for other keys', () => {
            const handler = vi.fn();
            on('Escape', handler);

            press('Enter');
            press('a');

            expect(handler).not.toHaveBeenCalled();
        });

        it('should match combinations', () => {
            const handler = vi.fn();
            on('mod+z', handler);

            press('z');
            press('z', { ctrlKey: true });
            press('z', { metaKey: true });
            press('z', { ctrlKey: true, shiftKey: true });

            expect(handler).toHaveBeenCalledTimes(2);
        });

        it('should receive keys pressed anywhere in the page', () => {
            const handler = vi.fn();
            on('Escape', handler);
            const button = document.createElement('button');
            document.body.append(button);

            press('Escape', {}, button);
            press('Escape', {}, window);

            expect(handler).toHaveBeenCalledTimes(2);
            button.remove();
        });

        it('should throw for an invalid combination', () => {
            expect(() => service.on('ctrl+', vi.fn())).toThrow('Invalid key combination');
        });
    });

    describe('using a key', () => {
        it('should stop at the first handler that returns true, and prevent the browser default', () => {
            const first = vi.fn(() => true);
            const second = vi.fn();
            on('Escape', second);
            on('Escape', first); // registered last, so it goes first

            const event = press('Escape');

            expect(first).toHaveBeenCalledOnce();
            expect(second).not.toHaveBeenCalled();
            expect(event.defaultPrevented).toBe(true);
        });

        it.each([[undefined], [false], [1 as unknown as boolean]])('should pass the key on when a handler returns %s', (result) => {
            const lower = vi.fn();
            const upper = vi.fn(() => result);
            on('Escape', lower);
            on('Escape', upper);

            const event = press('Escape');

            expect(upper).toHaveBeenCalledOnce();
            expect(lower).toHaveBeenCalledOnce();
            expect(event.defaultPrevented).toBe(false);
        });

        it('should not prevent the browser default when no handler used the key', () => {
            on('Escape', vi.fn());
            expect(press('Escape').defaultPrevented).toBe(false);
        });
    });

    describe('order', () => {
        it('should try the latest registered handler first', () => {
            const calls: string[] = [];
            on('Escape', () => { calls.push('first'); });
            on('Escape', () => { calls.push('second'); });
            on('Escape', () => { calls.push('third'); });

            press('Escape');

            expect(calls).toEqual(['third', 'second', 'first']);
        });

        it('should try a higher priority first, whatever the registration order', () => {
            const calls: string[] = [];
            on('Escape', () => { calls.push('important'); }, { priority: 10 });
            on('Escape', () => { calls.push('normal'); });
            on('Escape', () => { calls.push('low'); }, { priority: -5 });

            press('Escape');

            expect(calls).toEqual(['important', 'normal', 'low']);
        });

        it('should go latest first among equal priorities within a higher priority', () => {
            const calls: string[] = [];
            on('Escape', () => { calls.push('a'); }, { priority: 1 });
            on('Escape', () => { calls.push('b'); }, { priority: 1 });

            press('Escape');

            expect(calls).toEqual(['b', 'a']);
        });
    });

    describe('enabled', () => {
        it('should skip a handler while enabled returns false and pass the key on', () => {
            const lower = vi.fn();
            const upper = vi.fn(() => true);
            on('Escape', lower);
            on('Escape', upper, { enabled: () => false });

            press('Escape');

            expect(upper).not.toHaveBeenCalled();
            expect(lower).toHaveBeenCalledOnce();
        });

        it('should check enabled on every key press', () => {
            let enabled = false;
            const handler = vi.fn();
            on('Escape', handler, { enabled: () => enabled });

            press('Escape');
            enabled = true;
            press('Escape');

            expect(handler).toHaveBeenCalledOnce();
        });

        it('should not call enabled for keys that do not match', () => {
            const enabled = vi.fn(() => true);
            on('Escape', vi.fn(), { enabled });

            press('a');

            expect(enabled).not.toHaveBeenCalled();
        });
    });

    describe('typing, repeat and composition', () => {
        it.each(['input', 'textarea', 'select'])('should ignore a key pressed in a %s', (tag) => {
            const handler = vi.fn();
            on('Escape', handler);
            const field = document.createElement(tag);
            document.body.append(field);

            press('Escape', {}, field);

            expect(handler).not.toHaveBeenCalled();
            field.remove();
        });

        it('should handle a key pressed on a checkbox, such as a palette item that still has focus after it was clicked', () => {
            const handler = vi.fn();
            on('Escape', handler);
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            document.body.append(checkbox);

            press('Escape', {}, checkbox);

            expect(handler).toHaveBeenCalledOnce();
            checkbox.remove();
        });

        it('should handle a key pressed in a field when allowInEditable is set', () => {
            const handler = vi.fn();
            on('Escape', handler, { allowInEditable: true });
            const field = document.createElement('input');
            document.body.append(field);

            press('Escape', {}, field);

            expect(handler).toHaveBeenCalledOnce();
            field.remove();
        });

        it('should ignore auto-repeat unless allowRepeat is set', () => {
            const once = vi.fn();
            const repeating = vi.fn();
            on('a', once);
            on('b', repeating, { allowRepeat: true });

            press('a', { repeat: true });
            press('b', { repeat: true });

            expect(once).not.toHaveBeenCalled();
            expect(repeating).toHaveBeenCalledOnce();
        });

        it('should ignore keys pressed while composing text', () => {
            const handler = vi.fn();
            on('Escape', handler);

            press('Escape', { isComposing: true });

            expect(handler).not.toHaveBeenCalled();
        });

        it('should ignore a key something else already handled', () => {
            const handler = vi.fn();
            on('Escape', handler);
            const dialog = (e: Event) => e.preventDefault(); // consumes the key before it bubbles up
            window.addEventListener('keydown', dialog, true);

            press('Escape');

            expect(handler).not.toHaveBeenCalled();
            window.removeEventListener('keydown', dialog, true);
        });
    });

    describe('removing handlers', () => {
        it('should stop calling a handler once it is removed', () => {
            const handler = vi.fn();
            const remove = on('Escape', handler);

            remove();
            press('Escape');

            expect(handler).not.toHaveBeenCalled();
        });

        it('should leave other handlers alone', () => {
            const kept = vi.fn();
            const removed = vi.fn();
            on('Escape', kept);
            on('Escape', removed)();

            press('Escape');

            expect(kept).toHaveBeenCalledOnce();
            expect(removed).not.toHaveBeenCalled();
        });

        it('should make removing twice harmless', () => {
            const kept = vi.fn();
            on('Escape', kept);
            const remove = on('Escape', vi.fn());

            remove();
            remove();
            press('Escape');

            expect(kept).toHaveBeenCalledOnce();
        });

        it('should let a handler remove itself without skipping the others', () => {
            const calls: string[] = [];
            on('Escape', () => { calls.push('lower'); });
            const remove = on('Escape', () => { calls.push('self-removing'); remove(); });
            on('Escape', () => { calls.push('upper'); });

            press('Escape');
            press('Escape');

            expect(calls).toEqual(['upper', 'self-removing', 'lower', 'upper', 'lower']);
        });

        it('should remove the handler when the given DestroyRef is destroyed', () => {
            let destroy = () => { /* set below */ };
            const destroyRef = { onDestroy: (callback: () => void) => { destroy = callback; return () => { /* unused */ }; } } as DestroyRef;
            const handler = vi.fn();
            on('Escape', handler, { destroyRef });

            press('Escape');
            destroy();
            press('Escape');

            expect(handler).toHaveBeenCalledOnce();
        });
    });

    describe('window listener', () => {
        const keydownCalls = (spy: { mock: { calls: unknown[][] } }) => spy.mock.calls.filter(([type]) => type === 'keydown');

        it('should not listen until a handler is registered', () => {
            const add = vi.spyOn(window, 'addEventListener');
            TestBed.inject(KeyboardService);
            expect(keydownCalls(add)).toHaveLength(0);
            add.mockRestore();
        });

        it('should add one listener however many handlers there are', () => {
            const add = vi.spyOn(window, 'addEventListener');

            on('a', vi.fn());
            on('b', vi.fn());
            on('c', vi.fn());

            expect(keydownCalls(add)).toHaveLength(1);
            add.mockRestore();
        });

        it('should remove the listener when the last handler is removed', () => {
            const remove = vi.spyOn(window, 'removeEventListener');
            const first = service.on('a', vi.fn());
            const second = service.on('b', vi.fn());

            first();
            expect(keydownCalls(remove)).toHaveLength(0);
            second();
            expect(keydownCalls(remove)).toHaveLength(1);
            remove.mockRestore();
        });

        it('should listen again after everything was removed', () => {
            const handler = vi.fn();
            service.on('Escape', vi.fn())();

            on('Escape', handler);
            press('Escape');

            expect(handler).toHaveBeenCalledOnce();
        });

        it('should add the listener outside the Angular zone', () => {
            const runOutside = vi.spyOn(TestBed.inject(NgZone), 'runOutsideAngular');

            on('Escape', vi.fn());

            expect(runOutside).toHaveBeenCalled();
        });

        it('should run handlers inside the Angular zone', () => {
            let inZone: boolean | undefined;
            on('Escape', () => { inZone = NgZone.isInAngularZone(); });

            press('Escape');

            expect(inZone).toBe(true);
        });
    });
});