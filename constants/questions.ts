import type { BoardId } from './boards';

/** A seed quiz question. `answer` is the index into `choices`. */
export interface SeedQuestion {
  board: BoardId;
  subject: string;
  question: string;
  choices: string[];
  answer: number;
  explanation: string;
}

export const SEED_QUESTIONS: SeedQuestion[] = [
  // ---------------- NLE (Nursing) ----------------
  {
    board: 'NLE',
    subject: 'Fundamentals',
    question: 'What is the normal adult resting respiratory rate (breaths per minute)?',
    choices: ['6–10', '12–20', '24–30', '32–40'],
    answer: 1,
    explanation: 'Normal adult respiratory rate is 12–20 breaths/min. Below 12 is bradypnea, above 20 is tachypnea.',
  },
  {
    board: 'NLE',
    subject: 'Fundamentals',
    question: 'Which position is BEST for a client experiencing dyspnea?',
    choices: ['Supine', 'Trendelenburg', 'High-Fowler’s', 'Prone'],
    answer: 2,
    explanation: 'High-Fowler’s (60–90°) maximizes lung expansion and eases the work of breathing.',
  },
  {
    board: 'NLE',
    subject: 'Pharmacology',
    question: 'Before administering digoxin, the nurse should always assess the client’s:',
    choices: ['Temperature', 'Apical pulse', 'Blood glucose', 'Respiratory rate'],
    answer: 1,
    explanation: 'Hold digoxin and notify the physician if the apical pulse is <60 bpm in adults due to risk of bradycardia/toxicity.',
  },
  {
    board: 'NLE',
    subject: 'Pharmacology',
    question: 'Which is an early sign of digoxin toxicity?',
    choices: ['Hypertension', 'Anorexia and nausea', 'Polyuria', 'Hyperglycemia'],
    answer: 1,
    explanation: 'Anorexia, nausea, and visual disturbances (yellow-green halos) are early markers of digoxin toxicity.',
  },
  {
    board: 'NLE',
    subject: 'Medical-Surgical',
    question: 'The normal range for serum potassium (mEq/L) is:',
    choices: ['1.5–2.5', '3.5–5.0', '6.0–7.5', '8.0–9.5'],
    answer: 1,
    explanation: 'Normal serum potassium is 3.5–5.0 mEq/L. Both hypo- and hyperkalemia cause dangerous dysrhythmias.',
  },
  {
    board: 'NLE',
    subject: 'Maternal & Child',
    question: 'The expected fetal heart rate range (bpm) at term is:',
    choices: ['80–100', '110–160', '170–200', '60–80'],
    answer: 1,
    explanation: 'Normal FHR is 110–160 bpm. Persistent bradycardia or tachycardia signals fetal distress.',
  },
  {
    board: 'NLE',
    subject: 'Psychiatric',
    question: 'A therapeutic communication technique that encourages a client to continue is:',
    choices: ['Giving advice', 'Using silence', 'Changing the subject', 'Offering reassurance'],
    answer: 1,
    explanation: 'Silence gives the client time to think and signals the nurse’s attentiveness without leading the response.',
  },
  {
    board: 'NLE',
    subject: 'Community Health',
    question: 'The primary purpose of primary prevention is to:',
    choices: [
      'Diagnose disease early',
      'Prevent disease before it occurs',
      'Rehabilitate after illness',
      'Treat acute symptoms',
    ],
    answer: 1,
    explanation: 'Primary prevention (e.g., immunization, health education) stops disease before onset.',
  },
  {
    board: 'NLE',
    subject: 'Medical-Surgical',
    question: 'Which finding suggests compartment syndrome in a casted extremity?',
    choices: [
      'Warm pink toes',
      'Pain unrelieved by analgesics',
      'Strong distal pulse',
      'Brisk capillary refill',
    ],
    answer: 1,
    explanation: 'Pain out of proportion and unrelieved by opioids is the hallmark early sign of compartment syndrome — a surgical emergency.',
  },
  {
    board: 'NLE',
    subject: 'Fundamentals',
    question: 'The correct order of donning PPE is:',
    choices: [
      'Gloves, gown, mask, goggles',
      'Gown, mask, goggles, gloves',
      'Mask, gloves, gown, goggles',
      'Goggles, gloves, gown, mask',
    ],
    answer: 1,
    explanation: 'Don in this order: gown → mask/respirator → goggles/face shield → gloves.',
  },

  // ---------------- ECE (Electronics Engineering) ----------------
  {
    board: 'ECE',
    subject: 'Electronics',
    question: 'Ohm’s Law states that voltage equals:',
    choices: ['I / R', 'I × R', 'R / I', 'I² × R'],
    answer: 1,
    explanation: 'V = I × R. Voltage is the product of current and resistance.',
  },
  {
    board: 'ECE',
    subject: 'Electronics',
    question: 'The unit of capacitance is the:',
    choices: ['Henry', 'Farad', 'Ohm', 'Weber'],
    answer: 1,
    explanation: 'Capacitance is measured in farads (F). Inductance uses henrys, magnetic flux uses webers.',
  },
  {
    board: 'ECE',
    subject: 'Digital Electronics',
    question: 'How many bits are in one byte?',
    choices: ['4', '8', '16', '32'],
    answer: 1,
    explanation: 'One byte = 8 bits. A nibble is 4 bits.',
  },
  {
    board: 'ECE',
    subject: 'Digital Electronics',
    question: 'The output of a 2-input AND gate is HIGH only when:',
    choices: [
      'At least one input is HIGH',
      'Both inputs are HIGH',
      'Both inputs are LOW',
      'Inputs differ',
    ],
    answer: 1,
    explanation: 'An AND gate outputs HIGH (1) only when ALL inputs are HIGH.',
  },
  {
    board: 'ECE',
    subject: 'Communications',
    question: 'In the electromagnetic spectrum, which has the HIGHEST frequency?',
    choices: ['Radio waves', 'Infrared', 'Visible light', 'Gamma rays'],
    answer: 3,
    explanation: 'Gamma rays have the highest frequency and shortest wavelength in the EM spectrum.',
  },
  {
    board: 'ECE',
    subject: 'Mathematics',
    question: 'The value of j² (where j is the imaginary unit) is:',
    choices: ['1', '-1', 'j', '0'],
    answer: 1,
    explanation: 'By definition j = √(-1), so j² = -1.',
  },
  {
    board: 'ECE',
    subject: 'Electromagnetics',
    question: 'The speed of light in free space is approximately:',
    choices: ['3 × 10⁶ m/s', '3 × 10⁸ m/s', '3 × 10¹⁰ m/s', '3 × 10² m/s'],
    answer: 1,
    explanation: 'c ≈ 3 × 10⁸ m/s (299,792,458 m/s) in a vacuum.',
  },
  {
    board: 'ECE',
    subject: 'Electronics',
    question: 'Resistors in series have a total resistance equal to:',
    choices: [
      'The reciprocal of the sum of reciprocals',
      'The sum of individual resistances',
      'The product over the sum',
      'The average of the resistances',
    ],
    answer: 1,
    explanation: 'Series resistances add directly: R_total = R₁ + R₂ + …',
  },
  {
    board: 'ECE',
    subject: 'Communications',
    question: 'AM and FM differ in that FM varies the carrier’s:',
    choices: ['Amplitude', 'Frequency', 'Phase only', 'DC offset'],
    answer: 1,
    explanation: 'FM (frequency modulation) varies carrier frequency with the message; AM varies amplitude.',
  },
  {
    board: 'ECE',
    subject: 'Electronic Systems',
    question: 'A diode primarily allows current to flow in:',
    choices: ['Both directions equally', 'One direction', 'Neither direction', 'A circular path'],
    answer: 1,
    explanation: 'A diode conducts when forward-biased and blocks current when reverse-biased — it is a one-way valve.',
  },

  // ---------------- CPA (Accountancy) ----------------
  {
    board: 'CPA',
    subject: 'Financial Accounting',
    question: 'The fundamental accounting equation is:',
    choices: [
      'Assets = Liabilities − Equity',
      'Assets = Liabilities + Equity',
      'Equity = Assets + Liabilities',
      'Liabilities = Assets + Equity',
    ],
    answer: 1,
    explanation: 'Assets = Liabilities + Owner’s Equity. This must always balance.',
  },
  {
    board: 'CPA',
    subject: 'Financial Accounting',
    question: 'Under the accrual basis, revenue is recognized when:',
    choices: ['Cash is received', 'It is earned', 'The invoice is paid', 'Year-end closes'],
    answer: 1,
    explanation: 'Accrual accounting recognizes revenue when earned and expenses when incurred, regardless of cash flow.',
  },
  {
    board: 'CPA',
    subject: 'Financial Accounting',
    question: 'Which account normally carries a credit balance?',
    choices: ['Cash', 'Accounts Receivable', 'Service Revenue', 'Equipment'],
    answer: 2,
    explanation: 'Revenue, liabilities, and equity carry normal credit balances; assets and expenses carry debit balances.',
  },
  {
    board: 'CPA',
    subject: 'Management Accounting',
    question: 'Contribution margin is computed as:',
    choices: [
      'Sales − Fixed costs',
      'Sales − Variable costs',
      'Sales − Total costs',
      'Fixed costs − Variable costs',
    ],
    answer: 1,
    explanation: 'Contribution margin = Sales − Variable costs. It covers fixed costs first, then becomes profit.',
  },
  {
    board: 'CPA',
    subject: 'Management Accounting',
    question: 'At the break-even point:',
    choices: [
      'Profit is maximized',
      'Total revenue equals total costs',
      'Variable costs equal fixed costs',
      'Contribution margin is zero',
    ],
    answer: 1,
    explanation: 'Break-even is where total revenue equals total cost, so profit is zero.',
  },
  {
    board: 'CPA',
    subject: 'Auditing',
    question: 'The primary purpose of an external financial audit is to express an opinion on whether the statements are:',
    choices: [
      'Free of all fraud',
      'Fairly presented per the framework',
      'Profitable',
      'Approved by the BIR',
    ],
    answer: 1,
    explanation: 'An audit provides reasonable assurance that statements are fairly presented in accordance with the applicable framework (e.g., PFRS).',
  },
  {
    board: 'CPA',
    subject: 'Taxation',
    question: 'In the Philippines, the standard VAT rate is:',
    choices: ['3%', '10%', '12%', '15%'],
    answer: 2,
    explanation: 'The Philippine value-added tax (VAT) rate is 12% on most taxable sales of goods and services.',
  },
  {
    board: 'CPA',
    subject: 'Business Law',
    question: 'A contract requires all of the following EXCEPT:',
    choices: ['Consent', 'Object', 'Cause/consideration', 'Notarization'],
    answer: 3,
    explanation: 'The essential requisites are consent, object, and cause. Notarization affects form/enforceability, not validity.',
  },
  {
    board: 'CPA',
    subject: 'Financial Accounting',
    question: 'Depreciation is best described as:',
    choices: [
      'A cash outflow',
      'Allocation of an asset’s cost over its useful life',
      'A market valuation',
      'A liability',
    ],
    answer: 1,
    explanation: 'Depreciation systematically allocates the cost of a tangible asset over its useful life; it is a non-cash expense.',
  },
  {
    board: 'CPA',
    subject: 'MAS',
    question: 'Which is a relevant cost in a decision-making analysis?',
    choices: ['Sunk cost', 'Historical cost', 'Avoidable future cost', 'Book value of old equipment'],
    answer: 2,
    explanation: 'Relevant costs are future costs that differ between alternatives. Sunk and historical costs are irrelevant.',
  },
];

export function seedQuestionsForBoard(board: BoardId): SeedQuestion[] {
  return SEED_QUESTIONS.filter((q) => q.board === board);
}
