import { useState } from "react";
import { cn } from "@/lib/utils";

interface Filter {
  id: string;
  name: string;
  css: string;
  preview: string;
}

interface FiltersPickerProps {
  currentFilter: string;
  onSelect: (filter: Filter) => void;
  mediaUrl: string;
}

const filters: Filter[] = [
  { id: "none", name: "Normal", css: "none", preview: "" },
  { id: "clarendon", name: "Clarendon", css: "contrast(1.2) saturate(1.35)", preview: "contrast-125 saturate-150" },
  { id: "gingham", name: "Gingham", css: "brightness(1.05) hue-rotate(-10deg)", preview: "brightness-105" },
  { id: "moon", name: "Moon", css: "grayscale(1) contrast(1.1) brightness(1.1)", preview: "grayscale contrast-110" },
  { id: "lark", name: "Lark", css: "contrast(0.9) saturate(1.5) brightness(1.1)", preview: "saturate-150 brightness-110" },
  { id: "reyes", name: "Reyes", css: "sepia(0.22) brightness(1.1) contrast(0.85) saturate(0.75)", preview: "sepia brightness-110" },
  { id: "juno", name: "Juno", css: "sepia(0.35) contrast(1.15) brightness(1.15) saturate(1.4)", preview: "sepia-50 contrast-125" },
  { id: "slumber", name: "Slumber", css: "saturate(0.66) brightness(1.05) sepia(0.1)", preview: "saturate-50 brightness-105" },
  { id: "crema", name: "Crema", css: "sepia(0.5) contrast(1.25) brightness(1.15) saturate(0.9) hue-rotate(-5deg)", preview: "sepia-50 contrast-125" },
  { id: "ludwig", name: "Ludwig", css: "sepia(0.25) contrast(1.05) brightness(1.05) saturate(1.2)", preview: "sepia-25 saturate-125" },
  { id: "aden", name: "Aden", css: "hue-rotate(-20deg) contrast(0.9) saturate(0.85) brightness(1.2)", preview: "brightness-125 contrast-75" },
  { id: "perpetua", name: "Perpetua", css: "contrast(1.1) brightness(1.25) saturate(1.1)", preview: "brightness-125 contrast-110" },
  { id: "amaro", name: "Amaro", css: "sepia(0.35) contrast(1.1) brightness(1.2) saturate(1.3)", preview: "sepia-25 saturate-125" },
  { id: "mayfair", name: "Mayfair", css: "contrast(1.1) saturate(1.1) brightness(1.15)", preview: "contrast-110 saturate-110" },
  { id: "rise", name: "Rise", css: "brightness(1.05) sepia(0.15) contrast(0.9) saturate(0.9)", preview: "brightness-110 sepia-25" },
  { id: "hudson", name: "Hudson", css: "brightness(1.2) contrast(0.9) saturate(1.1)", preview: "brightness-125 contrast-75" },
  { id: "valencia", name: "Valencia", css: "contrast(1.08) brightness(1.08) sepia(0.08)", preview: "contrast-110 brightness-110" },
  { id: "xpro2", name: "X-Pro II", css: "sepia(0.3) contrast(1.2) saturate(1.4)", preview: "sepia-25 saturate-150" },
  { id: "sierra", name: "Sierra", css: "contrast(0.8) saturate(0.75) brightness(1.1) sepia(0.15)", preview: "contrast-75 sepia-25" },
  { id: "willow", name: "Willow", css: "grayscale(0.5) contrast(0.95) brightness(0.9)", preview: "grayscale-50 brightness-90" },
  { id: "lofi", name: "Lo-Fi", css: "saturate(1.1) contrast(1.5) brightness(1.05)", preview: "saturate-110 contrast-150" },
  { id: "inkwell", name: "Inkwell", css: "sepia(0.3) contrast(1.1) brightness(1.1) grayscale(1)", preview: "grayscale sepia-25" },
  { id: "nashville", name: "Nashville", css: "sepia(0.25) contrast(1.2) brightness(1.05) saturate(1.2) hue-rotate(-15deg)", preview: "sepia-25 contrast-125" },
  { id: "stinson", name: "Stinson", css: "contrast(0.75) saturate(0.85) brightness(1.15)", preview: "contrast-75 brightness-115" },
];

export function FiltersPicker({ currentFilter, onSelect, mediaUrl }: FiltersPickerProps) {
  return (
    <div className="py-4">
      <p className="text-xs text-muted-foreground mb-3 px-4">FILTERS</p>
      <div className="flex gap-3 overflow-x-auto px-4 pb-2 snap-x snap-mandatory">
        {filters.map((filter) => (
          <button
            key={filter.id}
            onClick={() => onSelect(filter)}
            className={cn(
              "flex flex-col items-center gap-2 flex-shrink-0 snap-start",
            )}
          >
            <div
              className={cn(
                "w-16 h-16 rounded-xl overflow-hidden border-2 transition-all",
                currentFilter === filter.id 
                  ? "border-primary ring-2 ring-primary/30" 
                  : "border-transparent"
              )}
            >
              <img
                src={mediaUrl}
                alt={filter.name}
                className="w-full h-full object-cover"
                style={{ filter: filter.css }}
              />
            </div>
            <span className={cn(
              "text-xs font-medium transition-colors",
              currentFilter === filter.id ? "text-primary" : "text-muted-foreground"
            )}>
              {filter.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
