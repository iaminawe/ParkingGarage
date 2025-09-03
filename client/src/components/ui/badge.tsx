import React from "react"
import { cn } from "@/utils/cn"
import { badgeVariants, type BadgeProps } from "@/utils/badge-variants"

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge }
