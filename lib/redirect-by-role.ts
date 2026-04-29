export function getRoleRedirectPath(tokoId: string, role: string) {
  if (role === "superuser") {
    return "/superuser";
  }

  const basePath = role === "admin"
    ? `/${tokoId}/admin`
    : role === "staff"
      ? `/${tokoId}/staff`
      : `/${tokoId}/teknisi`;
  return basePath;
}