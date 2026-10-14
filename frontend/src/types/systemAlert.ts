export interface SystemAlert {
  id: number;
  category: string;
  severity: string;
  title: string;
  message: string;
  occurrence_count: number;
  first_occurred_at: string;
  last_occurred_at: string;
  acknowledged_at: string | null;
  acknowledged_by_id: number | null;
  resolved_at: string | null;
}

export interface SystemAlertCount {
  unacknowledged_count: number;
}
