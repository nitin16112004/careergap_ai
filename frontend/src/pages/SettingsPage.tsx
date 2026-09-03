import { Bell, CheckCircle2, CircleDashed, Clock3, Mail, Settings2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AuthCard } from "../components/auth/AuthCard";
import { LoadingButton } from "../components/auth/Button";
import { ErrorMessage, SuccessMessage } from "../components/auth/FeedbackMessage";
import { notificationService, type AppNotification } from "../services/notification.service";
import { reminderService, type ReminderLog, type ReminderPreferences } from "../services/reminder.service";

const reminderLabel = (type: ReminderLog["reminder_type"]): string => {
  if (type === "weekly_pending_task") return "Weekly pending tasks";
  if (type === "inactive_user") return "Inactive user";
  if (type === "motivational") return "Progress motivation";
  return "Roadmap due";
};

const formatDate = (value: string | null | undefined): string => {
  if (!value) return "Not sent yet";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

const ToggleRow = ({
  checked,
  disabled,
  title,
  description,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  title: string;
  description: string;
  onChange: (checked: boolean) => void;
}): JSX.Element => (
  <label className={`reminder-toggle-row ${disabled ? "reminder-toggle-disabled" : ""}`}>
    <div>
      <strong>{title}</strong>
      <span>{description}</span>
    </div>
    <input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />
  </label>
);

export const SettingsPage = (): JSX.Element => {
  const [preferences, setPreferences] = useState<ReminderPreferences | null>(null);
  const [logs, setLogs] = useState<ReminderLog[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;
    void Promise.all([reminderService.preferences(), reminderService.logs(), notificationService.list()])
      .then(([nextPreferences, nextLogs, nextNotifications]) => {
        if (!active) return;
        setPreferences(nextPreferences);
        setLogs(nextLogs);
        setNotifications(nextNotifications);
      })
      .catch((caught) => {
        if (active) setError(caught instanceof Error ? caught.message : "Unable to load reminder settings.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const updatePreference = <K extends keyof ReminderPreferences>(key: K, value: ReminderPreferences[K]): void => {
    setPreferences((current) => current ? { ...current, [key]: value } : current);
    setSuccess("");
  };

  const save = async (): Promise<void> => {
    if (!preferences) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const saved = await reminderService.updatePreferences(preferences);
      setPreferences(saved);
      setSuccess("Reminder preferences saved.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save reminder preferences.");
    } finally {
      setSaving(false);
    }
  };

  const markAllRead = async (): Promise<void> => {
    setError("");
    try {
      await notificationService.markAllRead();
      setNotifications((current) => current.map((item) => ({ ...item, is_read: true, read_at: item.read_at ?? new Date().toISOString() })));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update notifications.");
    }
  };

  if (loading) {
    return <AuthCard className="onboarding-card" eyebrow="Settings" title="Loading reminder settings" subtitle="Fetching notification preferences and delivery history."><div className="review-loading"><CircleDashed className="spin-icon" size={18} /> Loading settings...</div></AuthCard>;
  }

  return (
    <AuthCard className="onboarding-card settings-card" eyebrow="Settings" title="Reminders and notifications" subtitle="Control automatic roadmap reminders and review what the system has sent.">
      <ErrorMessage>{error}</ErrorMessage>
      <SuccessMessage>{success}</SuccessMessage>

      <div className="settings-grid">
        <section className="settings-panel">
          <div className="section-heading"><div><span className="eyebrow">Email automation</span><h2>Reminder preferences</h2></div><Settings2 size={18} /></div>
          {preferences ? <>
            <ToggleRow checked={preferences.emailEnabled} title="Email reminders" description="Master switch for automatic roadmap reminder emails." onChange={(value) => updatePreference("emailEnabled", value)} />
            <ToggleRow checked={preferences.weeklyPendingEnabled} disabled={!preferences.emailEnabled} title="Weekly pending tasks" description="Send one reminder for the current roadmap week when tasks remain pending." onChange={(value) => updatePreference("weeklyPendingEnabled", value)} />
            <ToggleRow checked={preferences.inactiveEnabled} disabled={!preferences.emailEnabled} title="7-day inactivity" description="Remind me when no authenticated activity has been recorded for seven days." onChange={(value) => updatePreference("inactiveEnabled", value)} />
            <ToggleRow checked={preferences.motivationalEnabled} disabled={!preferences.emailEnabled} title="Behind-schedule motivation" description="Send a focused nudge when roadmap progress falls behind the expected checkpoint." onChange={(value) => updatePreference("motivationalEnabled", value)} />
            <div className="settings-actions"><LoadingButton type="button" loading={saving} loadingLabel="Saving preferences..." onClick={() => { void save(); }}>Save preferences</LoadingButton></div>
          </> : <p className="form-hint">Reminder preferences are unavailable.</p>}
        </section>

        <section className="settings-panel">
          <div className="section-heading"><div><span className="eyebrow">Delivery history</span><h2>Recent reminders</h2></div><Mail size={18} /></div>
          {logs.length === 0 ? <div className="empty-state-box"><Clock3 size={18} /><div><h3>No reminders sent yet</h3><p>Eligible reminders will appear here after the weekly scheduler runs.</p></div></div> : (
            <div className="reminder-history-list">
              {logs.slice(0, 8).map((log) => <article className="reminder-history-item" key={log.id}>
                <div><strong>{reminderLabel(log.reminder_type)}</strong><p>{log.reason || `${log.pending_task_count} pending tasks`}</p></div>
                <div className="reminder-history-meta"><span className={`delivery-badge delivery-${log.email_status}`}>{log.email_status}</span><small>{formatDate(log.sent_at ?? log.created_at)}</small></div>
              </article>)}
            </div>
          )}
        </section>

        <section className="settings-panel settings-panel-wide">
          <div className="section-heading"><div><span className="eyebrow">In-app</span><h2>Notifications</h2></div><Bell size={18} /></div>
          <div className="settings-panel-toolbar"><span>{notifications.filter((item) => !item.is_read).length} unread</span>{notifications.some((item) => !item.is_read) && <button className="text-link" type="button" onClick={() => { void markAllRead(); }}>Mark all read</button>}</div>
          {notifications.length === 0 ? <div className="empty-state-box"><Bell size={18} /><div><h3>No notifications yet</h3><p>Reminder and roadmap notices will appear here.</p></div></div> : (
            <div className="notification-list">
              {notifications.slice(0, 10).map((item) => <article className={`notification-item ${item.is_read ? "" : "notification-unread"}`} key={item.id}>
                <div className="notification-icon">{item.is_read ? <CheckCircle2 size={17} /> : <Bell size={17} />}</div>
                <div><strong>{item.title}</strong><p>{item.message}</p><small>{formatDate(item.created_at)}</small></div>
                {item.link_url && <Link className="text-link" to={item.link_url}>Open</Link>}
              </article>)}
            </div>
          )}
        </section>
      </div>

      <div className="review-bottom-actions"><Link className="button button-secondary" to="/dashboard">Back to dashboard</Link></div>
    </AuthCard>
  );
};
