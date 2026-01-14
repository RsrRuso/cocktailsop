// Local shim for `xlsx` (SheetJS).
// Loads from CDN at runtime to keep install footprint small.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dynamicImport = (url: string): Promise<any> => (Function('u', 'return import(u)') as any)(url);

const XLSX_ESM_URL = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm';

const mod: any = await dynamicImport(XLSX_ESM_URL);

export const read = mod?.read;
export const utils = mod?.utils;
export const write = mod?.write;
export const writeFile = mod?.writeFile;

export default mod;

