export type UserRole = "coach" | "athlete";

export type UserProfile = {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  profileColor: string;
  status: string;
  coachId?: string | null;
  athletes?: string[];
  activeBlocks?: string[];
  previousBlocks?: string[];
  coachRequests: string[];
  pendingRequests: string[];
  sentRequests: string[];
  createdAt: string;
  updatedAt: string;
};

export type TrainingBlock = {
  id: string;
  name?: string;
  coachId?: string;
  athleteId?: string;
  status: "active" | "completed" | "draft" | string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
};

export type Week = {
  id: string;
  blockId?: string;
  templateId?: string;
  [key: string]: unknown;
};

export type TrainingDay = {
  id: string;
  weekId: string;
  [key: string]: unknown;
};

export type Exercise = {
  id: string;
  dayId: string;
  [key: string]: unknown;
};
