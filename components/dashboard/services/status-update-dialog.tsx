"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type StatusUpdateMode = "done" | "failed" | "undo";

interface StatusUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: StatusUpdateMode;
  onConfirm: () => void;
  isPending: boolean;
  note?: string;
  onNoteChange?: (value: string) => void;
  notePlaceholder?: string;
  undoStatus?: string;
  onUndoStatusChange?: (value: string) => void;
}

const titles: Record<StatusUpdateMode, string> = {
  done: "Mark Service as Done",
  failed: "Mark Service as Failed",
  undo: "Undo Completed Status",
};

const descriptions: Record<StatusUpdateMode, string> = {
  done: "Optionally add a service note before completing this service",
  failed: "Provide a service note explaining why this service failed",
  undo: "Change this service back to an active status if there was a mistake",
};

const confirmTexts: Record<StatusUpdateMode, string> = {
  done: "Confirm Done",
  failed: "Confirm Failed",
  undo: "Confirm Undo",
};

export function StatusUpdateDialog({
  open,
  onOpenChange,
  mode,
  onConfirm,
  isPending,
  note,
  onNoteChange,
  notePlaceholder,
  undoStatus,
  onUndoStatusChange,
}: StatusUpdateDialogProps) {
  const showNoteField = mode !== "undo";
  const confirmDisabled = isPending || (mode === "failed" && !note?.trim());
  const confirmClassName =
    mode === "done" ? "bg-green-600 hover:bg-green-700 text-white" : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{titles[mode]}</DialogTitle>
          <DialogDescription>{descriptions[mode]}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {showNoteField ? (
            <div>
              <Label htmlFor={`status-note-${mode}`}>
                Service Note{mode === "done" ? " (optional)" : ""}
              </Label>
              <textarea
                id={`status-note-${mode}`}
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-1.5 resize-none"
                placeholder={notePlaceholder || "Add any notes about the repair..."}
                value={note ?? ""}
                onChange={(e) => onNoteChange?.(e.target.value)}
                autoFocus
              />
            </div>
          ) : (
            <div>
              <Label>New Status</Label>
              <Select
                value={undoStatus}
                onValueChange={(value) => value && onUndoStatusChange?.(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="repairing">In Progress</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-2">
                This will move the task back to the Active tab and clear the
                completion date.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={confirmDisabled}
            variant={mode === "failed" ? "destructive" : undefined}
            className={confirmClassName}
          >
            {isPending ? "Processing..." : confirmTexts[mode]}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
