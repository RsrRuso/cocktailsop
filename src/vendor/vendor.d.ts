// Minimal TS module declarations for local Vite aliases.
// These keep the editor/typecheck happy even though we load via CDN at runtime.

declare module 'jspdf' {
  const jsPDF: any;
  export const jsPDF: any;
  export default jsPDF;
}

declare module 'jspdf-autotable' {
  const autoTable: any;
  export default autoTable;
}
