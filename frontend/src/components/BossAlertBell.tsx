import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  AlertTriangle,
  Bell,
  Check,
  CheckCircle2,
  RefreshCw,
  X,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import { systemAlertService } from "../services/systemAlertService";
import type { SystemAlert } from "../types/systemAlert";
import "./BossAlertBell.css";

const POLL_MS = 60_000;

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Time unavailable";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date) + " IST";
}

export default function BossAlertBell() {
  const { user, token } = useAuth();
  const isBoss = user?.role === "Boss" && user.is_active;
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const loadCount = useCallback(async () => {
    if (!token || !isBoss) return;
    try {
      const result = await systemAlertService.unacknowledgedCount(token);
      setCount(result);
    } catch {
      // Never display a misleading zero when the status cannot be loaded.
      setCount(null);
    }
  }, [token, isBoss]);

  const loadAlerts = useCallback(async () => {
    if (!token || !isBoss) return;
    setLoading(true);
    try {
      const list = await systemAlertService.list(token);
      setAlerts(list);
      setError(null);
    } catch {
      setError("Unable to load system alerts. Please retry.");
    } finally {
      setLoading(false);
    }
  }, [token, isBoss]);

  useEffect(() => {
    if (!isBoss || !token) {
      setOpen(false);
      setCount(null);
      setAlerts([]);
      return;
    }
    void loadCount();
    const id = window.setInterval(() => void loadCount(), POLL_MS);
    const onFocus = () => void loadCount();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [isBoss, token, loadCount]);

  useEffect(() => {
    if (open && isBoss) void loadAlerts();
  }, [open, isBoss, loadAlerts]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [open]);

  async function acknowledge(id: number) {
    if (!token || busyId !== null) return;
    setBusyId(id);
    try {
      await systemAlertService.acknowledge(token, id);
      await Promise.all([loadAlerts(), loadCount()]);
    } catch {
      setError("Could not acknowledge this alert. Please retry.");
    } finally {
      setBusyId(null);
    }
  }

  // Client-side visibility is convenience, not authorization: the API is Boss-only.
  if (!isBoss || !token) return null;

  return (
    <div className="boss-alert-shell" ref={rootRef}>
      <button
        type="button"
        className="boss-alert-trigger"
        aria-label={count ? `System alerts: ${count} unacknowledged` : "System alerts"}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen(value => !value)}
        title="Boss system alerts"
      >
        <Bell size={19} aria-hidden="true" />
        {count !== null && count > 0 && (
          <span className="boss-alert-count" aria-hidden="true">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <section
          className="boss-alert-panel"
          role="dialog"
          aria-modal="false"
          aria-label="Boss system notifications"
        >
          <header className="boss-alert-header">
            <div>
              <strong>System notifications</strong>
              <small>Backup and server safety alerts</small>
            </div>
            <div className="boss-alert-actions">
              <button
                type="button"
                onClick={() => void Promise.all([loadAlerts(), loadCount()])}
                aria-label="Refresh notifications"
                title="Refresh"
                disabled={loading}
              >
                <RefreshCw size={17} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close notifications"
                title="Close"
              >
                <X size={17} aria-hidden="true" />
              </button>
            </div>
          </header>

          {error && <p className="boss-alert-error" role="alert">{error}</p>}
          {loading && <p className="boss-alert-hint" role="status">Loading notifications…</p>}
          {!loading && alerts.length === 0 && !error && (
            <p className="boss-alert-empty">
              <CheckCircle2 size={20} aria-hidden="true" />
              No system alerts recorded.
            </p>
          )}

          <div className="boss-alert-list">
            {alerts.map(alert => {
              const acknowledged = Boolean(alert.acknowledged_at);
              const resolved = Boolean(alert.resolved_at);
              return (
                <article
                  key={alert.id}
                  className={`boss-alert-item ${acknowledged ? "is-acknowledged" : "is-new"}`}
                >
                  <div className="boss-alert-item-title">
                    {resolved ? (
                      <CheckCircle2 size={17} aria-hidden="true" />
                    ) : (
                      <AlertTriangle size={17} aria-hidden="true" />
                    )}
                    <strong>{alert.title}</strong>
                  </div>
                  <p>{alert.message}</p>
                  <div className="boss-alert-meta">
                    <span>{formatDateTime(alert.last_occurred_at)}</span>
                    <span>{resolved ? "Resolved" : acknowledged ? "Acknowledged" : "Needs attention"}</span>
                    {alert.occurrence_count > 1 && (
                      <span>Repeated {alert.occurrence_count} times</span>
                    )}
                  </div>
                  {!acknowledged && (
                    <button
                      className="boss-alert-ack"
                      type="button"
                      disabled={busyId !== null}
                      onClick={() => void acknowledge(alert.id)}
                    >
                      <Check size={15} aria-hidden="true" />
                      {busyId === alert.id ? "Acknowledging…" : "Acknowledge"}
                    </button>
                  )}
                </article>
              );
            })}
          </div>
          <footer className="boss-alert-footer">
            Showing the latest 50 alerts · Only Boss accounts can view these
          </footer>
        </section>
      )}
    </div>
  );
}
