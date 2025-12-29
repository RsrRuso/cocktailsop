import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCurrency } from "@/contexts/CurrencyContext";

export function RecipeCostingLivePanel({
  costPerServe,
  menuBasePrice,
}: {
  costPerServe: number;
  menuBasePrice: number;
}) {
  const { formatPrice } = useCurrency();

  const [markupPct, setMarkupPct] = useState(400);
  const [vatPct, setVatPct] = useState(5);
  const [servicePct, setServicePct] = useState(15);
  const [manualPrice, setManualPrice] = useState<string>("");

  const markupAmount = useMemo(() => costPerServe * (markupPct / 100), [costPerServe, markupPct]);
  const subtotal = useMemo(() => costPerServe + markupAmount, [costPerServe, markupAmount]);
  const vatAmount = useMemo(() => subtotal * (vatPct / 100), [subtotal, vatPct]);
  const serviceAmount = useMemo(() => subtotal * (servicePct / 100), [subtotal, servicePct]);
  const suggestedPrice = useMemo(() => subtotal + vatAmount + serviceAmount, [subtotal, vatAmount, serviceAmount]);

  const finalPrice = manualPrice ? Number(manualPrice) : suggestedPrice;
  const profit = finalPrice - costPerServe;
  const foodCostPct = finalPrice > 0 ? (costPerServe / finalPrice) * 100 : 0;

  const menuFoodCostPct = menuBasePrice > 0 ? (costPerServe / menuBasePrice) * 100 : 0;

  return (
    <section aria-label="Live recipe costing" className="space-y-3">
      <div className="rounded-xl border-2 border-border bg-card p-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Cost per serving</p>
            <p className="text-xs text-muted-foreground">Live preview while editing</p>
          </div>
          <p className="text-xl font-bold text-primary">{formatPrice(costPerServe)}</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">Markup %</Label>
            <div className="flex items-center gap-1">
              <Input
                type="number"
                value={markupPct}
                onChange={(e) => setMarkupPct(Number(e.target.value) || 0)}
                className="h-9"
              />
              <span className="text-xs text-muted-foreground">%</span>
            </div>
          </div>
          <div>
            <Label className="text-xs">VAT %</Label>
            <div className="flex items-center gap-1">
              <Input
                type="number"
                value={vatPct}
                onChange={(e) => setVatPct(Number(e.target.value) || 0)}
                className="h-9"
              />
              <span className="text-xs text-muted-foreground">%</span>
            </div>
          </div>
          <div>
            <Label className="text-xs">Service %</Label>
            <div className="flex items-center gap-1">
              <Input
                type="number"
                value={servicePct}
                onChange={(e) => setServicePct(Number(e.target.value) || 0)}
                className="h-9"
              />
              <span className="text-xs text-muted-foreground">%</span>
            </div>
          </div>
        </div>

        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Markup ({markupPct}%)</span>
            <span>{formatPrice(markupAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">VAT ({vatPct}%)</span>
            <span>{formatPrice(vatAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Service ({servicePct}%)</span>
            <span>{formatPrice(serviceAmount)}</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <span className="font-semibold">Suggested selling price</span>
          <span className="text-xl font-bold">{formatPrice(suggestedPrice)}</span>
        </div>

        <div>
          <Label className="text-xs text-muted-foreground">Manual selling price (optional)</Label>
          <Input
            type="number"
            step="0.01"
            placeholder={suggestedPrice.toFixed(2)}
            value={manualPrice}
            onChange={(e) => setManualPrice(e.target.value)}
            className="h-9"
          />
        </div>

        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="p-2 bg-muted/50 rounded">
            <p className="text-[10px] text-muted-foreground">Price</p>
            <p className="text-sm font-semibold">{formatPrice(finalPrice)}</p>
          </div>
          <div className="p-2 bg-muted/50 rounded">
            <p className="text-[10px] text-muted-foreground">Profit</p>
            <p className={`text-sm font-semibold ${profit >= 0 ? "text-primary" : "text-destructive"}`}>
              {formatPrice(profit)}
            </p>
          </div>
          <div className="p-2 bg-muted/50 rounded">
            <p className="text-[10px] text-muted-foreground">Food %</p>
            <p className={`text-sm font-semibold ${foodCostPct > 35 ? "text-destructive" : "text-primary"}`}>
              {foodCostPct.toFixed(1)}%
            </p>
          </div>
          <div className="p-2 bg-muted/50 rounded">
            <p className="text-[10px] text-muted-foreground">Menu %</p>
            <p className={`text-sm font-semibold ${menuFoodCostPct > 35 ? "text-destructive" : "text-primary"}`}>
              {menuFoodCostPct.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-3">
          <p className="text-xs text-muted-foreground">Menu price used for “Menu %”</p>
          <p className="text-sm font-semibold">{formatPrice(menuBasePrice)}</p>
        </CardContent>
      </Card>
    </section>
  );
}
