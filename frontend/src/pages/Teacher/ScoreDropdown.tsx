import { useEffect, useState, type FormEvent } from "react";

interface ScoreDropdownProps {
  componentName: string;
  studentName: string;
  value: string;
  onSave: (value: string) => void;
}

function ScoreDropdown({ componentName, studentName, value, onSave }: ScoreDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const isValid = draft === "" || (Number.isFinite(Number(draft)) && Number(draft) >= 0 && Number(draft) <= 100);
  const displayValue = value === ""
    ? "—"
    : Number(value).toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  useEffect(() => {
    setDraft(value);
  }, [value]);

  function saveScore(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isValid) return;
    onSave(draft);
    setIsOpen(false);
  }

  return (
    <details className="teacher-score-dropdown" open={isOpen}>
      <summary
        aria-label={`${componentName} ${studentName}: ${displayValue}`}
        onClick={(event) => {
          event.preventDefault();
          setIsOpen((open) => !open);
        }}
      >
        <span>{displayValue}</span>
      </summary>
      <form className="teacher-score-dropdown-editor" onSubmit={saveScore}>
        <label>
          <span className="visually-hidden">Nilai {componentName} untuk {studentName}</span>
          <input
            aria-label={`Nilai ${componentName} untuk ${studentName}`}
            max={100}
            min={0}
            onChange={(event) => setDraft(event.target.value)}
            step="0.01"
            type="number"
            value={draft}
          />
        </label>
        <small>0–100</small>
        <button className="teacher-secondary-button" disabled={!isValid} type="submit">+ Tambah nilai</button>
      </form>
    </details>
  );
}

export default ScoreDropdown;
