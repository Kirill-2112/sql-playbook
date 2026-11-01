import type { DatasetId, Level } from './types'

/**
 * Labs: short investigations on one database. Each step is an ordinary verified exercise (exercises/*Labs.ts);
 * the lab adds the story around it: why we look, what each step should reveal, and what we learned.
 */
export interface Lab {
  id: string
  title: string
  level: Level
  dataset: DatasetId
  /** The question the lab answers, as a manager or a colleague would put it. */
  story: string
  steps: { exerciseId: string; lead: string }[]
  conclusion: string
}

export const LABS: Lab[] = [
  {
    id: 'sales-drop-1998',
    title: 'Did sales drop in 1998?',
    level: 2,
    dataset: 'northwind',
    story:
      'The sales director looks at the yearly report and sees 1998 a third below 1997. A meeting is booked to discuss what went wrong. Before it starts, check whether anything went wrong at all.',
    steps: [
      { exerciseId: 'northwind-195', lead: 'Start with the report everyone is looking at: revenue per year.' },
      { exerciseId: 'northwind-196', lead: 'Before trusting a yearly total, check which dates the data covers.' },
      { exerciseId: 'northwind-197', lead: 'The data ends early in 1998. Look at the last months, month by month.' },
      { exerciseId: 'northwind-198', lead: 'Now compare like with like: the same four months in both years.' },
      { exerciseId: 'northwind-199', lead: 'Sales grew. Was it one category, or all of them?' },
    ],
    conclusion:
      'There was no drop. The data stops on 6 May 1998, so “1998” is four months long. Comparing the same months shows revenue more than doubled, in every category. The lesson: check what a total covers before comparing it.',
  },
  {
    id: 'late-deliveries',
    title: 'Late deliveries',
    level: 2,
    dataset: 'northwind',
    story:
      'Customers complain that orders arrive late. Find out how often it happens, whether one shipping company or one employee is behind it, and which customers were hit worst.',
    steps: [
      { exerciseId: 'northwind-200', lead: 'First, the size of the problem: how many orders shipped after their required date?' },
      { exerciseId: 'northwind-201', lead: 'Is one shipping company worse? Compare shares, not counts.' },
      { exerciseId: 'northwind-202', lead: 'Someone says it is all one employee. Check it the same way.' },
      { exerciseId: 'northwind-203', lead: 'How often is one measure; how late is another.' },
      { exerciseId: 'northwind-204', lead: 'Finally, the customers who waited longest: they deserve a call.' },
    ],
    conclusion:
      'About one order in twenty-two ships late, spread over all three companies and all employees. Counts point at whoever does the most work; shares, and the number of orders behind them, tell a fairer story. And “how often” and “how late” can rank the same companies differently.',
  },
]

export function findLab(id: string): Lab | undefined {
  return LABS.find((l) => l.id === id)
}
