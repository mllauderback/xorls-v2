export const NON_TEXT_INPUT_TYPES = new Set(['checkbox', 'radio', 'button', 'submit', 'reset', 'image', 'range', 'color', 'file']);

/**
 * Returns true if the target of an event is somewhere text is typed or pasted: a text input, a textarea, a select, or
 * anything inside a content-editable element.
 */
export function isEditableTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    if (target.isContentEditable) return true;
    if (target instanceof HTMLInputElement) return !NON_TEXT_INPUT_TYPES.has(target.type);
    return ['TEXTAREA', 'SELECT'].includes(target.tagName);
}