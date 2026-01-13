// Local shim for `jspdf-autotable`.
// Provides BOTH:
// - default export: autoTable(doc, options)
// - side-effect behavior: attaches doc.autoTable(options) for legacy usage

import jsPDF from './jspdf';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dynamicImport = (url: string): Promise<any> => (Function('u', 'return import(u)') as any)(url);

const AUTOTABLE_ESM_URL = 'https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.5/+esm';

const mod: any = await dynamicImport(AUTOTABLE_ESM_URL);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const autoTable: any = mod?.default ?? mod?.autoTable ?? mod;

// Attach for code that uses `(doc as any).autoTable({...})`
try {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const proto: any = (jsPDF as any)?.prototype;
  if (proto && !proto.autoTable) {
    proto.autoTable = function (options: any) {
      return autoTable(this, options);
    };
  }
} catch {
  // ignore
}

export default autoTable;
