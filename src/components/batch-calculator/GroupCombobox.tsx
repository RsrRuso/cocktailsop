import { useState } from "react";
import { Check, ChevronsUpDown, Users, Search } from "lucide-react";
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

interface Group {
  id: string;
  name: string;
}

interface GroupComboboxProps {
  groups: Group[] | undefined;
  value: string | null;
  onValueChange: (value: string | null) => void;
}

export function GroupCombobox({ groups, value, onValueChange }: GroupComboboxProps) {
  const [open, setOpen] = useState(false);

  const selectedGroup = value ? groups?.find((g) => g.id === value) : null;
  const displayValue = value === null ? "Personal Recipes" : selectedGroup?.name || "Choose a group";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-12 glass bg-background/80 backdrop-blur-sm"
        >
          <div className="flex items-center gap-2 truncate">
            <Users className="w-4 h-4 shrink-0" />
            <span className="truncate">{displayValue}</span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-popover border border-border z-[100]" align="start">
        <Command className="bg-popover">
          <CommandInput placeholder="Search groups..." className="h-10" />
          <CommandList className="max-h-[200px]">
            <CommandEmpty>No group found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="personal Personal Recipes"
                onSelect={() => {
                  onValueChange(null);
                  setOpen(false);
                }}
                className="cursor-pointer"
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === null ? "opacity-100" : "opacity-0"
                  )}
                />
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Personal Recipes
                </div>
              </CommandItem>
              {groups?.map((group) => (
                <CommandItem
                  key={group.id}
                  value={`${group.id} ${group.name}`}
                  onSelect={() => {
                    onValueChange(group.id);
                    setOpen(false);
                  }}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === group.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    {group.name}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
