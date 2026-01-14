// Local shim for `fabric`.
// Loads from CDN at runtime to keep install footprint small.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dynamicImport = (url: string): Promise<any> => (Function('u', 'return import(u)') as any)(url);

const FABRIC_ESM_URL = 'https://cdn.jsdelivr.net/npm/fabric@6.0.2/+esm';

const mod: any = await dynamicImport(FABRIC_ESM_URL);

// Re-export common fabric classes
export const Canvas = mod?.Canvas || mod?.fabric?.Canvas;
export const Rect = mod?.Rect || mod?.fabric?.Rect;
export const Circle = mod?.Circle || mod?.fabric?.Circle;
export const Triangle = mod?.Triangle || mod?.fabric?.Triangle;
export const Polygon = mod?.Polygon || mod?.fabric?.Polygon;
export const Line = mod?.Line || mod?.fabric?.Line;
export const Text = mod?.Text || mod?.fabric?.Text;
export const FabricObject = mod?.FabricObject || mod?.fabric?.Object || mod?.Object;

// For convenience
export const fabric = mod?.fabric || mod;

export default mod;

