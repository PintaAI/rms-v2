export type Role = "admin" | "staff" | "technician";

export interface RoleTone {
  card: string;
  rail: string;
  label: string;
}

export const roleToneClasses = {
  admin: {
    card: "border-primary/20 bg-gradient-to-br from-primary/[0.035] via-background to-background",
    rail: "from-primary/40 to-primary/10",
    label: "text-primary",
  },
  staff: {
    card: "border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.04] via-background to-background",
    rail: "from-emerald-500/40 to-emerald-500/10",
    label: "text-emerald-700 dark:text-emerald-400",
  },
  technician: {
    card: "border-sky-500/20 bg-gradient-to-br from-sky-500/[0.04] via-background to-background",
    rail: "from-sky-500/40 to-sky-500/10",
    label: "text-sky-700 dark:text-sky-400",
  },
} satisfies Record<Role, RoleTone>;
