import { vi, beforeEach, afterEach } from 'vitest';

export interface MockResizeObserverInstance {
    callback: ResizeObserverCallback;
    observe: ReturnType<typeof vi.fn>;
    unobserve: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
}

export const resizeObserverInstances: MockResizeObserverInstance[] = [];

export function buildMockCanvasContext() {
    return {
        scale: vi.fn(),
        clearRect: vi.fn(),
        drawImage: vi.fn(),
        beginPath: vi.fn(),
        stroke: vi.fn(),
        fillRect: vi.fn(),
        strokeRect: vi.fn(),
        strokeStyle: '',
        fillStyle: '',
        lineWidth: 0,
    } as unknown as CanvasRenderingContext2D;
}

export function buildMockAnimation() {
    const animation: Partial<Animation> & { onfinish: ((ev: Event) => void) | null } = {
        onfinish: null,
        oncancel: null,
        cancel: vi.fn(),
        finish: vi.fn(function (this: typeof animation) {
            this.onfinish?.(new Event('finish'));
        }),
        play: vi.fn(),
        pause: vi.fn(),
    };
    return animation as unknown as Animation;
}

let animateMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
    vi.stubGlobal(
        'OffscreenCanvas',
        vi.fn().mockImplementation((width: number, height: number) => ({
            width,
            height,
            getContext: vi.fn(() => buildMockCanvasContext()),
            transferToImageBitmap: vi.fn(() => ({ close: vi.fn() })),
        }))
    );
    resizeObserverInstances.length = 0;

    vi.stubGlobal(
        'ResizeObserver',
        vi.fn().mockImplementation((callback: ResizeObserverCallback) => {
            const instance: MockResizeObserverInstance = {
                callback,
                observe: vi.fn(),
                unobserve: vi.fn(),
                disconnect: vi.fn(),
            };
            resizeObserverInstances.push(instance);
            return instance;
        })
    );

    animateMock = vi.fn().mockImplementation(() => buildMockAnimation());
    Element.prototype.animate = animateMock as unknown as typeof Element.prototype.animate;

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
        () => buildMockCanvasContext()
    );

    vi.spyOn(Element.prototype, 'animate').mockImplementation(() => buildMockAnimation());
});

afterEach(() => {
    // @ts-expect-error - intentionally clearing a property jsdom may not define
    delete Element.prototype.animate;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});