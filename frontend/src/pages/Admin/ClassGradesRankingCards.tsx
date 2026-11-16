import type { ReportRow } from "./classGradesUtils";

interface ClassGradesRankingCardsProps {
  rankedStudents: ReportRow[];
}

function ClassGradesRankingCards({ rankedStudents }: ClassGradesRankingCardsProps) {
  if (rankedStudents.length === 0) {
    return (
      <p className="admin-notice" role="status">
        Belum ada nilai rapor lengkap yang dapat direkap untuk kelas ini.
      </p>
    );
  }

  return (
    <section className="admin-grade-ranking-grid" aria-label="Peringkat nilai siswa">
      {rankedStudents.slice(0, 3).map((row, index) => (
        <article className="admin-overview-card admin-grade-ranking-card" key={row.student.id}>
          <span className="admin-eyebrow">PERINGKAT {index + 1}</span>
          <strong>{row.student.name}</strong>
          <span>Nilai akhir semester {row.semesterScore?.toFixed(2)}</span>
        </article>
      ))}
    </section>
  );
}

export default ClassGradesRankingCards;
