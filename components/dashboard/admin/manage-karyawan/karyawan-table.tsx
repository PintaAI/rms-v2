"use client";

import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  RiAddLine,
  RiDeleteBinLine,
  RiSearchLine,
  RiShieldUserLine,
  RiUserLine,
} from "@remixicon/react";
import { fuzzyScore } from "@/lib/fuzzy-search";
import type { KaryawanItem } from "@/actions/karyawan";
import type { ActionPermissions } from "./types";
import { PerformanceBadge } from "./performance-badge";

interface KaryawanTableProps {
  karyawan: KaryawanItem[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  actionPermissions: ActionPermissions;
  onAddClick: () => void;
  onDeleteClick: (item: KaryawanItem) => void;
  onPermissionClick: (item: KaryawanItem) => void;
  onPerformanceClick: (item: KaryawanItem) => void;
}

export function KaryawanTable({
  karyawan,
  searchQuery,
  onSearchChange,
  actionPermissions,
  onAddClick,
  onDeleteClick,
  onPermissionClick,
  onPerformanceClick,
}: KaryawanTableProps) {
  const filteredKaryawan = useMemo(() => {
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) return karyawan;

    return karyawan
      .map((item) => {
        const targets = [item.name, item.email, item.role, item.role === "technician" ? "teknisi" : "staff"];
        const score = targets.reduce<number | null>((bestScore, target) => {
          const currentScore = fuzzyScore(trimmedQuery, target);
          if (currentScore === null) return bestScore;
          return bestScore === null ? currentScore : Math.max(bestScore, currentScore);
        }, null);

        return { item, score };
      })
      .filter((entry): entry is { item: KaryawanItem; score: number } => entry.score !== null)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.item.name.localeCompare(b.item.name);
      })
      .map((entry) => entry.item);
  }, [karyawan, searchQuery]);

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-5 w-1 bg-primary rounded-full" />
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Daftar Karyawan</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <RiSearchLine className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Cari karyawan..."
              className="pl-9"
            />
          </div>
          {actionPermissions.canCreate && (
            <Button
              onClick={onAddClick}
              className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 shadow-lg shadow-primary/20 transition-all duration-200 hover:shadow-xl hover:shadow-primary/30"
            >
              <RiAddLine className="h-4 w-4 mr-1.5" />
              Tambah Karyawan
            </Button>
          )}
        </div>
      </div>

      <Card className="border-border/50 shadow-lg py-0 shadow-black/5 overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-black/10">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Nama</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Email</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Role</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Performance</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-widest w-[112px]">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredKaryawan.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    {searchQuery.trim() ? "Tidak ada karyawan yang cocok dengan pencarian" : "Belum ada karyawan. Klik \"Tambah Karyawan\" untuk menambah."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredKaryawan.map((item) => {
                  const canOpenPerformance = item.role === "technician";

                  return (
                    <TableRow
                      key={item.id}
                      className={`border-border/50 ${canOpenPerformance ? "cursor-pointer hover:bg-muted/50" : ""}`}
                      onClick={canOpenPerformance ? () => onPerformanceClick(item) : undefined}
                      onKeyDown={canOpenPerformance ? (event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onPerformanceClick(item);
                        }
                      } : undefined}
                      tabIndex={canOpenPerformance ? 0 : undefined}
                      title={canOpenPerformance ? "Klik untuk melihat detail performance teknisi" : undefined}
                    >
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.email}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
                            item.role === "staff"
                              ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                              : "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                          }`}
                        >
                          {item.role === "staff" ? "Staff" : "Technician"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <PerformanceBadge
                          performance={item.performance}
                          role={item.role}
                          onClick={canOpenPerformance ? (event) => {
                            event.stopPropagation();
                            onPerformanceClick(item);
                          } : undefined}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {actionPermissions.canManagePermissions && (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={(event) => {
                                event.stopPropagation();
                                onPermissionClick(item);
                              }}
                              title="Kelola permission"
                            >
                              <RiShieldUserLine className="size-4" />
                            </Button>
                          )}
                          {actionPermissions.canDelete && (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={(event) => {
                                event.stopPropagation();
                                onDeleteClick(item);
                              }}
                            >
                              <RiDeleteBinLine className="size-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  );
}
