/**
 * Single source of truth for module metadata used across the app.
 *
 * Keep this list in sync with the `module_catalog` table in the database.
 * The runtime `module_catalog` (fetched from Supabase) is still the
 * authoritative source for prices, descriptions and active flag — this file
 * exists only to give the frontend strongly-typed names, display labels and
 * icons for UI rendering and admin screens.
 */
import type { LucideIcon } from "lucide-react";
import {
  DollarSign,
  FileBarChart,
  ImageDown,
  MapPinned,
  UsersRound,
} from "lucide-react";

export type ModuleName =
  | "financeiro"
  | "relatorios"
  | "export_png"
  | "gps"
  | "agenda_compartilhada";

export const ALL_MODULE_NAMES: ModuleName[] = [
  "financeiro",
  "relatorios",
  "export_png",
  "gps",
  "agenda_compartilhada",
];

export const MODULE_LABELS: Record<ModuleName, string> = {
  financeiro: "Financeiro",
  relatorios: "Relatórios",
  export_png: "Exportação PNG",
  gps: "Rotas / GPS",
  agenda_compartilhada: "Agenda Compartilhada",
};

export const MODULE_ICONS: Record<ModuleName, LucideIcon> = {
  financeiro: DollarSign,
  relatorios: FileBarChart,
  export_png: ImageDown,
  gps: MapPinned,
  agenda_compartilhada: UsersRound,
};

/** Safe label lookup that falls back to the raw name for unknown modules. */
export function getModuleLabel(name: string): string {
  return (MODULE_LABELS as Record<string, string>)[name] ?? name;
}
