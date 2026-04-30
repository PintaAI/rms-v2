"use client";

import Link from "next/link";
import { RiVipCrownLine, RiUserLine, RiToolsLine, RiLineChartLine, RiClipboardLine, RiCheckboxCircleLine } from "@remixicon/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { FeatureKey, SubscriptionPlan } from "@/lib/features";
import { FEATURE_PREVIEW_INFO, MOCK_STAFF, MOCK_SPAREPARTS, MOCK_REVENUE_DATA, MOCK_AUDIT_ITEMS, planLabels } from "@/lib/feature-preview-mocks";
import { formatCurrency } from "@/lib/utils";

interface FeaturePreviewProps {
  featureKey: FeatureKey;
  requiredPlan: SubscriptionPlan;
  tokoId: string;
}

export function FeaturePreview({ featureKey, requiredPlan, tokoId }: FeaturePreviewProps) {
  const info = FEATURE_PREVIEW_INFO[featureKey];
  if (!info) return null;

  return (
    <div className="relative min-h-[60vh]">
      <div className="pointer-events-none select-none opacity-70 blur-[0.5px]">
        {info.previewType === "staff" && <StaffPreviewUI />}
        {info.previewType === "sparepart" && <SparepartPreviewUI />}
        {info.previewType === "revenue" && <RevenuePreviewUI />}
        {info.previewType === "audit" && <AuditPreviewUI />}
      </div>

      <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/55 backdrop-blur-[1px]">
        <Card className="mx-4 w-full max-w-lg border-primary/20 bg-card/95 shadow-lg">
          <CardHeader className="gap-3">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                <FeatureIcon type={info.previewType} />
              </div>
              <div className="min-w-0 space-y-1">
                <CardTitle className="text-xl font-black tracking-tight">{info.title}</CardTitle>
                <p className="text-sm text-muted-foreground">{info.description}</p>
              </div>
            </div>
            <Badge variant="warning" className="gap-1">
              <RiVipCrownLine className="size-3" />
              Butuh {planLabels[requiredPlan]}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Keuntungan fitur ini:</p>
              <ul className="space-y-1">
                {info.benefits.map((benefit, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <RiCheckboxCircleLine className="size-4 mt-0.5 text-primary shrink-0" />
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
            <Button asChild className="w-full">
              <Link href={`/${tokoId}/admin?settings=premium`}>
                <RiVipCrownLine className="size-4" />
                Upgrade ke {planLabels[requiredPlan]}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function FeatureIcon({ type }: { type: string }) {
  switch (type) {
    case "staff":
      return <RiUserLine className="size-5" />;
    case "sparepart":
      return <RiToolsLine className="size-5" />;
    case "revenue":
      return <RiLineChartLine className="size-5" />;
    case "audit":
      return <RiClipboardLine className="size-5" />;
    default:
      return <RiVipCrownLine className="size-5" />;
  }
}

function StaffPreviewUI() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Daftar Karyawan</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MOCK_STAFF.map((staff) => (
              <TableRow key={staff.id}>
                <TableCell className="font-medium">{staff.name}</TableCell>
                <TableCell>{staff.email}</TableCell>
                <TableCell>
                  <Badge variant={staff.role === "staff" ? "secondary" : "outline"}>
                    {staff.role === "staff" ? "Staff" : "Teknisi"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={staff.status === "active" ? "success" : "destructive"}>
                    {staff.status === "active" ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="flex gap-2 mt-4">
          <Button variant="outline" size="sm" disabled>
            + Add Staff
          </Button>
          <Button variant="outline" size="sm" disabled>
            + Add Teknisi
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SparepartPreviewUI() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Sparepart Inventory</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Price</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MOCK_SPAREPARTS.map((sp) => (
              <TableRow key={sp.id}>
                <TableCell className="font-medium">{sp.name}</TableCell>
                <TableCell>{sp.category}</TableCell>
                <TableCell>{sp.stock}</TableCell>
                <TableCell>{formatCurrency(sp.price)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="flex gap-2 mt-4">
          <Button variant="outline" size="sm" disabled>
            + Add Sparepart
          </Button>
          <Button variant="outline" size="sm" disabled>
            + Add Service
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function RevenuePreviewUI() {
  const totalRevenue = MOCK_REVENUE_DATA.reduce((sum, d) => sum + d.revenue, 0);
  const totalServices = MOCK_REVENUE_DATA.reduce((sum, d) => sum + d.services, 0);
  
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Total Services</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{totalServices}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Avg Revenue/Service</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{formatCurrency(totalRevenue / totalServices)}</p>
        </CardContent>
      </Card>
      <Card className="md:col-span-3">
        <CardHeader>
          <CardTitle className="text-lg">Monthly Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>Services</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_REVENUE_DATA.map((d) => (
                <TableRow key={d.month}>
                  <TableCell className="font-medium">{d.month}</TableCell>
                  <TableCell>{formatCurrency(d.revenue)}</TableCell>
                  <TableCell>{d.services}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function AuditPreviewUI() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Audit Results</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sparepart</TableHead>
              <TableHead>Expected</TableHead>
              <TableHead>Actual</TableHead>
              <TableHead>Discrepancy</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MOCK_AUDIT_ITEMS.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.sparepartName}</TableCell>
                <TableCell>{item.expectedStock}</TableCell>
                <TableCell>{item.actualStock}</TableCell>
                <TableCell>
                  <Badge variant={item.discrepancy === 0 ? "success" : "destructive"}>
                    {item.discrepancy === 0 ? "Match" : item.discrepancy}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="flex gap-2 mt-4">
          <Button variant="outline" size="sm" disabled>
            Start New Audit
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
