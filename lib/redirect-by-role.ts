export function getRoleRedirectPath(tokoId: string, role: string) {
  const basePath = role === "admin"
    ? `/${tokoId}/admin`
    : role === "staff"
      ? `/${tokoId}/staff`
      : `/${tokoId}/teknisi`;
  return basePath;
}