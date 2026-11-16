import type { ReactNode } from "react";

export type IconName =
  | "brand"
  | "dashboard"
  | "students"
  | "teacher"
  | "classes"
  | "subjects"
  | "tasks"
  | "calendar"
  | "settings"
  | "logout"
  | "menu"
  | "grades";

export interface NavItem {
  label: string;
  icon: IconName;
  href: string;
}

export const adminNavigation: NavItem[] = [
  { label: "Dashboard", icon: "dashboard", href: "#dashboard" },
  { label: "Data Siswa", icon: "students", href: "#students" },
  { label: "Data Guru", icon: "teacher", href: "#teachers" },
  { label: "Data Kelas", icon: "classes", href: "#classes" },
  { label: "Mata Pelajaran", icon: "subjects", href: "#subjects" },
  { label: "Pembagian Tugas Guru", icon: "tasks", href: "#assignments" },
  { label: "Nilai Kelas", icon: "grades", href: "#grades" },
];

export const teacherNavigation: NavItem[] = [
  { label: "Dashboard", icon: "dashboard", href: "#dashboard" },
  { label: "Pengaturan Komponen Nilai", icon: "settings", href: "#grade-settings" },
  { label: "Input dan Kelola Nilai", icon: "grades", href: "#grade-entry" },
  { label: "Profil Saya", icon: "teacher", href: "#profile" },
];

function DashboardIcon({ name }: { name: IconName }) {
  if (name === "brand") {
    return (
      <span className="dashboard-brand-mark" aria-hidden="true">
        R
      </span>
    );
  }

  const paths: Record<Exclude<IconName, "brand">, ReactNode> = {
    dashboard: (
      <>
        <rect x="4" y="4" width="6" height="6" rx="1" />
        <rect x="14" y="4" width="6" height="6" rx="1" />
        <rect x="4" y="14" width="6" height="6" rx="1" />
        <rect x="14" y="14" width="6" height="6" rx="1" />
      </>
    ),
    students: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3.5 19v-1.5a5.5 5.5 0 0 1 11 0V19Zm12-9a2.5 2.5 0 1 0 0-5m1.5 8a4.5 4.5 0 0 1 3.5 4.4V19h-3" />
      </>
    ),
    teacher: (
      <>
        <path d="M12 3 4 7v5c0 4.4 3.4 7.7 8 9 4.6-1.3 8-4.6 8-9V7l-8-4Z" />
        <path d="M9 10h6m-3-3v6" />
      </>
    ),
    classes: (
      <>
        <path d="M4 5.5h16v13H4zM8 9h8m-8 4h8m-8 3h5" />
      </>
    ),
    subjects: (
      <>
        <path d="M5 4.5h14v15H5zM8 8h8m-8 4h8m-8 4h5" />
      </>
    ),
    tasks: (
      <>
        <path d="M8 5h12M8 12h12M8 19h12" />
        <path d="m3.5 5 .8.8L5.8 4m-2.3 8 .8.8 1.5-1.8m-2.3 8 .8.8 1.5-1.8" />
      </>
    ),
    calendar: (
      <>
        <rect x="4" y="5" width="16" height="15" rx="2" />
        <path d="M8 3v4m8-4v4M4 10h16" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a7.8 7.8 0 0 1-1.7 1l-.3 1.8h-2.8l-.3-1.8a7.8 7.8 0 0 1-1.7-1l-1.7.7-1.4-2.4 1.4-1.1a7.3 7.3 0 0 1 0-2l-1.4-1.1 1.4-2.4 1.7.7a7.8 7.8 0 0 1 1.7-1l.3-1.8h2.8l.3 1.8a7.8 7.8 0 0 1 1.7 1l1.7-.7 1.4 2.4-1.4 1.1a7.3 7.3 0 0 1 0 2Z" />
      </>
    ),
    logout: (
      <>
        <path d="M10 5H5v14h5m5-4 4-3-4-3m4 3H9" />
      </>
    ),
    menu: (
      <>
        <path d="M4 6h16M4 12h16M4 18h16" />
      </>
    ),
    grades: (
      <>
        <path d="M4 4h16v16H4zM8 16l2.5-3 2 2 3.5-5" />
      </>
    ),
  };

  return (
    <svg
      aria-hidden="true"
      className="dashboard-icon"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      viewBox="0 0 24 24"
    >
      {paths[name]}
    </svg>
  );
}

export default DashboardIcon;
