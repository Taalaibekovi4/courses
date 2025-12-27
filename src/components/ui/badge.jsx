import React from "react";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils.js";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium border",
  {
    variants: {
      variant: {
        default: "bg-blue-50 text-blue-700 border-blue-200",
        secondary: "bg-gray-100 text-gray-700 border-gray-200",
        outline: "bg-white text-gray-700 border-gray-200",
        destructive: "bg-red-50 text-red-700 border-red-200",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export function Badge({ className, variant, ...props }) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
