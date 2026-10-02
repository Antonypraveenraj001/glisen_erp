export interface BackupSettings {
  id: number;
  automatic_backup_enabled: boolean;
  backup_time: string;
  primary_backup_path: string | null;
  secondary_backup_enabled: boolean;
  secondary_backup_path: string | null;
  retention_days: number;
  include_uploads: boolean;
  verify_after_backup: boolean;
  created_at: string;
  updated_at: string;
}

export interface BackupSettingsPayload {
  automatic_backup_enabled: boolean;
  backup_time: string;
  primary_backup_path: string;
  secondary_backup_enabled: boolean;
  secondary_backup_path: string | null;
  retention_days: number;
  include_uploads: boolean;
  verify_after_backup: boolean;
}

export interface BackupLog {
  id: number;
  backup_type: string;
  filename: string;
  primary_path: string | null;
  secondary_path: string | null;
  file_size_bytes: number | null;
  checksum_sha256: string | null;
  status: string;
  financial_year_id: number | null;
  created_by: number | null;
  app_version: string | null;
  schema_revision: string | null;
  manifest_version: string | null;
  started_at: string;
  completed_at: string | null;
  verified_at: string | null;
  error_message: string | null;
}

export interface BackupHistoryResponse {
  total: number;
  items: BackupLog[];
}

export interface BackupSystemStatus {
  database_name: string;
  dump_utility_available: boolean;
  dump_utility_name: string;
  uploads_folder: string;
  uploads_folder_exists: boolean;
}


export interface RestoreBackupResponse {
  status: string;
  message: string;
  restored_filename: string;
  pre_restore_filename: string;
}


export interface RetentionCleanupResponse {
  purged: number;
  partial: number;
  retention_days: number;
}
