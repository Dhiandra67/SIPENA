import type { GradeComponent, ScoreMap } from "./types";

export function calculateFinal(
  studentId: string,
  components: GradeComponent[],
  scores: ScoreMap,
): number | null {
  if (components.length === 0) return null;
  const totalWeight = components.reduce(
    (total, component) => total + (Number(component.weight) || 0),
    0,
  );
  if (
    components.some((component) => Number(component.weight) <= 0 || Number(component.weight) > 100) ||
    Math.abs(totalWeight - 100) >= 0.0001
  ) {
    return null;
  }
  const weightedScore = components.reduce((total, component) => {
    const score = scores[studentId]?.[component.id];
    if (score === undefined || score === "") return Number.NaN;
    return total + (Number(score) * Number(component.weight)) / 100;
  }, 0);

  if (!Number.isFinite(weightedScore)) return null;
  return Math.round((weightedScore + Number.EPSILON) * 100) / 100;
}

export function getPredicate(score: number | null): string {
  if (score === null) return "—";
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 55) return "C";
  return "D";
}
