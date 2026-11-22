import type { FormEvent } from "react";
import type { AdminRecord, AdminSection } from "./types";

interface AdminFormDialogProps {
  dialogMode: "create" | "edit" | "details";
  section: AdminSection;
  selectedRecord: AdminRecord | null;
  formError: string;
  getOptions: (fieldKey: string) => string[];
  onClose: () => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
}

function AdminFormDialog({
  dialogMode,
  section,
  selectedRecord,
  formError,
  getOptions,
  onClose,
  onSave,
}: AdminFormDialogProps) {
  return (
    <div
      className="admin-dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section aria-labelledby="admin-dialog-title" aria-modal="true" className="admin-dialog" role="dialog">
        <header className="admin-dialog-heading">
          <div>
            <span className="admin-eyebrow">{section.title}</span>
            <h2 id="admin-dialog-title">
              {dialogMode === "details"
                ? "Detail data"
                : dialogMode === "edit"
                  ? "Edit data"
                  : section.addLabel}
            </h2>
          </div>
          <button aria-label="Tutup dialog" onClick={onClose} type="button">
            ×
          </button>
        </header>
        {dialogMode === "details" ? (
          <dl className="admin-detail-list">
            {section.fields.map((field) => (
              <div key={field.key}>
                <dt>{field.label}</dt>
                <dd>{selectedRecord?.[field.key] || "—"}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <form className="admin-form" onSubmit={onSave}>
            {section.fields.map((field) => (
              <label key={field.key}>
                {field.label}
                {field.type === "multiselect" ? (
                  <select
                    aria-label={field.label}
                    defaultValue={(selectedRecord?.[field.key] ?? "").split(" | ").filter(Boolean)}
                    multiple
                    name={field.key}
                    required={field.required !== false}
                    size={Math.min((field.options ?? getOptions(field.key)).length, 5)}
                  >
                    {(field.options ?? getOptions(field.key)).map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : field.type === "select" ? (
                  <select defaultValue={selectedRecord?.[field.key] ?? ""} name={field.key} required>
                    <option disabled value="">
                      Pilih {field.label.toLocaleLowerCase("id")}
                    </option>
                    {(field.options ?? getOptions(field.key)).map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    defaultValue={selectedRecord?.[field.key] ?? ""}
                    name={field.key}
                    required
                    type={field.type ?? "text"}
                  />
                )}
              </label>
            ))}
            {formError && (
              <p className="admin-form-error" role="alert">
                {formError}
              </p>
            )}
            <div className="admin-dialog-actions">
              <button className="admin-secondary-button" onClick={onClose} type="button">
                Batal
              </button>
              <button className="admin-primary-button" type="submit">
                Simpan
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}

export default AdminFormDialog;
