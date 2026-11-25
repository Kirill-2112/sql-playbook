import { TOPICS } from './topics'
import type { DatasetId, Exercise, Level } from './types'

/**
 * Write SQL: every exercise as a "write the query" task, by topic, like an interview (an empty editor and a question).
 * The interview set: the patterns interviewers ask most, easy to hard, picked from verified exercises.
 */
export const INTERVIEW_IDS = [
  'northwind-008', // the latest rows
  'northwind-014', // customers who never ordered: anti-join
  'sakila-017', // duplicates with a self-join
  'northwind-019', // orders with both products: HAVING count(distinct)
  'northwind-095', // in one set, not the other
  'sakila-026', // above the average: a subquery
  'northwind-155', // the second highest
  'northwind-022', // top 3 per group
  'employees-017', // top earners per department
  'northwind-024', // running total
  'northwind-133', // month-over-month growth: LAG
  'northwind-157', // moving average
  'northwind-158', // the median
  'sakila-049', // the latest row per customer
  'northwind-025', // share of the biggest customers
  'sakila-025', // every month, also the empty ones
  'sakila-028', // streaks: gaps and islands
  'northwind-026', // everyone under a manager: recursion
  'employees-104', // compare each row with its group
  'northwind-029', // ordering streaks of one customer
] as const

export const INTERVIEW = 'interview'
export const SESSION_SIZE = 5

// Within a topic: easier levels first, the familiar databases first, then the exercise number.
const DATASET_ORDER: DatasetId[] = ['northwind', 'chinook', 'sakila', 'employees', 'adventureworks', 'airlines', 'lahman', 'delivery']
const number = (id: string) => Number(id.split('-')[1])

/** The exercises of a set (a topic id, or INTERVIEW), in the order they are played. */
export function setExercises(all: Exercise[], set: string): Exercise[] {
  if (set === INTERVIEW) return INTERVIEW_IDS.map((id) => all.find((e) => e.id === id)).filter((e): e is Exercise => !!e)
  return all
    .filter((e) => e.topics.includes(set))
    .sort((a, b) => a.level - b.level || DATASET_ORDER.indexOf(a.dataset) - DATASET_ORDER.indexOf(b.dataset) || number(a.id) - number(b.id))
}

export function setName(set: string): string {
  return set === INTERVIEW ? 'Interview classics' : (TOPICS.find((t) => t.id === set)?.name ?? set)
}

export function setLevel(set: string): Level | null {
  return TOPICS.find((t) => t.id === set)?.level ?? null
}
