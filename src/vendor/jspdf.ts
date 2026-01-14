// Local shim for `jspdf`.
// This is intentionally CDN-backed to keep install footprint small.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dynamicImport = (url: string): Promise<any> => (Function('u', 'return import(u)') as any)(url);

const JSPDF_ESM_URL = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.2/+esm';

// Top-level await is supported (build target is esnext).
const mod: any = await dynamicImport(JSPDF_ESM_URL);

// jsPDF is usually either `mod.jsPDF` or default.
const _jsPDF = mod?.jsPDF ?? mod?.default ?? mod;

export const jsPDF = _jsPDF as any;
export default _jsPDF as any;
