"use client"

import * as Dialog from "@radix-ui/react-dialog"
import * as React from "react"

export const Sheet = Dialog.Root
export const SheetTrigger = Dialog.Trigger
export const SheetClose = Dialog.Close
export const SheetPortal = Dialog.Portal

export const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof Dialog.Overlay>,
  React.ComponentPropsWithoutRef<typeof Dialog.Overlay>
>(({ className, ...props }, ref) => (
  <Dialog.Overlay
    ref={ref}
    className={[
      "fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    ]
      .filter(Boolean)
      .join(" ")}
    {...props}
  />
))
SheetOverlay.displayName = "SheetOverlay"

export const SheetContent = React.forwardRef<
  React.ElementRef<typeof Dialog.Content>,
  React.ComponentPropsWithoutRef<typeof Dialog.Content>
>(({ className, children, ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay />
    <Dialog.Content
      ref={ref}
      className={[
        "fixed right-0 top-0 z-50 h-full w-80 bg-white shadow-xl transition-transform duration-300 data-[state=open]:translate-x-0 data-[state=closed]:translate-x-full focus:outline-none overflow-y-auto",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </Dialog.Content>
  </SheetPortal>
))
SheetContent.displayName = "SheetContent"

export const SheetHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={["flex flex-col gap-1.5 p-4 border-b", className]
      .filter(Boolean)
      .join(" ")}
    {...props}
  />
)

export const SheetFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={["flex flex-col-reverse gap-2 p-4 border-t sm:flex-row sm:justify-end", className]
      .filter(Boolean)
      .join(" ")}
    {...props}
  />
)

export const SheetTitle = React.forwardRef<
  React.ElementRef<typeof Dialog.Title>,
  React.ComponentPropsWithoutRef<typeof Dialog.Title>
>(({ className, ...props }, ref) => (
  <Dialog.Title
    ref={ref}
    className={["text-lg font-semibold text-black", className]
      .filter(Boolean)
      .join(" ")}
    {...props}
  />
))
SheetTitle.displayName = "SheetTitle"

export const SheetDescription = React.forwardRef<
  React.ElementRef<typeof Dialog.Description>,
  React.ComponentPropsWithoutRef<typeof Dialog.Description>
>(({ className, ...props }, ref) => (
  <Dialog.Description
    ref={ref}
    className={["text-sm text-brand-gray", className].filter(Boolean).join(" ")}
    {...props}
  />
))
SheetDescription.displayName = "SheetDescription"
