# Permission Refactor Summary

This document explains the refactor direction in simple terms.

## Main Goal

- Make access control more flexible.
- Let admins control what each staff member and technician can do.
- Let staff or technicians receive admin-like access when an admin grants it.
- Reuse the same pages and components across admins, staff, and technicians.
- Decide user access from permissions, not only from role.

## What Will Change

- Role will no longer be the main access decision.
- `admin`, `staff`, and `technician` will become starting permission templates.
- Buttons, pages, and actions will be checked with permissions.
- Similar pages will be merged to reduce duplication.
- Routes will move toward shared module routes early in the refactor.
- Example target route: `/{tokoid}/inventory`, not only `/{tokoid}/admin/inventory`.
- Server actions will check permissions, not only roles.

## What Will Not Change

- Users will still have a role: `admin`, `staff`, or `technician`.
- Tokos will still have a plan: `free`, `premium`, or `enterprise`.
- Features can still be locked by plan.
- Admins can still disable features for a toko.
- Users must still belong to a toko to access it.
- Permissions cannot unlock features that the plan does not include.
- Permissions cannot unlock features that are disabled for the toko.

## What Will Be Added

- A new permission list.
- Default permissions for each role.
- Custom permissions for specific users.
- Admin UI for managing staff and technician permissions.
- New helpers like `can()` and `assertPermission()`.
- New data storage for user permissions per toko.

## Example Permissions

- `inventory.view`
- `inventory.create`
- `inventory.update`
- `inventory.delete`
- `retail.sell`
- `retail.viewHistory`
- `service.assignTechnician`
- `analytics.view`
- `karyawan.manage`

## Simple Examples

- A normal staff member can view inventory.
- An admin can grant that staff member permission to create inventory items.
- A normal technician can update service status.
- An admin can grant that technician permission to access inventory.
- A staff member can receive analytics access if the toko plan supports it.
- A staff member still cannot access premium features when the toko is on the free plan.

## Important Rules

- Permissions only work when the feature is available for the toko.
- The toko plan must still support the feature.
- Features disabled for the toko still cannot be used.
- Only admins can manage permissions in V1.
- Staff and technicians cannot grant permissions to other users in V1.
- Important checks must always happen on the server.

## Desired End State

- Access control is cleaner.
- Admins can control each employee's permissions.
- Pages and components can be reused.
- The codebase has less duplication.
- Staff and technicians can have more flexible access.
- The system stays safe because plan, toko, and permission checks all still apply.
