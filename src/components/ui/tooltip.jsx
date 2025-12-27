import React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "../../lib/utils.js";

export function TooltipProvider(props) {
  return <TooltipPrimitive.Provider delayDuration={0} {...props} />;
}

export function Tooltip(props) {
  return (
    <TooltipProvider>
      <TooltipPrimitive.Root {...props} />
    </TooltipProvider>
  );
}

export function TooltipTrigger(props) {
  return <TooltipPrimitive.Trigger {...props} />;
}

export function TooltipContent({ className, sideOffset = 6, ...props }) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          "z-50 rounded-md bg-gray-900 px-3 py-2 text-xs text-white shadow",
          className
        )}
        {...props}
      />
    </TooltipPrimitive.Portal>
  );
}
