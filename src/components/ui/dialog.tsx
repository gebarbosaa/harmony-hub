"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      onInteractOutside={(event) => event.preventDefault()}
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid max-h-[min(90dvh,860px)] w-[calc(100%-1.25rem)] max-w-xl translate-x-[-50%] translate-y-[-50%] gap-6 overflow-y-auto overscroll-contain rounded-3xl border border-border/80 bg-card p-5 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.45)] duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:w-[calc(100%-2rem)] sm:p-7 [&_label]:mb-1.5 [&_label]:block [&_label]:min-w-0 [&_label]:text-sm [&_label]:font-medium [&_label]:text-foreground [&_form]:flex [&_form]:flex-col [&_form]:gap-5 [&_form_*]:min-w-0 [&_input:not([type=checkbox]):not([type=radio])]:h-11 [&_input:not([type=checkbox]):not([type=radio])]:w-full [&_input:not([type=checkbox]):not([type=radio])]:border [&_input:not([type=checkbox]):not([type=radio])]:min-h-11 [&_input:not([type=checkbox]):not([type=radio])]:rounded-xl [&_input:not([type=checkbox]):not([type=radio])]:border-border [&_input:not([type=checkbox]):not([type=radio])]:bg-background [&_input:not([type=checkbox]):not([type=radio])]:px-3 [&_input:not([type=checkbox]):not([type=radio])]:py-2.5 [&_input:not([type=checkbox]):not([type=radio])]:text-sm [&_input:not([type=checkbox]):not([type=radio])]:outline-none [&_input:not([type=checkbox]):not([type=radio])]:transition-colors [&_input:not([type=checkbox]):not([type=radio])]:focus-visible:border-primary [&_input:not([type=checkbox]):not([type=radio])]:focus-visible:ring-2 [&_input:not([type=checkbox]):not([type=radio])]:focus-visible:ring-primary/15 [&_select]:h-11 [&_select]:w-full [&_select]:border [&_select]:min-h-11 [&_select]:rounded-xl [&_select]:border-border [&_select]:bg-background [&_select]:px-3 [&_select]:py-2.5 [&_select]:text-sm [&_select]:outline-none [&_select]:focus-visible:border-primary [&_select]:focus-visible:ring-2 [&_select]:focus-visible:ring-primary/15 [&_textarea]:w-full [&_textarea]:border [&_textarea]:min-h-24 [&_textarea]:resize-y [&_textarea]:rounded-xl [&_textarea]:border-border [&_textarea]:bg-background [&_textarea]:px-3 [&_textarea]:py-2.5 [&_textarea]:text-sm [&_textarea]:outline-none [&_textarea]:focus-visible:border-primary [&_textarea]:focus-visible:ring-2 [&_textarea]:focus-visible:ring-primary/15",
        className,
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background cursor-pointer transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}
    {...props}
  />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
