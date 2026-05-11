type SupplierDebtStatus = "unpaid" | "partial" | "paid"

function getSupplierDebtStatus(totalAmount: number, paidAmount: number): SupplierDebtStatus {
  if (paidAmount >= totalAmount) return "paid"
  if (paidAmount > 0) return "partial"
  return "unpaid"
}

function validateSupplierDebtAmounts(totalAmount: number, paidAmount: number): void {
  if (totalAmount <= 0) throw new Error("Total hutang harus lebih dari 0")
  if (paidAmount < 0) throw new Error("Jumlah dibayar tidak boleh negatif")
  if (paidAmount > totalAmount) throw new Error("Jumlah dibayar tidak boleh melebihi total hutang")
}

function validateSupplierDebtPaymentAmount(amount: number, remainingAmount: number): void {
  if (amount <= 0) throw new Error("Jumlah pembayaran harus lebih dari 0")
  if (amount > remainingAmount) throw new Error("Jumlah pembayaran tidak boleh melebihi sisa hutang")
}

export {}
