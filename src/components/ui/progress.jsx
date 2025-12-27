import React from "react";
import { cn } from "../../lib/utils.js";

export function Progress({ value = 0, className }) {
  const v = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className={cn("h-2 w-full rounded-full bg-gray-100 overflow-hidden", className)}>
      <div className="h-full bg-blue-600" style={{ width: `${v}%` }} />
    </div>
  );
}
