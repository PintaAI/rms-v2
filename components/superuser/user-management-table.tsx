"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { updateUserSubscription, type SuperuserUserRow } from "@/actions/superuser";
import type { SubscriptionPlan } from "@/lib/features";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface UserManagementTableProps {
  users: SuperuserUserRow[];
}

export function UserManagementTable({ users }: UserManagementTableProps) {
  const [isPending, startTransition] = useTransition();

  const handlePlanChange = (userId: string, plan: SubscriptionPlan) => {
    startTransition(async () => {
      const result = await updateUserSubscription(userId, plan);
      if (!result.success) {
        toast.error(result.error || "Failed to update subscription");
        return;
      }
      toast.success("Subscription updated");
    });
  };

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-border/50 bg-muted/30">
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Plan</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Active Until</TableHead>
            <TableHead>Toko Count</TableHead>
            <TableHead>Staff</TableHead>
            <TableHead>Technicians</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Last Activity</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id} className="border-border/30">
              <TableCell className="font-medium">{user.name}</TableCell>
              <TableCell className="text-muted-foreground">{user.email}</TableCell>
              <TableCell>
                <Select
                  defaultValue={user.plan}
                  disabled={isPending}
                  onValueChange={(value) => handlePlanChange(user.id, value as SubscriptionPlan)}
                >
                  <SelectTrigger className="h-8 w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="premium">Pro</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <Badge variant={user.subscriptionStatus === "active" || user.subscriptionStatus === "trialing" ? "success" : user.subscriptionStatus === "past_due" ? "warning" : "outline"}>
                  {user.subscriptionStatus ?? "-"}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {user.currentPeriodEnd ? new Date(user.currentPeriodEnd).toLocaleDateString("id-ID") : "-"}
              </TableCell>
              <TableCell>{user.tokoCount}</TableCell>
              <TableCell>{user.staffCount}</TableCell>
              <TableCell>{user.technicianCount}</TableCell>
              <TableCell className="text-muted-foreground">
                {new Date(user.createdAt).toLocaleDateString()}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {user.lastActivity ? new Date(user.lastActivity).toLocaleDateString() : "Never"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
