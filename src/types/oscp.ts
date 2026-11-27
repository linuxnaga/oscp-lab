// Core domain types for the OSCP Command Center.

export type OS = "Linux" | "Windows" | "Active Directory";
export type Difficulty = "Easy" | "Medium" | "Hard";

export type Domain =
  | "Web Exploitation"
  | "Linux PrivEsc"
  | "Windows PrivEsc"
  | "Active Directory"
  | "Pivoting & Tunneling"
  | "Exam Chains";

export const DOMAINS: readonly Domain[] = [
  "Web Exploitation",
  "Linux PrivEsc",
  "Windows PrivEsc",
  "Active Directory",
  "Pivoting & Tunneling",
  "Exam Chains",
] as const;

export interface PortService {
  port: number;
  proto: "tcp" | "udp";
  service: string;
  version: string;
}

export interface ChainHost {
  role: "Standalone" | "Client" | "Domain Controller" | "Pivot" | "Internal";
  hostname: string;
  ip: string;
  os: string;
  summary: string;
}

export interface Lab {
  id: string; // LAB-001
  name: string; // hostname-style codename
  ip: string; // 10.10.11.X
  os: OS;
  difficulty: Difficulty;
  domain: Domain;
  xp: number;
  tags: string[];
  cves: string[];
  tools: string[];
  flagship: boolean;
  summary: string;
  ports: PortService[];
  foothold: {
    vector: string;
    details: string;
    steps: string[]; // methodology steps (study notes, not payloads)
  };
  privesc: {
    vector: string;
    details: string;
    tooling: string[];
    steps: string[];
  };
  remediation: string;
  chain?: ChainHost[];
  hint: string;
  flags: {
    local: string;
    proof: string;
  };
}

export type ChecklistKey = "recon" | "foothold" | "privesc" | "proof";

export interface LabProgress {
  checklist: Record<ChecklistKey, boolean>;
  localSubmitted: boolean;
  proofSubmitted: boolean;
  completedAt?: number;
}

export type FlashcardCategory =
  | "Enumeration"
  | "Web"
  | "Linux PrivEsc"
  | "Windows PrivEsc"
  | "Active Directory"
  | "Tunneling";

export const FLASHCARD_CATEGORIES: readonly FlashcardCategory[] = [
  "Enumeration",
  "Web",
  "Linux PrivEsc",
  "Windows PrivEsc",
  "Active Directory",
  "Tunneling",
] as const;

export interface FlagExplanation {
  flag: string;
  meaning: string;
}

export interface Flashcard {
  id: string;
  category: FlashcardCategory;
  front: string;
  answer: string; // tool / approach summary shown on the back
  syntax?: string; // general usage template (enumeration tools only)
  flags: FlagExplanation[];
  note?: string;
}

/** SM-2 state for a single card. */
export interface Sm2State {
  repetitions: number;
  interval: number; // days
  easeFactor: number;
  due: number; // epoch ms
  lastReviewed?: number;
  lapses: number;
}

export type Sm2Rating = 1 | 2 | 3 | 4; // Again, Hard, Good, Easy

export interface ExamQuestion {
  id: string;
  category: Domain;
  title: string;
  scenario: string;
  terminal: string; // raw terminal output
  terminalLabel: string; // e.g. "sudo -l"
  question: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  explanation: string; // why the correct answer works
  rationale: [string, string, string, string]; // per-option breakdown, same order as options
}

export interface QuestionAttempt {
  selected: number;
  correct: boolean;
  at: number;
}

export type ActivityKind =
  | "lab-complete"
  | "flag"
  | "flashcard"
  | "question"
  | "achievement"
  | "rank-up"
  | "import";

export interface ActivityEvent {
  id: string;
  kind: ActivityKind;
  message: string;
  xp: number;
  at: number;
}

export interface OscpState {
  version: 1;
  xp: number;
  streak: {
    current: number;
    longest: number;
    lastActiveDay: string | null; // YYYY-MM-DD (local)
  };
  labs: Record<string, LabProgress>;
  notes: Record<string, string>;
  flashcards: Record<string, Sm2State>;
  flashcardReviews: number;
  questions: Record<string, QuestionAttempt[]>;
  achievements: Record<string, number>; // id -> unlockedAt
  activity: ActivityEvent[];
  lastLabId: string | null;
}

export interface Rank {
  code: string;
  title: string;
  min: number;
  max: number | null;
  color: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: AchievementIcon;
  color: string;
}

export type AchievementIcon =
  | "droplet"
  | "crown"
  | "skull"
  | "network"
  | "layers"
  | "flame"
  | "terminal"
  | "shield"
  | "target"
  | "brain"
  | "key"
  | "trophy";
