// How far each stop on the path sits left or right of the middle, in px: the path winds like a road.
const OFFSETS = [0, 56, 84, 56, 0, -56, -84, -56]

/** The sideways shift of the stop at `index` on a level's path (skills, then labs, then the trophy). */
export function pathOffset(index: number): number {
  return OFFSETS[index % OFFSETS.length] ?? 0
}
