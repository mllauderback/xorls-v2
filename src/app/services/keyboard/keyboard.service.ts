import type { DestroyRef } from "@angular/core";
import { inject, Injectable, NgZone } from "@angular/core";

/**
 * Handler for a key press.  Returns true to process the key, otherwise leave the key for the next handler
 */
export type KeyHandler = (event: KeyboardEvent) => boolean | void;

export interface KeyBindingOptions {
    /**
     * Checked on every key press.  If false, the handler skips and the key is parsed by the next handler.
     * Conditional enabling allows handlers to be turned on/off.
     */
    enabled?: () => boolean;
    /**
     * Handler runs while user types in a content-editable field.
     * Defaults to false. 
     */
    allowInEditable?: boolean;
    /**
     * Handler runs for a held key (auto-repeat) if true.  Defaults to false.
     */
    allowRepeat?: boolean;
    /**
     * Higher priority handlers get a chance to process a key earlier.
     * Equal priorities run whichever handler was most recently enabled.
     */
    priority?: number;
    /**
     * Removes handler when destroyed.
     */
    destroyRef?: DestroyRef;
}
export interface KeyCombo {
    key: string;
    ctrl: boolean;
    shift: boolean;
    alt: boolean;
    meta: boolean;
    mod: boolean; // Ctrl or Cmd
}

const MODIFIERS: Record<string, keyof Omit<KeyCombo, 'key'>> = {
    ctrl: 'ctrl', control: 'ctrl',
    shift: 'shift',
    alt: 'alt', option: 'alt',
    meta: 'meta', cmd: 'meta', command: 'meta',
    mod: 'mod'
};

const KEY_ALIASES: Record<string, string> = {
    esc: 'escape',
    space: ' ',
    plus: '+',
    del: 'delete',
    up: 'arrowup', down: 'arrowdown', left: 'arrowleft', right: 'arrowright'
};

/**
 * Parses a key combo of one or more keys.  Case doesn't matter.
 * @param combo 
 * @returns 
 * 
 * @throws If there is no key or more than one key.
 */
export function parseKeyCombo(combo: string): KeyCombo {
    const parts = combo.trim().toLowerCase().split('+').map(part => part.trim());
    const parsed: KeyCombo = { key: '', ctrl: false, shift: false, alt: false, meta: false, mod: false };

    for (const part of parts) {
        const modifier = MODIFIERS[part];
        if (modifier) {
            parsed[modifier] = true;
        } else if (part && !parsed.key) {
            parsed.key = KEY_ALIASES[part] ?? part;
        } else {
            throw new Error(`Invalid key combination: ${combo}`);
        }
    }
    if (!parsed.key) throw new Error(`Invalid key combination: "${combo}"`);
    return parsed;
}

/**
 * Returns true if a key combo matches the event
 * @param combo 
 * @param event 
 * @returns 
 */
export function matchesKeyCombo(combo: KeyCombo, event: KeyboardEvent): boolean {
    if (event.key.toLowerCase() !== combo.key) return false;
    const modifierMatches = combo.mod
        ? event.ctrlKey || event.metaKey
        : event.ctrlKey === combo.ctrl && event.metaKey === combo.meta;
    return modifierMatches && event.shiftKey === combo.shift && event.altKey === combo.alt;
}

const NON_TEXT_INPUT_TYPES = new Set(['checkbox', 'radio', 'button', 'submit', 'reset', 'image', 'range', 'color', 'file']);

/**
 * Returns true if the keyboard event target is content-editable.
 * @param target 
 * @returns 
 */
export function isEditableTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    if (target.isContentEditable) return true;
    if (target instanceof HTMLInputElement) return !NON_TEXT_INPUT_TYPES.has(target.type);
    return ['TEXTAREA', 'SELECT'].includes(target.tagName);
}

interface Binding {
    combo: KeyCombo;
    handler: KeyHandler;
    options: KeyBindingOptions;
    order: number;
}

/**
 * Components can register handlers for processing key combos.
 * When a key is pressed, matching handlers are tried in priority order until one
 * returns true.
 * 
 * Key presses are listened by a single window listener which is run outside the angular zone.
 * Handlers run inside the angular zone.
 */
@Injectable({ providedIn: 'root' })
export class KeyboardService {
    private ngZone = inject(NgZone);
    private bindings: Binding[] = [];
    private nextOrder = 0;
    private listening = false;

    private readonly onKeyDown = (event: KeyboardEvent) => this.dispatch(event);

    /**
     * Registers a handler for a key combo.
     * @param combo Follows the KeyCombo format
     * @param handler 
     * @param options 
     * @returns 
     */
    on(combo: string, handler: KeyHandler, options: KeyBindingOptions = {}): () => void {
        const binding: Binding = { combo: parseKeyCombo(combo), handler, options, order: this.nextOrder++ };
        this.bindings = [...this.bindings, binding].sort(
            (a, b) => (b.options.priority ?? 0) - (a.options.priority ?? 0) || b.order - a.order
        );
        this.startListening();

        const remove = () => {
            this.bindings = this.bindings.filter(b => b !== binding);
            if (this.bindings.length === 0) this.stopListening();
        };
        options.destroyRef?.onDestroy(remove);
        return remove;
    }

    private dispatch(event: KeyboardEvent) {
        // for special cases that are default-prevented or if the user is writing text
        if (event.defaultPrevented || event.isComposing) return;

        const typing = isEditableTarget(event.target);

        for (const binding of this.bindings) {
            if (!matchesKeyCombo(binding.combo, event)) continue;
            if (typing && !binding.options.allowInEditable) continue;
            if (event.repeat && !binding.options.allowRepeat) continue;
            if (binding.options.enabled && !binding.options.enabled()) continue;

            const used = this.ngZone.run(() => binding.handler(event));
            if (used === true) {
                event.preventDefault();
                return;
            }
        }
    }

    private startListening() {
        if (this.listening) return;
        this.listening = true;
        this.ngZone.runOutsideAngular(() => window.addEventListener('keydown', this.onKeyDown));
    }

    private stopListening() {
        if (!this.listening) return;
        this.listening = false;
        window.removeEventListener('keydown', this.onKeyDown);
    }
}