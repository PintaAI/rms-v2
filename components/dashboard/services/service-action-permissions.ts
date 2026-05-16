export type ServiceActionPermissions = {
  canView: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canUpdateStatus: boolean;
  canPickup: boolean;
  canAssignTechnician: boolean;
  canTakeOverTask: boolean;
  canCreateInvoice: boolean;
  canManageItems: boolean;
  canManageInvoice: boolean;
};

export const defaultServiceActionPermissions: ServiceActionPermissions = {
  canView: true,
  canCreate: true,
  canUpdate: true,
  canDelete: true,
  canUpdateStatus: true,
  canPickup: true,
  canAssignTechnician: true,
  canTakeOverTask: true,
  canCreateInvoice: true,
  canManageItems: true,
  canManageInvoice: true,
};
