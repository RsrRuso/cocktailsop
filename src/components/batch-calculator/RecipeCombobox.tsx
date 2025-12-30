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

interface Recipe {
  id: string;
  recipe_name: string;
  description?: string | null;
}

interface RecipeComboboxProps {
  recipes: Recipe[] | undefined;
  value: string | null;
  onValueChange: (value: string) => void;
  placeholder?: string;
}

export function RecipeCombobox({ recipes, value, onValueChange, placeholder = "Choose a saved recipe" }: RecipeComboboxProps) {
  const [open, setOpen] = useState(false);

  const selectedRecipe = value && value !== "all" ? recipes?.find((r) => r.id === value) : null;
  const displayValue = value === "all" ? "All Batches" : selectedRecipe?.recipe_name || placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-12 glass bg-background/80 backdrop-blur-sm"
        >
          <span className="truncate">{displayValue}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-popover border border-border z-[100]" align="start">
        <Command className="bg-popover">
          <CommandInput placeholder="Search recipes..." className="h-10" />
          <CommandList className="max-h-[200px]">
            <CommandEmpty>No recipe found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="all All Batches"
                onSelect={() => {
                  onValueChange("all");
                  setOpen(false);
                }}
                className="cursor-pointer"
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === "all" ? "opacity-100" : "opacity-0"
                  )}
                />
                All Batches
              </CommandItem>
              {recipes && recipes.length > 0 ? (
                recipes.map((recipe) => (
                  <CommandItem
                    key={recipe.id}
                    value={`${recipe.id} ${recipe.recipe_name} ${recipe.description || ''}`}
                    onSelect={() => {
                      onValueChange(recipe.id);
                      setOpen(false);
                    }}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === recipe.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="truncate">{recipe.recipe_name}</span>
                      {recipe.description && (
                        <span className="text-xs text-muted-foreground truncate">
                          {recipe.description}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))
              ) : (
                <div className="p-3 text-center text-sm text-muted-foreground">
                  No recipes yet. Create one first!
                </div>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
