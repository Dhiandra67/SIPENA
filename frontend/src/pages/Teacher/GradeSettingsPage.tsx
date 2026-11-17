import type { FormEvent, ReactNode } from "react";
import type { GradeComponent, TeachingAssignment } from "./types";

interface GradeSettingsPageProps {
  heading: ReactNode;
  assignmentSelector: ReactNode;
  assignmentList: TeachingAssignment[];
  selectedSettingsAssignmentId: string;
  selectedSettingsAssignment: TeachingAssignment;
  settingsComponents: GradeComponent[];
  settingsTotalWeight: number;
  settingsHasValidWeights: boolean;
  hasUnsavedComponents: boolean;
  hasUnsavedKkm: boolean;
  kkmValue: string | number;
  onKkmChange: (value: string) => void;
  onSaveKkm: () => void;
  onAddComponent: () => void;
  onUpdateComponent: (componentId: string, key: "name" | "weight", value: string) => void;
  onRemoveComponent: (componentId: string) => void;
  onSaveComponents: (event: FormEvent<HTMLFormElement>) => void;
}

function GradeSettingsPage({
  heading,
  assignmentSelector,
  assignmentList,
  selectedSettingsAssignmentId,
  selectedSettingsAssignment,
  settingsComponents,
  settingsTotalWeight,
  settingsHasValidWeights,
  hasUnsavedComponents,
  hasUnsavedKkm,
  kkmValue,
  onKkmChange,
  onSaveKkm,
  onAddComponent,
  onUpdateComponent,
  onRemoveComponent,
  onSaveComponents,
}: GradeSettingsPageProps) {
  const showAll = selectedSettingsAssignmentId === "all";
  const isSettingsLocked = showAll
    ? assignmentList.some((assignment) => Boolean(assignment.isLocked))
    : Boolean(selectedSettingsAssignment.isLocked);

  return (
    <>
      {heading}
      <section className="teacher-card">
        <div className="teacher-card-heading">
          <div>
            <h2>Pengajaran</h2>
          </div>
          {assignmentSelector}
        </div>
        <div className="teacher-assignment-summary">
          <strong>
            {showAll
              ? `Semua pengajaran · ${assignmentList.length} kelas`
              : `${selectedSettingsAssignment.subject} · ${selectedSettingsAssignment.className}`}
          </strong>
          <span>{selectedSettingsAssignment.period}</span>
          <span>
            {showAll
              ? String(kkmValue).trim()
                ? `KKM ${kkmValue}`
                : "KKM berbeda"
              : `KKM ${selectedSettingsAssignment.kkm}`}
          </span>
        </div>
      </section>

      {isSettingsLocked && (
        <p className="teacher-inline-warning" role="alert">
          Pengaturan dikunci oleh Admin Sekolah.
        </p>
      )}
      {hasUnsavedComponents && (
        <p className="teacher-inline-warning" role="status">
          Komponen belum disimpan. Klik <strong>Simpan komponen</strong>.
        </p>
      )}
      {hasUnsavedKkm && (
        <p className="teacher-inline-warning" role="status">
          KKM belum disimpan. Klik <strong>Simpan KKM</strong>.
        </p>
      )}

      <section className="teacher-card teacher-kkm-card">
        <div className="teacher-card-heading">
          <div>
            <h2>Pengaturan KKM</h2>
            {showAll && <p>Berlaku untuk semua pengajaran aktif.</p>}
          </div>
        </div>
        <div className="teacher-table-scroll">
          <table className="teacher-table teacher-kkm-table">
            <thead>
              <tr>
                <th scope="col">Mata Pelajaran</th>
                <th scope="col">Kelas</th>
                <th scope="col">Periode</th>
                <th scope="col">KKM</th>
                <th scope="col">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {showAll ? (
                <tr>
                  <td data-label="Mata Pelajaran">Semua pengajaran</td>
                  <td data-label="Kelas">{assignmentList.length} kelas</td>
                  <td data-label="Periode">{selectedSettingsAssignment.period}</td>
                  <td data-label="KKM">
                    <input
                      aria-label="KKM Semua Pengajaran"
                      className="teacher-kkm-input"
                      disabled={isSettingsLocked}
                      max={100}
                      min={0}
                      onChange={(event) => onKkmChange(event.target.value)}
                      placeholder="KKM semua kelas"
                      step="0.01"
                      type="number"
                      value={kkmValue}
                    />
                  </td>
                  <td data-label="Aksi">
                    <button
                      className="teacher-secondary-button"
                      disabled={isSettingsLocked}
                      onClick={onSaveKkm}
                      type="button"
                    >
                      Simpan KKM
                    </button>
                  </td>
                </tr>
              ) : (
                <tr>
                  <td data-label="Mata Pelajaran">{selectedSettingsAssignment.subject}</td>
                  <td data-label="Kelas">{selectedSettingsAssignment.className}</td>
                  <td data-label="Periode">{selectedSettingsAssignment.period}</td>
                  <td data-label="KKM">
                    <input
                      aria-label={`KKM ${selectedSettingsAssignment.subject} ${selectedSettingsAssignment.className}`}
                      className="teacher-kkm-input"
                      disabled={isSettingsLocked}
                      max={100}
                      min={0}
                      onChange={(event) => onKkmChange(event.target.value)}
                      step="0.01"
                      type="number"
                      value={kkmValue}
                    />
                  </td>
                  <td data-label="Aksi">
                    <button
                      className="teacher-secondary-button"
                      disabled={isSettingsLocked}
                      onClick={onSaveKkm}
                      type="button"
                    >
                      Simpan KKM
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <form className="teacher-card teacher-components-form" onSubmit={onSaveComponents}>
        <div className="teacher-card-heading">
          <div>
            <h2>Komponen Nilai</h2>
            {showAll && <p>Berlaku untuk semua pengajaran.</p>}
          </div>
          <button
            className="teacher-secondary-button"
            disabled={isSettingsLocked}
            onClick={onAddComponent}
            type="button"
          >
            + Tambah komponen
          </button>
        </div>
        <div className="teacher-component-list">
          {settingsComponents.map((component, index) => (
            <div className="teacher-component-row" key={component.id}>
              <span className="teacher-component-index">
                {String(index + 1).padStart(2, "0")}
              </span>
              <label>
                <span>Nama komponen</span>
                <input
                  disabled={isSettingsLocked}
                  onChange={(event) =>
                    onUpdateComponent(component.id, "name", event.target.value)
                  }
                  required
                  value={component.name}
                />
              </label>
              <label className="teacher-weight-field">
                <span>Bobot (%)</span>
                <input
                  disabled={isSettingsLocked}
                  max={100}
                  min={0.01}
                  onChange={(event) =>
                    onUpdateComponent(component.id, "weight", event.target.value)
                  }
                  required
                  step="0.01"
                  type="number"
                  value={component.weight}
                />
              </label>
              <button
                aria-label={`Hapus ${component.name || "komponen"}`}
                className="teacher-remove-button"
                disabled={isSettingsLocked}
                onClick={() => onRemoveComponent(component.id)}
                type="button"
              >
                Hapus
              </button>
            </div>
          ))}
        </div>
        <div
          className={`teacher-weight-summary${settingsHasValidWeights ? " valid" : " invalid"}`}
        >
          <div>
            <span>Total bobot</span>
            <strong>{settingsTotalWeight.toFixed(2)}%</strong>
          </div>
          <div className="teacher-weight-track">
            <span style={{ width: `${Math.min(settingsTotalWeight, 100)}%` }} />
          </div>
          <small>
            {settingsHasValidWeights
              ? "Bobot tepat 100%."
              : "Total bobot harus 100% sebelum disimpan."}
          </small>
        </div>
        <div className="teacher-form-actions">
          <button
            className="teacher-primary-button"
            disabled={!settingsHasValidWeights || isSettingsLocked}
            type="submit"
          >
            Simpan komponen
          </button>
        </div>
      </form>
    </>
  );
}

export default GradeSettingsPage;
