import type { ReactNode } from "react";

export type AdminRoute = "students" | "teachers" | "classes" | "subjects" | "assignments";

export type AdminRecord = Record<string, string>;

export interface AdminField {
  key: string;
  label: string;
  type?: "email" | "number" | "date" | "select";
  options?: string[];
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
}

export interface AdminSection {
  title: string;
  description: string;
  addLabel: string;
  columns: { key: string; label: string }[];
  fields: AdminField[];
  searchKeys: string[];
}

export interface AdminEntityPageProps {
  section: AdminSection;
  currentPeriod: string;
  rows: AdminRecord[];
  visibleRows: AdminRecord[];
  search: string;
  onSearchChange: (value: string) => void;
  onAdd: () => void;
  onDetails: (record: AdminRecord) => void;
  onEdit: (record: AdminRecord) => void;
  onDelete: (record: AdminRecord) => void;
  toolbarFilters?: ReactNode;
  fileActions?: ReactNode;
  footerNote?: string;
  renderCell?: (record: AdminRecord, key: string) => ReactNode;
  isLoading?: boolean;
  isBackendSynced?: boolean;
}
