import axios from "axios";

import type {
  BackupHistoryResponse,
  BackupLog,
  BackupSettings,
  BackupSettingsPayload,
  BackupSystemStatus,
  RestoreBackupResponse,
  RetentionCleanupResponse,
} from "../types/backup";


const API_BASE_URL =
  "http://127.0.0.1:8000/api/v1";


function getAuthHeaders() {
  const token =
    localStorage.getItem(
      "access_token"
    );

  if (!token) {
    throw new Error(
      "Authentication required."
    );
  }

  return {
    Authorization:
      `Bearer ${token}`,
  };
}


export async function getBackupSettings():
Promise<BackupSettings> {
  const response =
    await axios.get<BackupSettings>(
      `${API_BASE_URL}/backup-recovery/settings`,
      {
        headers:
          getAuthHeaders(),
      }
    );

  return response.data;
}


export async function updateBackupSettings(
  payload:
    BackupSettingsPayload
):
Promise<BackupSettings> {
  const response =
    await axios.put<BackupSettings>(
      `${API_BASE_URL}/backup-recovery/settings`,
      payload,
      {
        headers:
          getAuthHeaders(),
      }
    );

  return response.data;
}


export async function getBackupSystemStatus():
Promise<BackupSystemStatus> {
  const response =
    await axios.get<BackupSystemStatus>(
      `${API_BASE_URL}/backup-recovery/status`,
      {
        headers:
          getAuthHeaders(),
      }
    );

  return response.data;
}


export async function getBackupHistory(
  limit = 100
):
Promise<BackupHistoryResponse> {
  const response =
    await axios.get<BackupHistoryResponse>(
      `${API_BASE_URL}/backup-recovery/history`,
      {
        headers:
          getAuthHeaders(),

        params: {
          limit,
        },
      }
    );

  return response.data;
}


export async function createManualBackup():
Promise<BackupLog> {
  const response =
    await axios.post<BackupLog>(
      `${API_BASE_URL}/backup-recovery/create`,
      null,
      {
        headers:
          getAuthHeaders(),
      }
    );

  return response.data;
}


export async function verifyBackup(
  backupId: number
):
Promise<BackupLog> {
  const response =
    await axios.post<BackupLog>(
      `${API_BASE_URL}/backup-recovery/history/${backupId}/verify`,
      null,
      {
        headers:
          getAuthHeaders(),
      }
    );

  return response.data;
}


export async function restoreBackup(
  backupId: number,
  confirmation: string
): Promise<RestoreBackupResponse> {
  const response =
    await axios.post<RestoreBackupResponse>(
      `${API_BASE_URL}/backup-recovery/history/${backupId}/restore`,
      {
        confirmation,
      },
      {
        headers:
          getAuthHeaders(),
      }
    );

  return response.data;
}


export async function runAutomaticBackupNow():
Promise<BackupLog> {
  const response =
    await axios.post<BackupLog>(
      `${API_BASE_URL}/backup-recovery/automatic/run-now`,
      null,
      {
        headers:
          getAuthHeaders(),
      }
    );

  return response.data;
}


export async function runRetentionCleanup():
Promise<RetentionCleanupResponse> {
  const response =
    await axios.post<RetentionCleanupResponse>(
      `${API_BASE_URL}/backup-recovery/retention/cleanup`,
      null,
      {
        headers:
          getAuthHeaders(),
      }
    );

  return response.data;
}
