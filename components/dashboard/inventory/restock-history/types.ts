import type { RestockHistoryResult, RestockHistoryUser } from "@/actions/inventory"

export type RestockHistoryData = RestockHistoryResult
export type { RestockHistoryUser }

export type RestockHistoryFilters = {
  q: string
  userId: string
  from: string
  to: string
}
