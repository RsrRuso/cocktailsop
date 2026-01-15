import { useState, useMemo, useCallback } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { MasterSpirit } from "@/hooks/useMasterSpirits";

interface IngredientComboboxProps {
  spirits: MasterSpirit[] | undefined;
  value: string;
  onValueChange: (value: string) => void;
}

// Limit displayed items to prevent UI freeze
const MAX_DISPLAYED_ITEMS = 50;

export function IngredientCombobox({ spirits, value, onValueChange }: IngredientComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const selectedSpirit = useMemo(() => 
    spirits?.find((spirit) => spirit.name === value),
    [spirits, value]
  );

  // Memoize filtered and limited spirits list
  const displayedSpirits = useMemo(() => {
    if (!spirits) return [];
    
    let filtered = spirits;
    
    // If there's a search query, filter first
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = spirits.filter(spirit => 
        spirit.name.toLowerCase().includes(query) ||
        (spirit.brand?.toLowerCase() || '').includes(query) ||
        (spirit.category?.toLowerCase() || '').includes(query)
      );
    }
    
    // Limit displayed items to prevent freeze
    return filtered.slice(0, MAX_DISPLAYED_ITEMS);
  }, [spirits, searchQuery]);

  const handleSelect = useCallback((spiritName: string) => {
    onValueChange(spiritName);
    setOpen(false);
    setSearchQuery("");
  }, [onValueChange]);

  const handleOpenChange = useCallback((isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setSearchQuery("");
    }
  }, []);

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="flex-1 justify-between h-10 bg-background border-input"
        >
          <span className="truncate">
            {selectedSpirit
              ? `${selectedSpirit.name}${selectedSpirit.brand ? ` (${selectedSpirit.brand})` : ''}`
              : "Select ingredient..."}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0 bg-popover border border-border z-[100]" align="start">
        <Command className="bg-popover" shouldFilter={false}>
          <CommandInput 
            placeholder="Search ingredients..." 
            className="h-10" 
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList className="max-h-[200px]">
            <CommandEmpty>No ingredient found.</CommandEmpty>
            <CommandGroup>
              {displayedSpirits.map((spirit) => (
                <CommandItem
                  key={spirit.id}
                  value={spirit.name}
                  onSelect={() => handleSelect(spirit.name)}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === spirit.name ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="truncate">{spirit.name}</span>
                    <span className="text-xs text-muted-foreground truncate">
                      {spirit.brand && `${spirit.brand} • `}
                      {spirit.source_type === 'yield_calculator' && 'Yield • '}
                      {spirit.source_type === 'sub_recipe' && 'Sub-Recipe • '}
                      {spirit.source_type === 'batch_recipe' && 'Batch • '}
                      {spirit.bottle_size_ml}{spirit.unit || 'ml'}
                    </span>
                  </div>
                </CommandItem>
              ))}
              {spirits && spirits.length > MAX_DISPLAYED_ITEMS && searchQuery.trim() === "" && (
                <div className="px-2 py-1.5 text-xs text-muted-foreground text-center border-t">
                  Type to search {spirits.length - MAX_DISPLAYED_ITEMS} more items...
                </div>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
