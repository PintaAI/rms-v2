export function normalizeWhatsappNumber(value: string) {
  return value.replace(/\D/g, "").replace(/^0/, "62");
}

export function validateIndonesianWhatsappNumber(value: string) {
  const normalized = normalizeWhatsappNumber(value);

  if (!normalized) {
    return { valid: false, normalized, error: "Nomor WhatsApp wajib diisi" };
  }

  if (!/^628\d{7,11}$/.test(normalized)) {
    return {
      valid: false,
      normalized,
      error: "Format WhatsApp harus nomor Indonesia aktif, contoh 08123456789 atau 6281234567890",
    };
  }

  return { valid: true, normalized, error: null };
}
