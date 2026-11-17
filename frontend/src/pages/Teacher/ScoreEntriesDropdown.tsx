import { useEffect, useRef, useState, type FormEvent } from "react";

interface ScoreEntriesDropdownProps {
  componentName: string;
  studentName: string;
  values: string[];
  disabled?: boolean;
  isOpen: boolean;
  shouldFocus: boolean;
  onToggle: () => void;
  onSave: (values: string[]) => void;
}

function formatAverage(values: string[]) {
  if (values.length === 0) return "—";
  const average = values.reduce((total, value) => total + Number(value), 0) / values.length;
  return average.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function ScoreEntriesDropdown({
  componentName,
  studentName,
  values,
  disabled = false,
  isOpen,
  shouldFocus,
  onToggle,
  onSave,
}: ScoreEntriesDropdownProps) {
  const [draft, setDraft] = useState("");
  const scoreInputRef = useRef<HTMLInputElement>(null);
  const parsedDraft = Number(draft);
  const canAdd =
    draft !== "" && Number.isFinite(parsedDraft) && parsedDraft >= 0 && parsedDraft <= 100;

  useEffect(() => {
    if (isOpen && shouldFocus) {
      scoreInputRef.current?.focus();
    }
  }, [isOpen, shouldFocus]);

  function addEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canAdd) return;
    onSave([...values, String(parsedDraft)]);
    setDraft("");
    scoreInputRef.current?.focus();
  }

  function removeEntry(indexToRemove: number) {
    onSave(values.filter((_, index) => index !== indexToRemove));
  }

  return (
    <details className="teacher-score-entry-dropdown" data-score-entry-root open={isOpen}>
      <summary
        aria-label={`${componentName} ${studentName}: rata-rata ${formatAverage(values)}`}
        className="teacher-score-entry-trigger"
        onClick={(event) => {
          event.preventDefault();
          onToggle();
        }}
      >
        <span>{formatAverage(values)}</span>
        <span aria-hidden="true">{isOpen ? "−" : "+"}</span>
      </summary>
      {isOpen && (
        <div
          className="teacher-score-entry-editor"
          aria-label={`${componentName} ${studentName}`}
          role="group"
        >
          {values.length > 0 ? (
            <ul className="teacher-score-entry-list">
              {values.map((value, index) => (
                <li key={`${index}-${value}`}>
                  <div>
                    <span>Nilai {index + 1}</span>
                    <strong>
                      {Number(value).toLocaleString("id-ID", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </strong>
                  </div>
                  <button
                    aria-label={`Hapus nilai ${index + 1} ${componentName} ${studentName}`}
                    disabled={disabled}
                    onClick={() => removeEntry(index)}
                    type="button"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <small>Belum ada nilai.</small>
          )}
          <form onSubmit={addEntry}>
            <label>
              <span className="visually-hidden">
                Nilai baru {componentName} untuk {studentName}
              </span>
              <input
                aria-label={`Nilai baru ${componentName} untuk ${studentName}`}
                disabled={disabled}
                max={100}
                min={0}
                onChange={(event) => setDraft(event.target.value)}
                ref={scoreInputRef}
                step="0.01"
                type="number"
                value={draft}
              />
            </label>
            <button
              className="teacher-secondary-button"
              disabled={disabled || !canAdd}
              type="submit"
            >
              Tambah
            </button>
          </form>
        </div>
      )}
    </details>
  );
}

export default ScoreEntriesDropdown;
