import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:shadow-md",
        secondary: "border-transparent bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/90 hover:shadow-md",
        destructive: "border-transparent bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 hover:shadow-md",
        outline: "text-foreground border-border/50 bg-background/50 backdrop-blur-sm hover:bg-accent/50 hover:border-border",
        success: "border-transparent bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shadow-sm hover:bg-emerald-500/25",
        warning: "border-transparent bg-amber-500/15 text-amber-600 dark:text-amber-400 shadow-sm hover:bg-amber-500/25",
        info: "border-transparent bg-blue-500/15 text-blue-600 dark:text-blue-400 shadow-sm hover:bg-blue-500/25",
        premium: "border-transparent bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-600 dark:text-amber-400 shadow-sm hover:from-amber-500/30 hover:to-orange-500/30",
        glass: "border-white/20 bg-white/10 text-foreground backdrop-blur-md shadow-sm hover:bg-white/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
