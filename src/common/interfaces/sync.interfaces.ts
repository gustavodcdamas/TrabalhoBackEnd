export interface Inconsistency {
  email: string;
  issue: string;
  count: number;
  ids: string[];
}

export interface FixedItem {
  id: string;
  email: string;
  action: string;
  details: string;
}

export interface SyncReport {
  totalUsers: number;
  inconsistencies: Inconsistency[];
  fixed: FixedItem[];
}

export interface DetailedReport {
  summary: {
    totalUsers: number;
    activeUsers: number;
    deletedUsers: number;
    unverifiedUsers: number;
  };
  roleDistribution: Array<{
    role: string;
    count: number;
  }>;
  timestamp: string;
}