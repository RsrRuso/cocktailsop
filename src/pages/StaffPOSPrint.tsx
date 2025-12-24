import { useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  KOTPreview,
  generateBarKOT,
  generateClosingCheck,
  generateCombinedKOT,
  generateKitchenKOT,
  generatePreCheck,
  type OrderData,
} from "@/components/lab-ops/print";

type PrintType = "kitchen" | "bar" | "combined" | "precheck" | "closing";

const JOB_PREFIX = "pos_print_job:";

function setMetaTag(name: string, content: string) {
  let meta = document.querySelector(`meta[name='${name}']`) as HTMLMetaElement | null;
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", name);
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", content);
}

function setCanonical(url: string) {
  let link = document.querySelector("link[rel='canonical']") as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }
  link.setAttribute("href", url);
}

export default function StaffPOSPrint() {
  const location = useLocation();
  const navigate = useNavigate();

  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const jobId = params.get("job") || "";

  const job = useMemo(() => {
    if (!jobId) return null;
    try {
      const raw = sessionStorage.getItem(`${JOB_PREFIX}${jobId}`);
      return raw ? (JSON.parse(raw) as { order: OrderData; type: PrintType; createdAt: number }) : null;
    } catch {
      return null;
    }
  }, [jobId]);

  const order = job?.order ?? null;
  const type: PrintType = job?.type ?? "precheck";

  const plainLines = useMemo(() => {
    if (!order) return [] as string[];
    switch (type) {
      case "kitchen":
        return generateKitchenKOT(order);
      case "bar":
        return generateBarKOT(order);
      case "combined":
        return generateCombinedKOT(order);
      case "closing":
        return generateClosingCheck(order);
      case "precheck":
      default:
        return generatePreCheck(order);
    }
  }, [order, type]);

  useEffect(() => {
    const keyword = type === "closing" ? "closing check" : type === "precheck" ? "pre-check" : "receipt";
    document.title = `Print ${keyword} | Staff POS`;
    setMetaTag("description", `Print ${keyword} in Micros-style format from Staff POS.`);
    setMetaTag("robots", "noindex, nofollow");
    setCanonical(`${window.location.origin}${window.location.pathname}`);

    // Auto-trigger print after mount (reliable, no popups).
    const t = window.setTimeout(() => {
      // Only auto-print if we have content
      if (order && plainLines.length > 0) window.print();
    }, 400);

    return () => window.clearTimeout(t);
  }, [order, plainLines.length, type]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-base font-semibold">Print {type === "closing" ? "Closing Check" : type === "precheck" ? "Pre-Check" : "Ticket"}</h1>
            <p className="text-xs text-muted-foreground">Micros-style thermal format • 80mm</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate(-1)}>
              Back
            </Button>
            <Button onClick={() => window.print()} disabled={!order || plainLines.length === 0}>
              Print
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section aria-label="Receipt preview" className="space-y-2">
          <h2 className="text-sm font-medium">Preview</h2>
          <div className="border rounded-lg bg-muted/20 p-4">
            {order ? (
              <KOTPreview order={order} type={type} />
            ) : (
              <p className="text-sm text-muted-foreground">No print job found. Please go back and try again.</p>
            )}
          </div>
        </section>

        <aside aria-label="Micros plain text" className="space-y-2">
          <h2 className="text-sm font-medium">Micros text</h2>
          <ScrollArea className="h-[70vh] border rounded-lg bg-background">
            <pre className="p-4 font-mono text-xs leading-5 whitespace-pre-wrap">
              {plainLines.length ? plainLines.join("\n") : "No content"}
            </pre>
          </ScrollArea>
        </aside>
      </main>
    </div>
  );
}
