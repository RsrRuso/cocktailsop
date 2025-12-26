import { useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
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

export function IngredientCombobox({ spirits, value, onValueChange }: IngredientComboboxProps) {
  const [open, setOpen] = useState(false);

  const selectedSpirit = spirits?.find((spirit) => spirit.name === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
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
        <Command className="bg-popover">
          <CommandInput placeholder="Search ingredients..." className="h-10" />
          <CommandList className="max-h-[200px]">
            <CommandEmpty>No ingredient found.</CommandEmpty>
            <CommandGroup>
              {spirits?.map((spirit) => (
                <CommandItem
                  key={spirit.id}
                  value={`${spirit.name} ${spirit.brand || ''}`}
                  onSelect={() => {
                    onValueChange(spirit.name);
                    setOpen(false);
                  }}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === spirit.name ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="truncate">
                    {spirit.name} {spirit.brand ? `(${spirit.brand})` : ''}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
