export function getRoleRedirectPath(storeId: string, role: string) {
  if (role === "superuser") {
    return "/superuser";
  }

  const basePath = role === "admin"
    ? `/${storeId}/admin`
    : role === "staff"
      ? `/${storeId}/staff`
      : `/${storeId}/teknisi`;
  return basePath;
}