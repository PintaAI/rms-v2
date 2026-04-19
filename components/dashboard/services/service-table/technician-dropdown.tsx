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
import { Badge } from "@/components/ui/badge";
import {
  RiUserLine,
  RiUserStarLine,
  RiCloseLine,
  RiLoader4Line,
  RiArrowDownSLine,
  RiCheckLine,
} from "@remixicon/react";
import { getTechniciansByToko, assignTechnician } from "@/actions";
import type { ServiceTableItem } from "@/components/dashboard/service-table";

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

  const loadTechnicians = async () => {
    setIsLoading(true);
    const result = await getTechniciansByToko(tokoId);
    if (result.success && result.data) {
      setTechnicians(result.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (open) {
      loadTechnicians();
    }
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
          className="h-7 px-2 data-[state=open]:bg-muted"
          disabled={isUpdating || isDisabled}
        >
          {isUpdating ? (
            <RiLoader4Line className="h-4 w-4 animate-spin" />
          ) : currentTechnician ? (
            <Badge variant="default" className="font-normal">
              <RiUserStarLine className="h-3 w-3 mr-1" />
              {currentTechnician.name}
            </Badge>
          ) : (
            <Badge variant="secondary" className="font-normal">
              <RiUserLine className="h-3 w-3 mr-1" />
              Unassigned
            </Badge>
          )}
          {!isDisabled && <RiArrowDownSLine className="h-3 w-3 ml-1 text-muted-foreground" />}
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
            <RiUserLine className="h-6 w-6 mb-2 opacity-50" />
            No technicians available
          </div>
        ) : (
          <>
            {currentTechnician && (
              <DropdownMenuItem
                onClick={() => handleAssign(null)}
                className="text-destructive focus:text-destructive"
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
              >
                {tech.id === currentTechnician?.id && (
                  <RiCheckLine className="h-4 w-4 mr-2 text-primary" />
                )}
                <div className="flex flex-col">
                  <span>{tech.name}</span>
                  {tech.id !== currentTechnician?.id && (
                    <span className="text-xs text-muted-foreground">
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
