// Simplified lactate training zones (mmol/L) used only to color-code the
// watch display. Not a substitute for a real physiological threshold test.
export function lactateZone(mM: number): number {
  if (mM < 2) return 1; // aerobic / easy
  if (mM < 4) return 2; // steady / tempo
  if (mM < 6) return 3; // threshold
  return 4; // anaerobic / VO2
}
