/**
 * Philippine board exam categories + their subjects.
 * `costume` maps to the accessory Kwagi wears for each board (see KwagiCostume).
 */
export type BoardId =
  | 'NLE'
  | 'ECE'
  | 'ME'
  | 'CE'
  | 'CPA'
  | 'PLE'
  | 'ARE'
  | 'BAR';

export interface Board {
  id: BoardId;
  name: string;
  icon: string;
  color: string;
  subjects: string[];
  costume: string;
}

export const BOARDS: Record<BoardId, Board> = {
  NLE: {
    id: 'NLE',
    name: 'Nursing (NLE)',
    icon: '🏥',
    color: '#2DD4BF',
    subjects: [
      'Fundamentals',
      'Medical-Surgical',
      'Pharmacology',
      'Maternal & Child',
      'Psychiatric',
      'Community Health',
    ],
    costume: 'nurse',
  },
  ECE: {
    id: 'ECE',
    name: 'Engineering (ECE)',
    icon: '⚡',
    color: '#F5A623',
    subjects: [
      'Mathematics',
      'Electronics',
      'Communications',
      'Digital Electronics',
      'Electromagnetics',
      'Electronic Systems',
    ],
    costume: 'hardhat',
  },
  ME: {
    id: 'ME',
    name: 'Engineering (ME)',
    icon: '⚙️',
    color: '#9B8DF0',
    subjects: [
      'Engineering Mechanics',
      'Thermodynamics',
      'Machine Design',
      'Fluid Mechanics',
      'Materials Science',
    ],
    costume: 'wrench',
  },
  CE: {
    id: 'CE',
    name: 'Engineering (CE)',
    icon: '🏗️',
    color: '#4ADE80',
    subjects: [
      'Structural Engineering',
      'Hydraulics',
      'Geotechnical',
      'Transportation',
      'Construction Management',
    ],
    costume: 'blueprint',
  },
  CPA: {
    id: 'CPA',
    name: 'Accountancy (CPA)',
    icon: '📊',
    color: '#F5A623',
    subjects: [
      'Financial Accounting',
      'Management Accounting',
      'Auditing',
      'Taxation',
      'Business Law',
      'MAS',
    ],
    costume: 'glasses',
  },
  PLE: {
    id: 'PLE',
    name: 'Medicine (PLE)',
    icon: '⚕️',
    color: '#FF6B6B',
    subjects: [
      'Internal Medicine',
      'Surgery',
      'OB-Gynecology',
      'Pediatrics',
      'Psychiatry',
      'Preventive Medicine',
    ],
    costume: 'doctor',
  },
  ARE: {
    id: 'ARE',
    name: 'Architecture (ARE)',
    icon: '🏛️',
    color: '#C084FC',
    subjects: [
      'Architectural Design',
      'History',
      'Structures',
      'Utilities',
      'Professional Practice',
    ],
    costume: 'beret',
  },
  BAR: {
    id: 'BAR',
    name: 'Bar Examination',
    icon: '⚖️',
    color: '#94A3B8',
    subjects: [
      'Political Law',
      'Civil Law',
      'Criminal Law',
      'Commercial Law',
      'Labor Law',
      'Taxation',
      'Legal Ethics',
    ],
    costume: 'wig',
  },
};

export const BOARD_IDS = Object.keys(BOARDS) as BoardId[];

export const BOARD_LIST: Board[] = BOARD_IDS.map((id) => BOARDS[id]);
