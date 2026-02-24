import * as React from "react"
import { cn } from "@/lib/utils"

const NeonCard = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & {
        variant?: "default" | "primary" | "destructive" | "warning" | "success"
        glow?: boolean
    }
>(({ className, variant = "default", glow = true, ...props }, ref) => {
    const variantStyles = {
        default: "border-border shadow-none",
        primary: "border-primary/20 shadow-[0_0_15px_-5px_rgba(var(--color-primary),0.2)]",
        destructive: "border-destructive/20 shadow-[0_0_15px_-5px_rgba(var(--color-destructive),0.2)]",
        warning: "border-warning/20 shadow-[0_0_15px_-5px_var(--color-warning)]",
        success: "border-emerald-500/20 shadow-[0_0_15px_-5px_rgba(16,185,129,0.1)]",
    }

    return (
        <div
            ref={ref}
            className={cn(
                "rounded-2xl border bg-card text-card-foreground",
                glow ? variantStyles[variant] : "border-border",
                "transition-all duration-300",
                className
            )}
            {...props}
        />
    )
})
NeonCard.displayName = "NeonCard"

const NeonCardHeader = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn("flex flex-col space-y-1.5 p-6", className)}
        {...props}
    />
))
NeonCardHeader.displayName = "NeonCardHeader"

const NeonCardTitle = React.forwardRef<
    HTMLParagraphElement,
    React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
    <h3
        ref={ref}
        className={cn(
            "text-2xl font-semibold leading-none tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent",
            className
        )}
        {...props}
    />
))
NeonCardTitle.displayName = "NeonCardTitle"

const NeonCardDescription = React.forwardRef<
    HTMLParagraphElement,
    React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
    <p
        ref={ref}
        className={cn("text-sm text-muted-foreground", className)}
        {...props}
    />
))
NeonCardDescription.displayName = "NeonCardDescription"

const NeonCardContent = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
NeonCardContent.displayName = "NeonCardContent"

const NeonCardFooter = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn("flex items-center p-6 pt-0", className)}
        {...props}
    />
))
NeonCardFooter.displayName = "NeonCardFooter"

export { NeonCard, NeonCardHeader, NeonCardFooter, NeonCardTitle, NeonCardDescription, NeonCardContent }
