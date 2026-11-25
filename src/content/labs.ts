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
  // Level 3, on Delivery: a cohort retention table, and the data check that shows it cannot be trusted yet.
  {
    id: 'retention-check',
    title: 'Is the retention chart right?',
    level: 3,
    dataset: 'delivery',
    story:
      'Marketing wants a cohort retention table for the board: of the customers who joined in a month, how many come back one, two and three months later. Build it, and before it goes on a slide, make sure it can be trusted.',
    steps: [
      { exerciseId: 'delivery-125', lead: 'The usual first try: a cohort is the month of the customer’s first order.' },
      { exerciseId: 'delivery-126', lead: 'January looks far too big. Who are these “new” customers?' },
      { exerciseId: 'delivery-127', lead: 'Use the sign-up month as the cohort instead, and build the table.' },
      { exerciseId: 'delivery-128', lead: 'The curve is perfectly flat. Before reading it, check that orders and customers belong together.' },
    ],
    conclusion:
      'The table cannot go to the board yet. First orders are cut off where the data starts, and up to 83% of a month’s new customers have orders dated before their account existed: the link between orders and customers is broken, so retention measured on it is noise. Report the data problem, not the curve. A flat line and impossible dates are the two checks to run before any cohort chart.',
  },
  // Level 3, on Chinook: the biggest genre is not the best seller, it is the biggest shelf.
  {
    id: 'more-rock',
    title: 'Should we buy more Rock?',
    level: 3,
    dataset: 'chinook',
    story:
      'Rock brings in more money than any other genre, so the music buyer wants to spend next year’s budget on more Rock. Before the money goes, check whether Rock really sells better, or just more.',
    steps: [
      { exerciseId: 'chinook-130', lead: 'Start with the report the buyer has seen: revenue by genre, and its share.' },
      { exerciseId: 'chinook-131', lead: 'Before talking about hits, see how many times a track sells at all.' },
      { exerciseId: 'chinook-132', lead: 'There are no hits. Does a Rock track at least get bought more often than others?' },
      { exerciseId: 'chinook-133', lead: 'Now the fair comparison: revenue per track on the shelf.' },
    ],
    conclusion:
      'Rock earns 35.5% of the money because it is 37% of the catalogue (1,297 of 3,503 tracks). Per track on the shelf it earns $0.64, 8th of the 11 bigger genres; TV Shows and Drama lead because videos cost $1.99. There are no hits either: no track sold more than twice, and 1,519 never sold. More Rock would add money at the shop’s usual rate, no better. The lesson: divide by the size of the shelf before ranking.',
  },
  // Level 3, on Sakila: the rental rules, not the customers, decide who is late.
  {
    id: 'late-returns',
    title: 'Who returns films late?',
    level: 3,
    dataset: 'sakila',
    story:
      'Almost half of the rentals come back late. The manager wants to start fining customers, and asks whether one store is to blame. Find out where the late returns come from before anyone is fined.',
    steps: [
      { exerciseId: 'sakila-132', lead: 'First, how big is the problem: how many returned rentals were late?' },
      { exerciseId: 'sakila-133', lead: 'Is one store worse? Compare the shares.' },
      { exerciseId: 'sakila-134', lead: 'Both stores are the same. Do customers keep a 3-day film shorter than a 7-day one?' },
      { exerciseId: 'sakila-135', lead: 'They keep everything about five days. What if the rule were the same for every film?' },
    ],
    conclusion:
      'Customers keep every film about five days, whatever it allows. Films allowed 3 days come back late two times in three (66.9%), films allowed 7 days less than one time in four (23.3%); both stores are alike (46.3% and 45.4%). The rule makes a rental late, not the customer. One 7-day rule would halve the late returns, from 45.8% to 22.4%, without fining anyone. The lesson: before blaming people, group by the rule.',
  },
  // Level 4, on Northwind: a real-life import, cleaned and reported on before the UPDATE.
  {
    id: 'price-list',
    title: 'A supplier’s new price list',
    level: 4,
    dataset: 'northwind',
    story:
      'A supplier e-mailed new prices, and someone loaded the spreadsheet into a table as it was. Load the new prices into products, without breaking anything: one wrong UPDATE changes the prices on every order screen at once.',
    steps: [
      { exerciseId: 'northwind-205', lead: 'Never load before you look. Which lines do not match any product?' },
      { exerciseId: 'northwind-206', lead: 'The prices are text, some with a comma. Turn them into numbers.' },
      { exerciseId: 'northwind-207', lead: 'One product may be on the list twice. Which one, and on which lines?' },
      { exerciseId: 'northwind-208', lead: 'Decide the rules, then report what would change, before changing it.' },
      { exerciseId: 'northwind-209', lead: 'The report looks right. Now run the UPDATE with the same rules.' },
    ],
    conclusion:
      'Of 8 lines, one names a product we do not sell (Green Tea Deluxe: a question for the supplier), one has no price (Konbu keeps 6.00), and Chai is listed twice (the later 19.00 wins). Spaces, capitals and decimal commas were cleaned on the way, and five prices change by 0 to 8.6%. The order is what matters: look, clean, report, and only then update.',
  },
]

export function findLab(id: string): Lab | undefined {
  return LABS.find((l) => l.id === id)
}
