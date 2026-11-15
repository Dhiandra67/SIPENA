import type { FormEvent, ReactNode } from "react";
import type { GradeComponent, TeachingAssignment } from "./types";

interface GradeSettingsPageProps {
  heading: ReactNode;
  assignmentSelector: ReactNode;
  showAll: boolean;
  assignmentCount: number;
  selectedAssignment: TeachingAssignment;
  kkmValue: string;
  validKkm: boolean;
  settingsComponents: GradeComponent[];
  settingsTotalWeight: number;
  settingsHasValidWeights: boolean;
  onKkmChange: (value: string) => void;
  onSaveKkm: () => void;
  onSubmitComponents: (event: FormEvent<HTMLFormElement>) => void;
  onComponentChange: (componentId: string, key: "name" | "weight", value: string) => void;
  onRemoveComponent: (componentId: string) => void;
  onAddComponent: () => void;
}

function GradeSettingsPage({
  heading,
  assignmentSelector,
  showAll,
  assignmentCount,
  selectedAssignment,
  kkmValue,
  validKkm,
  settingsComponents,
  settingsTotalWeight,
  settingsHasValidWeights,
  onKkmChange,
  onSaveKkm,
  onSubmitComponents,
  onComponentChange,
  onRemoveComponent,
  onAddComponent,
}: GradeSettingsPageProps) {
  return (
    <>
      {heading}
      <section className="teacher-card">
        <div className="teacher-settings-assignment">
          {assignmentSelector}
          <strong>{showAll ? `Semua pengajaran · ${assignmentCount} kelas` : `${selectedAssignment.subject} · Kelas ${selectedAssignment.className}`}</strong>
          <span>{selectedAssignment.period}</span>
        </div>
      </section>
      <section className="teacher-card teacher-kkm-card">
        <div>
          <h2>KKM</h2>
          <p>Kriteria Ketuntasan Minimal</p>
        </div>
        {showAll ? (
          <span className="teacher-settings-all-note">Nilai KKM diatur per pengajaran.</span>
        ) : (
          <div className="teacher-kkm-controls">
            <label className="teacher-kkm-input">
              <span className="visually-hidden">Nilai KKM</span>
              <input
                aria-label="Nilai KKM"
                max={100}
                min={0}
                onChange={(event) => onKkmChange(event.target.value)}
                step="0.01"
                type="number"
                value={kkmValue}
              />
            </label>
            <button
              className="teacher-primary-button"
              disabled={!validKkm}
              onClick={onSaveKkm}
              type="button"
            >
              Simpan KKM
            </button>
          </div>
        )}
      </section>
      <form className="teacher-card teacher-components-form" onSubmit={onSubmitComponents}>
        <div className="teacher-card-heading">
          <div><h2>Komponen Penilaian</h2><p>Jumlah seluruh bobot komponen harus 100%{showAll ? " pada semua pengajaran." : "."}</p></div>
          <strong className={`teacher-total-weight${settingsHasValidWeights ? " valid" : ""}`}>{settingsTotalWeight}% / 100%</strong>
        </div>
        <div className="teacher-component-table-scroll">
          <table className="teacher-component-table">
            <thead><tr><th scope="col">Komponen</th><th scope="col">Persentase</th><th scope="col">Aksi</th></tr></thead>
            <tbody>
              {settingsComponents.map((component) => (
                <tr key={component.id}>
                  <td><input aria-label={`Nama komponen ${component.name || "baru"}`} onChange={(event) => onComponentChange(component.id, "name", event.target.value)} required value={component.name} /></td>
                  <td><label className="teacher-component-percentage"><input aria-label={`Persentase ${component.name || "komponen"}`} max={100} min={0.01} onChange={(event) => onComponentChange(component.id, "weight", event.target.value)} required step="0.01" type="number" value={component.weight} /><span>%</span></label></td>
                  <td><button aria-label={`Hapus ${component.name || "komponen"}`} className="teacher-remove-button" onClick={() => onRemoveComponent(component.id)} type="button">Hapus</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="teacher-component-footer">
          <button className="teacher-secondary-button" onClick={onAddComponent} type="button">+ Tambah komponen</button>
          <button className="teacher-primary-button" disabled={!settingsHasValidWeights} type="submit">Simpan komponen</button>
        </div>
        <div className={`teacher-weight-summary${settingsHasValidWeights ? " valid" : " invalid"}`}>
          <div><span>Total bobot</span><strong>{settingsTotalWeight.toFixed(2)}%</strong></div>
          <div className="teacher-weight-track"><span style={{ width: `${Math.min(settingsTotalWeight, 100)}%` }} /></div>
          <small>{settingsHasValidWeights ? "Bobot sudah tepat 100%." : "Sesuaikan bobot hingga tepat 100% sebelum menyimpan."}</small>
        </div>
      </form>
    </>
  );
}

export default GradeSettingsPage;
