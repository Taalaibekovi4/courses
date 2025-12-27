import React from "react";
import { cn } from "../../lib/utils.js";

export function Alert({ className, variant = "default", ...props }) {
  return (
    <div
      className={cn(
        "rounded-md border p-3 text-sm",
        variant === "destructive"
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-gray-200 bg-white text-gray-800",
        className
      )}
      {...props}
    />
  );
}

export function AlertDescription({ className, ...props }) {
  return <div className={cn("text-sm", className)} {...props} />;
}
