import { FormEvent, useMemo, useState } from "react";
import type { ReactNode } from "react";
import "./TeacherPanel.css";
import DashboardPage from "./DashboardPage";
import GradeEntryPage from "./GradeEntryPage";
import GradeSettingsPage from "./GradeSettingsPage";
import ProfilePage from "./ProfilePage";
import ScoreDropdown from "./ScoreDropdown";
import type { GradeComponent, ScoreMap, TeachingAssignment } from "./types";
import { calculateFinal } from "./utils";

type TeacherRoute =
  | "dashboard"
  | "assignments"
  | "class-detail"
  | "grade-settings"
  | "grade-entry"
  | "profile";

interface TeacherPanelProps {
  route: string;
  displayName: string;
  email: string;
  onNavigate: (route: string) => void;
  onProfileChange: (name: string) => void;
  onUnsavedChange?: (hasUnsavedChanges: boolean) => void;
}

const period = "Semester Ganjil 2026/2027";

const assignments: TeachingAssignment[] = [
  {
    id: "math-vii-a",
    subject: "Matematika",
    className: "VII-A",
    period,
    kkm: 75,
    isHomeroom: true,
    students: [
      { id: "s1", nis: "2026001", name: "Andi Pratama", gender: "L" },
      { id: "s2", nis: "2026002", name: "Budi Santoso", gender: "L" },
      { id: "s7", nis: "2026007", name: "Galih Ramadhan", gender: "L" },
      { id: "s9", nis: "2026009", name: "Intan Permata", gender: "P" },
      { id: "s10", nis: "2026010", name: "Joko Saputra", gender: "L" },
    ],
  },
  {
    id: "math-vii-b",
    subject: "Matematika",
    className: "VII-B",
    period,
    kkm: 75,
    isHomeroom: false,
    students: [
      { id: "s3", nis: "2026003", name: "Citra Lestari", gender: "P" },
      { id: "s5", nis: "2026005", name: "Eka Saputra", gender: "L" },
      { id: "s11", nis: "2026011", name: "Laras Wati", gender: "P" },
      { id: "s12", nis: "2026012", name: "Miko Ardiansyah", gender: "L" },
    ],
  },
  {
    id: "math-viii-a",
    subject: "Matematika",
    className: "VIII-A",
    period,
    kkm: 75,
    isHomeroom: false,
    students: [
      { id: "s4", nis: "2026004", name: "Dina Putri", gender: "P" },
      { id: "s6", nis: "2026006", name: "Fitri Handayani", gender: "P" },
      { id: "s13", nis: "2026013", name: "Nadia Putri", gender: "P" },
      { id: "s14", nis: "2026014", name: "Rafi Firmansyah", gender: "L" },
    ],
  },
];

const initialComponents: GradeComponent[] = [
  { id: "daily", name: "Tugas Harian", weight: "20" },
  { id: "quiz", name: "Ulangan Harian", weight: "25" },
  { id: "midterm", name: "STS", weight: "25" },
  { id: "final", name: "UAS", weight: "30" },
];

const initialScores: ScoreMap = {
  s1: { daily: "88", quiz: "84", midterm: "86", final: "90" },
  s2: { daily: "78", quiz: "82", midterm: "76", final: "80" },
  s7: { daily: "92", quiz: "90", midterm: "88", final: "94" },
  s9: { daily: "70", quiz: "74", midterm: "72", final: "" },
  s10: { daily: "80", quiz: "78", midterm: "", final: "" },
  s3: { daily: "86", quiz: "82", midterm: "84", final: "80" },
  s5: { daily: "72", quiz: "76", midterm: "74", final: "78" },
  s11: { daily: "90", quiz: "88", midterm: "92", final: "90" },
  s12: { daily: "68", quiz: "72", midterm: "", final: "" },
  s4: { daily: "82", quiz: "86", midterm: "84", final: "88" },
  s6: { daily: "94", quiz: "92", midterm: "96", final: "94" },
  s13: { daily: "76", quiz: "80", midterm: "78", final: "" },
  s14: { daily: "88", quiz: "84", midterm: "86", final: "82" },
};

function createComponentId() {
  return `component-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function TeacherPanel({
  route,
  displayName,
  email,
  onNavigate,
  onProfileChange,
  onUnsavedChange,
}: TeacherPanelProps) {
  const [selectedAssignmentId, setSelectedAssignmentId] = useState(assignments[0].id);
  const [selectedSettingsAssignmentId, setSelectedSettingsAssignmentId] = useState(assignments[0].id);
  const [componentsByAssignment, setComponentsByAssignment] = useState<
    Record<string, GradeComponent[]>
  >(() =>
    Object.fromEntries(
      assignments.map((assignment) => [
        assignment.id,
        initialComponents.map((component) => ({ ...component })),
      ]),
    ),
  );
  const [kkmByAssignment, setKkmByAssignment] = useState<Record<string, string>>(
    () => Object.fromEntries(assignments.map((assignment) => [assignment.id, String(assignment.kkm)])),
  );
  const [scores, setScores] = useState(initialScores);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [gradeStatusFilter, setGradeStatusFilter] = useState("Semua status");
  const [profileName, setProfileName] = useState(displayName);
  const [profileEmail, setProfileEmail] = useState(email);

  const currentAssignment =
    assignments.find((assignment) => assignment.id === selectedAssignmentId) ?? assignments[0];
  const components = componentsByAssignment[currentAssignment.id] ?? initialComponents;
  const selectedSettingsAssignment =
    assignments.find((assignment) => assignment.id === selectedSettingsAssignmentId) ?? assignments[0];
  const settingsComponents =
    componentsByAssignment[selectedSettingsAssignment.id] ?? initialComponents;
  const currentKkm = Number(kkmByAssignment[currentAssignment.id] ?? currentAssignment.kkm);
  const settingsKkm = Number(kkmByAssignment[selectedSettingsAssignment.id] ?? selectedSettingsAssignment.kkm);
  const currentRoute = route as TeacherRoute;
  const totalWeight = components.reduce((total, component) => total + (Number(component.weight) || 0), 0);
  const hasValidWeights =
    components.length > 0 &&
    components.every((component) => Number(component.weight) > 0 && Number(component.weight) <= 100) &&
    Math.abs(totalWeight - 100) < 0.0001;
  const settingsTotalWeight = settingsComponents.reduce(
    (total, component) => total + (Number(component.weight) || 0),
    0,
  );
  const settingsHasValidWeights =
    settingsComponents.length > 0 &&
    settingsComponents.every(
      (component) => Number(component.weight) > 0 && Number(component.weight) <= 100,
    ) &&
    Math.abs(settingsTotalWeight - 100) < 0.0001;
  const filteredStudents = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("id");
    return currentAssignment.students.filter(
      (student) =>
        !query ||
        student.name.toLocaleLowerCase("id").includes(query) ||
        student.nis.includes(query),
    );
  }, [currentAssignment, search]);
  const completionCount = currentAssignment.students.filter(
    (student) => calculateFinal(student.id, components, scores) !== null,
  ).length;
  const finalScores = currentAssignment.students
    .map((student) => calculateFinal(student.id, components, scores))
    .filter((score): score is number => score !== null);
  const average = finalScores.length
    ? Math.round((finalScores.reduce((total, score) => total + score, 0) / finalScores.length) * 100) / 100
    : null;
  function navigate(nextRoute: string) {
    setSearch("");
    setNotice("");
    onNavigate(nextRoute);
  }

  function openAssignment(assignmentId: string, nextRoute: string) {
    setSelectedAssignmentId(assignmentId);
    setSearch("");
    setNotice("");
    onNavigate(nextRoute);
  }

  function updateScore(studentId: string, componentId: string, value: string) {
    if (value !== "" && (!Number.isFinite(Number(value)) || Number(value) < 0 || Number(value) > 100)) {
      return;
    }
    onUnsavedChange?.(true);
    setScores((current) => ({
      ...current,
      [studentId]: { ...current[studentId], [componentId]: value },
    }));
  }

  function applySettingsComponents(nextComponents: GradeComponent[]) {
    onUnsavedChange?.(true);
    const targetIds =
      selectedSettingsAssignmentId === "all"
        ? assignments.map((assignment) => assignment.id)
        : [selectedSettingsAssignment.id];
    setComponentsByAssignment((current) =>
      targetIds.reduce(
        (updated, assignmentId) => ({
          ...updated,
          [assignmentId]: nextComponents.map((component) => ({ ...component })),
        }),
        current,
      ),
    );
  }

  function applySettingsKkm(value: string) {
    onUnsavedChange?.(true);
    const targetIds =
      selectedSettingsAssignmentId === "all"
        ? assignments.map((assignment) => assignment.id)
        : [selectedSettingsAssignment.id];
    setKkmByAssignment((current) =>
      targetIds.reduce((updated, assignmentId) => ({ ...updated, [assignmentId]: value }), current),
    );
  }

  function updateComponent(componentId: string, key: "name" | "weight", value: string) {
    applySettingsComponents(
      settingsComponents.map((component) =>
        component.id === componentId ? { ...component, [key]: value } : component,
      ),
    );
  }

  function addComponent() {
    applySettingsComponents([
      ...settingsComponents,
      { id: createComponentId(), name: "", weight: "0" },
    ]);
  }

  function removeComponent(componentId: string) {
    if (settingsComponents.length === 1) {
      setNotice("Pengajaran harus memiliki minimal satu komponen penilaian.");
      return;
    }
    applySettingsComponents(
      settingsComponents.filter((component) => component.id !== componentId),
    );
  }

  function saveComponents(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (settingsComponents.some((component) => !component.name.trim())) {
      setNotice("Nama setiap komponen harus diisi.");
      return;
    }
    const settingsWeight = settingsComponents.reduce(
      (total, component) => total + (Number(component.weight) || 0),
      0,
    );
    const validSettingsWeights =
      settingsComponents.length > 0 &&
      settingsComponents.every(
        (component) => Number(component.weight) > 0 && Number(component.weight) <= 100,
      ) &&
      Math.abs(settingsWeight - 100) < 0.0001;
    if (!validSettingsWeights) {
      setNotice("Total bobot harus tepat 100% dan setiap bobot lebih dari 0%.");
      return;
    }
    if (selectedSettingsAssignmentId === "all") {
      setComponentsByAssignment(
        Object.fromEntries(
          assignments.map((assignment) => [
            assignment.id,
            settingsComponents.map((component) => ({ ...component })),
          ]),
        ),
      );
    }
    onUnsavedChange?.(false);
    setNotice("Komponen penilaian berhasil disimpan pada sesi demo ini.");
  }

  function saveKkm() {
    onUnsavedChange?.(false);
    setNotice("KKM disimpan pada sesi demo ini.");
  }

  const titleByRoute: Record<TeacherRoute, string> = {
    dashboard: "Dashboard",
    assignments: "Pengajaran Saya",
    "class-detail": "Detail Kelas",
    "grade-settings": "Pengaturan Komponen Nilai",
    "grade-entry": "Input dan Kelola Nilai",
    profile: "Profil Saya",
  };
  const title = titleByRoute[currentRoute] ?? "Dashboard";

  function pageHeading(description: string) {
    return (
      <header className="teacher-page-heading">
        <div>
          <span className="teacher-eyebrow">SIPENA · GURU</span>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        <label className="teacher-page-period">
          <span>Periode Akademik</span>
          <select aria-label="Periode akademik aktif" disabled value={currentAssignment.period}>
            <option value={currentAssignment.period}>{currentAssignment.period} (Aktif)</option>
          </select>
        </label>
      </header>
    );
  }

  function assignmentSelector({
    selectedId = currentAssignment.id,
    onSelect = setSelectedAssignmentId,
    includeAll = false,
  }: {
    selectedId?: string;
    onSelect?: (assignmentId: string) => void;
    includeAll?: boolean;
  } = {}) {
    return (
      <label className="teacher-select-label">
        <span>Pilih pengajaran</span>
        <select
          onChange={(event) => {
            onSelect(event.target.value);
            setNotice("");
          }}
          value={selectedId}
        >
          {includeAll && <option value="all">Semua Pengajaran</option>}
          {assignments.map((assignment) => (
            <option key={assignment.id} value={assignment.id}>
              {assignment.subject} · {assignment.className}
            </option>
          ))}
        </select>
      </label>
    );
  }

  function studentTable() {
    const visibleStudents = filteredStudents.filter((student) => {
      const isComplete = calculateFinal(student.id, components, scores) !== null;
      return (
        gradeStatusFilter === "Semua status" ||
        (gradeStatusFilter === "Lengkap" ? isComplete : !isComplete)
      );
    });
    return (
      <table className="teacher-table">
        <thead>
          <tr>
            <th scope="col">No.</th>
            <th scope="col">Nama Siswa</th>
            {components.map((component) => (
              <th key={component.id} scope="col">
                {component.name}
                <small>{component.weight}%</small>
              </th>
            ))}
            <th scope="col">Nilai Akhir</th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {visibleStudents.map((student) => {
            const finalScore = calculateFinal(student.id, components, scores);
            return (
              <tr key={student.id}>
                <td>{student.nis.slice(-3)}</td>
                <td className="teacher-student-name">{student.name}</td>
                {components.map((component) => (
                  <td key={component.id}>
                    <ScoreDropdown
                      componentName={component.name}
                      onSave={(value) => updateScore(student.id, component.id, value)}
                      studentName={student.name}
                      value={scores[student.id]?.[component.id] ?? ""}
                    />
                  </td>
                ))}
                <td className="teacher-final-score">{finalScore?.toFixed(2) ?? "—"}</td>
                <td><span className={`teacher-pass-chip${finalScore !== null && finalScore >= Number(kkmByAssignment[currentAssignment.id] ?? currentAssignment.kkm) ? " pass" : ""}`}>{finalScore === null ? "Belum lengkap" : "Lengkap"}</span></td>
              </tr>
            );
          })}
          {visibleStudents.length === 0 && (
            <tr>
              <td className="teacher-empty" colSpan={components.length + 4}>
                Siswa tidak ditemukan.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    );
  }

  function assignmentPage() {
    return (
      <>
        {pageHeading("Daftar kelas dan mata pelajaran yang Anda ampu.")}
        <section className="teacher-assignment-grid teacher-assignment-list">
          {assignments.map((assignment) => {
            const completed = assignment.students.filter(
              (student) => calculateFinal(student.id, components, scores) !== null,
            ).length;
            return (
              <article className="teacher-assignment-card" key={assignment.id}>
                <div className="teacher-assignment-title">
                  <span className="teacher-assignment-icon" aria-hidden="true">M</span>
                  <div><h2>{assignment.subject}</h2><span>Kelas {assignment.className}</span></div>
                </div>
                <dl>
                  <div><dt>Periode</dt><dd>{assignment.period}</dd></div>
                  <div><dt>Jumlah siswa</dt><dd>{assignment.students.length} siswa</dd></div>
                  <div><dt>KKM</dt><dd>{kkmByAssignment[assignment.id] ?? assignment.kkm}</dd></div>
                </dl>
                <div className="teacher-progress-label"><span>Progres nilai</span><strong>{completed}/{assignment.students.length}</strong></div>
                <div className="teacher-progress"><span style={{ width: `${(completed / assignment.students.length) * 100}%` }} /></div>
                <button onClick={() => openAssignment(assignment.id, "class-detail")} type="button">Detail kelas <span aria-hidden="true">→</span></button>
              </article>
            );
          })}
        </section>
      </>
    );
  }

  function classDetailPage() {
    return (
      <>
        {pageHeading("Ringkasan kelas dan akses penilaian.")}
        <section className="teacher-card teacher-class-summary">
          <div className="teacher-card-heading">
            <div><span className="teacher-eyebrow">DETAIL PENGAJARAN</span><h2>{currentAssignment.subject} · Kelas {currentAssignment.className}</h2><p>{currentAssignment.period}</p>{currentAssignment.isHomeroom && <span className="teacher-status-chip">Wali kelas</span>}</div>
            {assignmentSelector()}
          </div>
          <div className="teacher-class-metrics">
            <div><span>Jumlah siswa</span><strong>{currentAssignment.students.length}</strong></div>
            <div><span>Nilai lengkap</span><strong>{completionCount}/{currentAssignment.students.length}</strong></div>
            <div><span>Rata-rata kelas</span><strong>{average?.toFixed(2) ?? "—"}</strong></div>
            <div><span>KKM</span><strong>{currentKkm}</strong></div>
          </div>
          <div className="teacher-button-row">
            <button className="teacher-primary-button" onClick={() => navigate("grade-entry")} type="button">Input nilai</button>
            <button className="teacher-secondary-button" onClick={() => navigate("grade-settings")} type="button">Atur komponen</button>
          </div>
        </section>
      </>
    );
  }

  function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const nextEmail = String(formData.get("email") ?? "").trim();
    const newPassword = String(formData.get("newPassword") ?? "");
    const confirmation = String(formData.get("confirmation") ?? "");
    if (newPassword && newPassword.length < 8) {
      setNotice("Kata sandi baru minimal 8 karakter.");
      return;
    }
    if (newPassword !== confirmation) {
      setNotice("Konfirmasi kata sandi tidak cocok.");
      return;
    }
    setProfileName(name);
    setProfileEmail(nextEmail);
    onProfileChange(name);
    setNotice("Profil diperbarui pada sesi demo ini.");
  }

  let content: ReactNode;
  switch (currentRoute) {
    case "assignments":
      content = assignmentPage();
      break;
    case "class-detail":
      content = classDetailPage();
      break;
    case "grade-settings": {
      const showAll = selectedSettingsAssignmentId === "all";
      const validKkm = Number.isFinite(settingsKkm) && settingsKkm >= 0 && settingsKkm <= 100;
      content = (
        <GradeSettingsPage
          assignmentCount={assignments.length}
          assignmentSelector={assignmentSelector({
            selectedId: selectedSettingsAssignmentId,
            includeAll: true,
            onSelect: (assignmentId) => {
              setSelectedSettingsAssignmentId(assignmentId);
              setSelectedAssignmentId(assignmentId === "all" ? assignments[0].id : assignmentId);
            },
          })}
          heading={pageHeading("Atur komponen dan bobot penilaian untuk kelas yang Anda ampu.")}
          kkmValue={kkmByAssignment[selectedSettingsAssignment.id] ?? String(selectedSettingsAssignment.kkm)}
          onAddComponent={addComponent}
          onComponentChange={updateComponent}
          onKkmChange={applySettingsKkm}
          onRemoveComponent={removeComponent}
          onSaveKkm={saveKkm}
          onSubmitComponents={saveComponents}
          selectedAssignment={selectedSettingsAssignment}
          settingsComponents={settingsComponents}
          settingsHasValidWeights={settingsHasValidWeights}
          settingsTotalWeight={settingsTotalWeight}
          showAll={showAll}
          validKkm={validKkm}
        />
      );
      break;
    }
    case "grade-entry":
      content = (
        <GradeEntryPage
          assignment={currentAssignment}
          assignmentSelector={assignmentSelector()}
          completionCount={completionCount}
          gradeStatusFilter={gradeStatusFilter}
          hasValidWeights={hasValidWeights}
          heading={pageHeading("Kelola kelas, komponen penilaian, dan nilai siswa.")}
          onSaveGrades={() => {
            onUnsavedChange?.(false);
            setNotice("Nilai berhasil disimpan pada sesi demo ini.");
          }}
          onSearchChange={setSearch}
          onStatusFilterChange={setGradeStatusFilter}
          search={search}
          studentTable={studentTable()}
        />
      );
      break;
    case "profile":
      content = (
        <ProfilePage
          heading={pageHeading("Kelola informasi kontak dan kata sandi akun Anda.")}
          onSubmit={saveProfile}
          profileEmail={profileEmail}
          profileName={profileName}
        />
      );
      break;
    default:
      content = (
        <DashboardPage
          assignments={assignments}
          completionCount={completionCount}
          componentsByAssignment={componentsByAssignment}
          currentAssignment={currentAssignment}
          heading={pageHeading(`Ringkasan pengajaran ${currentAssignment.subject}`)}
          initialComponents={initialComponents}
          kkmByAssignment={kkmByAssignment}
          onNavigate={navigate}
          onOpenAssignment={openAssignment}
          scores={scores}
        />
      );
  }

  return (
    <div className="teacher-panel">
      {notice && <p className="teacher-notice" role="status">{notice}</p>}
      {content}
      <p className="teacher-demo-note" role="note">Data penilaian ini adalah data contoh pada browser dan belum tersinkron ke backend.</p>
    </div>
  );
}

export default TeacherPanel;
