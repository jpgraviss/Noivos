// Sample data standing in for the not-yet-built backend (Database
// Architecture is drafted but no Supabase project exists yet). Shaped to
// match that schema so swapping in real queries later is a plumbing change,
// not a redesign.

export const currentUser = { id: 'u1', name: 'Ava', partnerName: 'Marcus' };

export const budgetSnapshot = {
  month: 'August',
  planned: 4200,
  spent: 2780,
  categories: [
    { name: 'Groceries', planned: 600, spent: 410, shared: true },
    { name: 'Wedding Vendors', planned: 1500, spent: 1200, shared: true },
    { name: 'Dining Out', planned: 300, spent: 340, shared: true },
    { name: 'Personal Shopping', planned: 250, spent: 90, shared: false },
    { name: 'Transportation', planned: 220, spent: 160, shared: true },
  ],
};

export const goals = [
  {
    id: 'g1',
    name: 'Our Wedding',
    type: 'wedding',
    target: 35000,
    shared: true,
    contributors: [
      { name: 'Ava', amount: 9800, color: '#C6FF00' },
      { name: 'Marcus', amount: 7200, color: '#FF2D8E' },
      { name: 'Family', amount: 5000, color: '#8A2BE2' },
    ],
  },
  {
    id: 'g2',
    name: 'Emergency Fund',
    type: 'emergency_fund',
    target: 15000,
    shared: true,
    contributors: [
      { name: 'Ava', amount: 4200, color: '#C6FF00' },
      { name: 'Marcus', amount: 3900, color: '#FF2D8E' },
    ],
  },
  {
    id: 'g3',
    name: 'New Camera',
    type: 'custom',
    target: 1200,
    shared: false,
    contributors: [{ name: 'Ava', amount: 480, color: '#C6FF00' }],
  },
];

export const activityFeed = [
  { id: 'a1', text: 'Marcus added a $340 payment to Wedding Vendors', time: '2h ago' },
  { id: 'a2', text: 'You reached 65% of Our Wedding 🎉', time: '1d ago' },
  { id: 'a3', text: 'Marcus joined your Partnership', time: '3mo ago' },
];

export const insights = [
  { id: 'i1', type: 'opportunity', text: 'At your current pace, you’ll hit Emergency Fund 2 months early.' },
  { id: 'i2', type: 'spending_increase', text: 'Dining Out is running $40 over plan this month.' },
  { id: 'i3', type: 'savings_streak', text: '6-week savings streak — keep it going!' },
];

export const upcomingBills = [
  { id: 'b1', name: 'Venue deposit', amount: 1200, due: 'Aug 8' },
  { id: 'b2', name: 'Photographer balance', amount: 800, due: 'Aug 15' },
];

export const weddingDetails = {
  active: true,
  date: 'June 12, 2027',
  daysLeft: 314,
  guestEstimate: 120,
  vendors: [
    { name: 'Willow Creek Venue', status: 'Deposit paid', balanceDue: 4200, dueDate: 'Mar 1' },
    { name: 'Golden Hour Photography', status: 'Contracted', balanceDue: 800, dueDate: 'Aug 15' },
    { name: 'Sweet Table Catering', status: 'Awaiting deposit', balanceDue: 2100, dueDate: 'Sep 1' },
  ],
  checklist: [
    { title: 'Send save-the-dates', done: true },
    { title: 'Book florist', done: true },
    { title: 'Finalize guest list', done: false },
    { title: 'Cake tasting', done: false },
  ],
};

export const moneyMeeting = {
  weekOf: 'Aug 3',
  topics: [
    'Wedding budget is $340 over on Dining — worth a look together?',
    'Emergency Fund is ahead of schedule 🎉',
    'Venue deposit due Aug 8 — confirm payment method',
  ],
};

export const aiConversation = [
  { role: 'user' as const, text: 'Can we afford a $3,000 photo booth for the wedding?' },
  {
    role: 'assistant' as const,
    text:
      'Adding a $3,000 photo booth would push your Wedding goal about 3 weeks later and leave Emergency Fund contributions flat for one month. It wouldn’t put any bill at risk. Want to see a version that trims $1,000 from the flowers budget instead?',
  },
];
