"use client";

import { useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  RiUserLine,
  RiUserStarLine,
  RiCloseLine,
  RiLoader4Line,
  RiArrowDownSLine,
  RiCheckLine,
  RiAddLine,
} from "@remixicon/react";
import { getTechniciansByToko, assignTechnician } from "@/actions";
import type { ServiceTableItem } from "@/components/dashboard/services/service-table";

interface Technician {
  id: string;
  name: string;
  email: string;
}

interface TechnicianDropdownProps {
  service: ServiceTableItem;
  tokoId: string;
  onAssignmentChange?: () => void;
  disabled?: boolean;
  disableAssignment?: boolean;
}

export function TechnicianDropdown({
  service,
  tokoId,
  onAssignmentChange,
  disabled,
  disableAssignment,
}: TechnicianDropdownProps) {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    let active = true;

    const load = async () => {
      setIsLoading(true);
      const result = await getTechniciansByToko(tokoId);
      if (!active) return;
      if (result.success && result.data) {
        setTechnicians(result.data);
      }
      setIsLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, [open, tokoId]);

  const handleAssign = async (technicianId: string | null) => {
    setIsUpdating(true);
    const result = await assignTechnician(service.id, technicianId);
    setIsUpdating(false);

    if (result.success) {
      setOpen(false);
      onAssignmentChange?.();
    } else {
      console.error("Failed to assign technician:", result.error);
      alert(result.error || "Failed to assign technician");
    }
  };

  const currentTechnician = service.technician;

  const isDisabled = disabled || disableAssignment;

  return (
    <DropdownMenu open={isDisabled ? false : open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        <Button
          variant="ghost"
          size="sm"
          className="h-auto px-2 py-1 data-[state=open]:bg-muted/50 transition-all duration-200"
          disabled={isUpdating || isDisabled}
        >
          {isUpdating ? (
            <RiLoader4Line className="h-3.5 w-3.5 animate-spin" />
          ) : currentTechnician ? (
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded-md bg-gradient-to-br from-accent/10 to-accent/5 flex items-center justify-center">
                <RiUserStarLine className="h-3 w-3 text-sky-500" />
              </div>
              <span className="font-medium text-sm">{currentTechnician.name}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded-md bg-muted/50 flex items-center justify-center">
                <RiUserLine className="h-3 w-3 text-muted-foreground" />
              </div>
              <span className="text-sm text-muted-foreground">Unassigned</span>
            </div>
          )}
          {!isDisabled && <RiArrowDownSLine className="h-3 w-3 ml-0.5 text-muted-foreground" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56" onClick={(e) => e.stopPropagation()}>
        {isLoading ? (
          <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
            <RiLoader4Line className="h-4 w-4 animate-spin mr-2" />
            Loading...
          </div>
        ) : technicians.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-4 text-sm text-muted-foreground">
            <div className="h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center mb-2">
              <RiUserLine className="h-5 w-5 opacity-50" />
            </div>
            No technicians available
          </div>
        ) : (
          <>
            {currentTechnician && (
              <DropdownMenuItem
                onClick={() => handleAssign(null)}
                className="text-destructive focus:text-destructive focus:bg-destructive/10"
              >
                <RiCloseLine className="h-4 w-4 mr-2" />
                Unassign
              </DropdownMenuItem>
            )}
            {currentTechnician && <DropdownMenuSeparator />}
            {technicians.map((tech) => (
              <DropdownMenuItem
                key={tech.id}
                onClick={() => handleAssign(tech.id)}
                className="flex items-center gap-3"
              >
                <div className={`h-7 w-7 rounded-lg flex items-center justify-center transition-all ${
                  tech.id === currentTechnician?.id 
                    ? 'bg-gradient-to-br from-accent/15 to-accent/5' 
                    : 'bg-muted/50'
                }`}>
                  {tech.id === currentTechnician?.id 
                    ? <RiCheckLine className="h-3.5 w-3.5 text-primary" />
                    : <RiAddLine className="h-3.5 w-3.5 text-muted-foreground" />
                  }
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-medium truncate">{tech.name}</span>
                  {tech.id !== currentTechnician?.id && (
                    <span className="text-xs text-muted-foreground truncate">
                      {tech.email}
                    </span>
                  )}
                </div>
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
