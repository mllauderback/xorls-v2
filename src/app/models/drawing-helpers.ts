export type ArcArgs = Parameters<OffscreenCanvasRenderingContext2D['arc']>

export function arcFromEndPoints(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    radius: number,
    counterclockwise = false): ArcArgs | null {

    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (radius < dist / 2) {
        console.error("Radius too small for the given points.");
        return null;
    }

    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    const h = Math.sqrt(radius * radius - (dist / 2) * (dist / 2));

    const cx = midX + h * (y1 - y2) / dist;
    const cy = midY + h * (x2 - x1) / dist;

    const startAngle = Math.atan2(y1 - cy, x1 - cx);
    const endAngle = Math.atan2(y2 - cy, x2 - cx);

    return [cx, cy, radius, startAngle, endAngle, counterclockwise];
}