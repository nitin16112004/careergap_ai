import type { Queue } from "bullmq";
import { getEnv } from "../config/env";
import { logger } from "../config/logger";
import { getSupabaseStorageClient } from "../config/supabase";
import { createQueue } from "../jobs/queues";
import { billingService } from "./billing.service";
import { calculateRoadmapProgress } from "./roadmap-progress.service";
import type { ReminderEmailJobData, ReminderPreferences, ReminderScanResult, ReminderType } from "../types/reminder";
import { HttpError } from "../utils/http-error";

const DEFAULT_PREFERENCES: ReminderPreferences = {
  emailEnabled: true,
  weeklyPendingEnabled: true,
  inactiveEnabled: true,
  motivationalEnabled: true,
};

type RoadmapRow = {
  id: string;
  user_id: string;
  title: string;
  duration_weeks: number | null;
  progress_percentage: number | null;
  created_at: string;
};

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  last_activity_at: string | null;
  onboarding_completed: boolean;
};

type PreferenceRow = {
  user_id: string;
  email_enabled: boolean;
  weekly_pending_enabled: boolean;
  inactive_enabled: boolean;
  motivational_enabled: boolean;
};

type WeekRow = {
  id: string;
  roadmap_id: string;
  week_number: number;
  title: string;
  start_date: string | null;
  due_date: string | null;
};

type TaskRow = {
  id: string;
  roadmap_id: string;
  week_id: string;
  status: string;
  due_date: string | null;
};

type ReminderCandidate = {
  userId: string;
  email: string;
  displayName: string;
  roadmapId: string;
  roadmapTitle: string;
  weekId: string | null;
  reminderType: ReminderType;
  pendingTaskCount: number;
  dedupeKey: string;
  reason: string;
  subject: string;
  text: string;
  html: string;
  notificationTitle: string;
  notificationMessage: string;
  linkPath: string;
  metadata: Record<string, unknown>;
};

const toPreferences = (row?: PreferenceRow): ReminderPreferences => row ? {
  emailEnabled: row.email_enabled,
  weeklyPendingEnabled: row.weekly_pending_enabled,
  inactiveEnabled: row.inactive_enabled,
  motivationalEnabled: row.motivational_enabled,
} : { ...DEFAULT_PREFERENCES };

const escapeHtml = (value: string): string => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const isoWeekKey = (date: Date): string => {
  const value = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = value.getUTCDay() || 7;
  value.setUTCDate(value.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(value.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((value.getTime() - yearStart.getTime()) / 86_400_000) + 1) / 7);
  return `${value.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
};

const emailDocument = (title: string, body: string, link: string): string => `<!doctype html>
<html><body style="font-family:Arial,sans-serif;line-height:1.6;color:#172033">
  <h2>${escapeHtml(title)}</h2>
  <p>${escapeHtml(body)}</p>
  <p><a href="${escapeHtml(link)}">Open your roadmap</a></p>
  <p style="color:#64748b;font-size:13px">You can change reminder preferences in CareerGuid AI settings.</p>
</body></html>`;

const buildCandidate = (
  type: ReminderType,
  profile: ProfileRow,
  roadmap: RoadmapRow,
  progress: ReturnType<typeof calculateRoadmapProgress>,
  now: Date,
): ReminderCandidate => {
  const displayName = profile.full_name?.trim() || "there";
  const firstName = displayName.split(/\s+/)[0] || "there";
  const linkPath = `/roadmap/${roadmap.id}`;
  const link = `${getEnv().FRONTEND_URL.replace(/\/$/, "")}${linkPath}`;
  const weekNumber = progress.currentWeek?.weekNumber ?? 1;
  const weekId = progress.currentWeek?.id ?? null;

  if (type === "inactive_user") {
    const inactiveDays = getEnv().REMINDER_INACTIVE_DAYS;
    const title = `Continue your ${roadmap.title}`;
    const body = `Hi ${firstName}, your roadmap is still ready for you. Pick one pending task today and restart your momentum.`;
    return {
      userId: profile.id,
      email: profile.email ?? "",
      displayName,
      roadmapId: roadmap.id,
      roadmapTitle: roadmap.title,
      weekId,
      reminderType: type,
      pendingTaskCount: progress.pendingTasks,
      dedupeKey: `inactive:${profile.id}:${isoWeekKey(now)}`,
      reason: `No recorded activity for at least ${inactiveDays} days`,
      subject: "Continue your CareerGuid AI roadmap",
      text: `${body}\n\nOpen your roadmap: ${link}`,
      html: emailDocument(title, body, link),
      notificationTitle: "Your roadmap is waiting",
      notificationMessage: `You have been inactive for ${inactiveDays} days. Continue your roadmap today.`,
      linkPath,
      metadata: { progressPercentage: progress.progressPercentage, overdueTasks: progress.overdueTasks },
    };
  }

  if (type === "weekly_pending_task") {
    const count = progress.currentWeek?.pendingTasks ?? progress.pendingTasks;
    const title = `Week ${weekNumber} still has ${count} pending ${count === 1 ? "task" : "tasks"}`;
    const body = `Hi ${firstName}, complete the pending work in your current roadmap week to stay on track.`;
    return {
      userId: profile.id,
      email: profile.email ?? "",
      displayName,
      roadmapId: roadmap.id,
      roadmapTitle: roadmap.title,
      weekId,
      reminderType: type,
      pendingTaskCount: count,
      dedupeKey: `weekly:${roadmap.id}:${weekId ?? isoWeekKey(now)}`,
      reason: `Week ${weekNumber} has ${count} pending ${count === 1 ? "task" : "tasks"}`,
      subject: `Your Week ${weekNumber} roadmap tasks are waiting`,
      text: `${body}\n\nOpen your roadmap: ${link}`,
      html: emailDocument(title, body, link),
      notificationTitle: "Pending roadmap tasks",
      notificationMessage: `You have ${count} pending ${count === 1 ? "task" : "tasks"} for Week ${weekNumber}.`,
      linkPath,
      metadata: { weekNumber, progressPercentage: progress.progressPercentage, overdueTasks: progress.overdueTasks },
    };
  }

  const title = "A small push can get you back on schedule";
  const body = `Hi ${firstName}, your roadmap progress is ${progress.progressPercentage}% while the expected checkpoint is about ${progress.expectedProgressPercentage}%. Choose one focused task and close the gap this week.`;
  return {
    userId: profile.id,
    email: profile.email ?? "",
    displayName,
    roadmapId: roadmap.id,
    roadmapTitle: roadmap.title,
    weekId,
    reminderType: "motivational",
    pendingTaskCount: progress.pendingTasks,
    dedupeKey: `motivational:${roadmap.id}:${weekId ?? isoWeekKey(now)}`,
    reason: `Progress ${progress.progressPercentage}% is below expected ${progress.expectedProgressPercentage}%`,
    subject: "A quick step can put your roadmap back on track",
    text: `${body}\n\nOpen your roadmap: ${link}`,
    html: emailDocument(title, body, link),
    notificationTitle: "Get back on track",
    notificationMessage: "Your roadmap progress is behind the current checkpoint. Complete one focused task today.",
    linkPath,
    metadata: { expectedProgressPercentage: progress.expectedProgressPercentage, progressPercentage: progress.progressPercentage, overdueTasks: progress.overdueTasks },
  };
};

const createOrRecoverReminder = async (candidate: ReminderCandidate) => {
  const client = getSupabaseStorageClient();
  const { data, error } = await client.from("reminder_logs").insert({
    user_id: candidate.userId,
    roadmap_id: candidate.roadmapId,
    week_id: candidate.weekId,
    reminder_type: candidate.reminderType,
    pending_task_count: candidate.pendingTaskCount,
    email_sent: false,
    email_status: "queued",
    dedupe_key: candidate.dedupeKey,
    reason: candidate.reason,
    metadata: candidate.metadata,
  }).select("*").single();

  if (!error && data) return { reminder: data, created: true };
  if ((error as { code?: string } | null)?.code !== "23505") {
    throw new HttpError(500, "Unable to create reminder log.", "REMINDER_LOG_CREATE_FAILED", false);
  }

  const existing = await client.from("reminder_logs").select("*").eq("dedupe_key", candidate.dedupeKey).maybeSingle();
  if (existing.error) throw new HttpError(500, "Unable to recover reminder state.", "REMINDER_LOG_RECOVERY_FAILED", false);
  return { reminder: existing.data, created: false };
};

const ensureEmailLog = async (candidate: ReminderCandidate, reminderLogId: string): Promise<string> => {
  const client = getSupabaseStorageClient();
  const existing = await client.from("email_logs")
    .select("id,status")
    .eq("reminder_log_id", reminderLogId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing.error) throw new HttpError(500, "Unable to load reminder email state.", "REMINDER_EMAIL_LOG_LOAD_FAILED", false);
  if (existing.data?.id && existing.data.status !== "failed") return existing.data.id as string;

  const inserted = await client.from("email_logs").insert({
    user_id: candidate.userId,
    email_to: candidate.email,
    email_subject: candidate.subject,
    email_type: candidate.reminderType,
    status: "queued",
    reminder_log_id: reminderLogId,
  }).select("id").single();
  if (inserted.error || !inserted.data) throw new HttpError(500, "Unable to create reminder email log.", "REMINDER_EMAIL_LOG_CREATE_FAILED", false);
  return inserted.data.id as string;
};

const enqueueCandidate = async (queue: Queue, candidate: ReminderCandidate): Promise<"queued" | "duplicate"> => {
  const client = getSupabaseStorageClient();
  const { reminder, created } = await createOrRecoverReminder(candidate);
  if (!reminder) return "duplicate";
  if (reminder.email_sent || reminder.email_status === "sent") return "duplicate";

  if (created) {
    const notificationResult = await client.from("notifications").insert({
      user_id: candidate.userId,
      title: candidate.notificationTitle,
      message: candidate.notificationMessage,
      type: candidate.reminderType,
      link_url: candidate.linkPath,
      reminder_log_id: reminder.id,
    });
    if (notificationResult.error) {
      logger.warn({ userId: candidate.userId, reminderLogId: reminder.id }, "unable to create reminder notification");
    }
  }

  const emailLogId = await ensureEmailLog(candidate, reminder.id as string);
  const jobData: ReminderEmailJobData = {
    reminderLogId: reminder.id as string,
    emailLogId,
    userId: candidate.userId,
    to: candidate.email,
    reminderType: candidate.reminderType,
    subject: candidate.subject,
    html: candidate.html,
    text: candidate.text,
  };

  await queue.add("send-reminder-email", jobData, {
    attempts: getEnv().REMINDER_EMAIL_JOB_ATTEMPTS,
    backoff: { type: "exponential", delay: 5_000 },
    removeOnComplete: 1_000,
    removeOnFail: 1_000,
  });
  return created ? "queued" : "duplicate";
};

export const reminderService = {
  async getPreferences(userId: string): Promise<ReminderPreferences> {
    const { data, error } = await getSupabaseStorageClient()
      .from("reminder_preferences")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new HttpError(500, "Unable to load reminder preferences.", "REMINDER_PREFERENCES_LOAD_FAILED", false);
    return toPreferences(data as PreferenceRow | undefined);
  },

  async updatePreferences(userId: string, patch: Partial<ReminderPreferences>): Promise<ReminderPreferences> {
    const current = await this.getPreferences(userId);
    const next = { ...current, ...patch };
    const { data, error } = await getSupabaseStorageClient().from("reminder_preferences").upsert({
      user_id: userId,
      email_enabled: next.emailEnabled,
      weekly_pending_enabled: next.weeklyPendingEnabled,
      inactive_enabled: next.inactiveEnabled,
      motivational_enabled: next.motivationalEnabled,
    }, { onConflict: "user_id" }).select("*").single();
    if (error || !data) throw new HttpError(500, "Unable to save reminder preferences.", "REMINDER_PREFERENCES_SAVE_FAILED", false);
    return toPreferences(data as PreferenceRow);
  },

  async getLogs(userId: string, limit = 25) {
    const { data, error } = await getSupabaseStorageClient().from("reminder_logs")
      .select("id,roadmap_id,week_id,reminder_type,pending_task_count,email_sent,email_status,email_error,sent_at,reason,metadata,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(Math.max(1, Math.min(limit, 100)));
    if (error) throw new HttpError(500, "Unable to load reminder history.", "REMINDER_LOGS_LOAD_FAILED", false);
    return data ?? [];
  },

  async getStatus(userId: string) {
    const client = getSupabaseStorageClient();
    const [preferences, latestReminder, activeRoadmap, unreadResult, includedInPlan] = await Promise.all([
      this.getPreferences(userId),
      client.from("reminder_logs").select("id,roadmap_id,week_id,reminder_type,pending_task_count,email_sent,email_status,sent_at,reason,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      client.from("roadmaps").select("id,progress_percentage,duration_weeks").eq("user_id", userId).eq("is_active", true).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      client.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("is_read", false),
      billingService.hasFeature(userId, "weekly_reminders"),
    ]);

    if (latestReminder.error || activeRoadmap.error || unreadResult.error) {
      throw new HttpError(500, "Unable to load reminder status.", "REMINDER_STATUS_LOAD_FAILED", false);
    }

    let progress = null;
    if (activeRoadmap.data?.id) {
      const [weeksResult, tasksResult] = await Promise.all([
        client.from("roadmap_weeks").select("id,roadmap_id,week_number,title,start_date,due_date").eq("roadmap_id", activeRoadmap.data.id).order("week_number", { ascending: true }),
        client.from("roadmap_tasks").select("id,roadmap_id,week_id,status,due_date").eq("roadmap_id", activeRoadmap.data.id),
      ]);
      if (!weeksResult.error && !tasksResult.error) {
        progress = calculateRoadmapProgress(activeRoadmap.data, (weeksResult.data ?? []) as WeekRow[], (tasksResult.data ?? []) as TaskRow[]);
      }
    }

    return {
      preferences,
      includedInPlan,
      lastReminder: latestReminder.data ?? null,
      unreadNotifications: unreadResult.count ?? 0,
      progress,
    };
  },

  async scanAndEnqueue(): Promise<ReminderScanResult> {
    const env = getEnv();
    const client = getSupabaseStorageClient();
    const queue = createQueue("emailQueue");
    const result: ReminderScanResult = {
      scannedUsers: 0,
      scannedRoadmaps: 0,
      queuedReminders: 0,
      duplicatesSkipped: 0,
      skippedDisabled: 0,
      errors: 0,
    };

    try {
      const roadmapsResult = await client.from("roadmaps")
        .select("id,user_id,title,duration_weeks,progress_percentage,created_at")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(env.REMINDER_SCAN_BATCH_SIZE);
      if (roadmapsResult.error) throw new HttpError(500, "Unable to scan active roadmaps.", "REMINDER_SCAN_ROADMAPS_FAILED", false);

      const allRoadmaps = (roadmapsResult.data ?? []) as RoadmapRow[];
      const seenUsers = new Set<string>();
      const roadmaps = allRoadmaps.filter((roadmap) => {
        if (seenUsers.has(roadmap.user_id)) return false;
        seenUsers.add(roadmap.user_id);
        return true;
      });
      result.scannedRoadmaps = roadmaps.length;
      result.scannedUsers = seenUsers.size;
      if (roadmaps.length === 0) return result;

      const userIds = roadmaps.map((row) => row.user_id);
      const roadmapIds = roadmaps.map((row) => row.id);
      const [profilesResult, preferencesResult, weeksResult, tasksResult, paidReminderUsers] = await Promise.all([
        client.from("profiles").select("id,email,full_name,last_activity_at,onboarding_completed").in("id", userIds),
        client.from("reminder_preferences").select("user_id,email_enabled,weekly_pending_enabled,inactive_enabled,motivational_enabled").in("user_id", userIds),
        client.from("roadmap_weeks").select("id,roadmap_id,week_number,title,start_date,due_date").in("roadmap_id", roadmapIds).order("week_number", { ascending: true }),
        client.from("roadmap_tasks").select("id,roadmap_id,week_id,status,due_date").in("roadmap_id", roadmapIds),
        billingService.getUsersWithFeature(userIds, "weekly_reminders"),
      ]);

      if (profilesResult.error || preferencesResult.error || weeksResult.error || tasksResult.error) {
        throw new HttpError(500, "Unable to load reminder scan data.", "REMINDER_SCAN_DATA_FAILED", false);
      }

      const profiles = new Map(((profilesResult.data ?? []) as ProfileRow[]).map((row) => [row.id, row]));
      const preferences = new Map(((preferencesResult.data ?? []) as PreferenceRow[]).map((row) => [row.user_id, row]));
      const allWeeks = (weeksResult.data ?? []) as WeekRow[];
      const allTasks = (tasksResult.data ?? []) as TaskRow[];
      const now = new Date();
      const inactiveCutoff = now.getTime() - (env.REMINDER_INACTIVE_DAYS * 86_400_000);

      for (const roadmap of roadmaps) {
        const profile = profiles.get(roadmap.user_id);
        if (!profile?.onboarding_completed || !profile.email?.trim()) continue;
        if (!paidReminderUsers.has(profile.id)) {
          result.skippedDisabled += 1;
          continue;
        }

        const prefs = toPreferences(preferences.get(profile.id));
        if (!prefs.emailEnabled) {
          result.skippedDisabled += 1;
          continue;
        }

        const weeks = allWeeks.filter((week) => week.roadmap_id === roadmap.id);
        const tasks = allTasks.filter((task) => task.roadmap_id === roadmap.id);
        const progress = calculateRoadmapProgress(roadmap, weeks, tasks);
        const inactive = Boolean(profile.last_activity_at && Date.parse(profile.last_activity_at) <= inactiveCutoff);

        let reminderType: ReminderType | null = null;
        if (inactive && prefs.inactiveEnabled) reminderType = "inactive_user";
        else if ((progress.currentWeek?.pendingTasks ?? 0) > 0 && prefs.weeklyPendingEnabled) reminderType = "weekly_pending_task";
        else if (progress.behindSchedule && prefs.motivationalEnabled) reminderType = "motivational";
        else if (inactive || (progress.currentWeek?.pendingTasks ?? 0) > 0 || progress.behindSchedule) result.skippedDisabled += 1;

        if (!reminderType) continue;
        const candidate = buildCandidate(reminderType, profile, roadmap, progress, now);

        try {
          const queued = await enqueueCandidate(queue, candidate);
          if (queued === "queued") result.queuedReminders += 1;
          else result.duplicatesSkipped += 1;
        } catch (error) {
          result.errors += 1;
          logger.error({ err: error, userId: profile.id, roadmapId: roadmap.id, reminderType }, "reminder candidate enqueue failed");
        }
      }

      return result;
    } finally {
      await queue.close().catch(() => undefined);
    }
  },
};