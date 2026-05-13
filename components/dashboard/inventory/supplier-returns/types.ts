import type { SupplierReturnFilters, SupplierReturnsResult } from "@/actions/supplier-returns"

export type SupplierReturnsData = SupplierReturnsResult
export type SupplierReturnsFilters = Pick<SupplierReturnFilters, "status" | "query" | "from" | "to">
