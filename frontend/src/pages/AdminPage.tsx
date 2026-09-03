import { Activity, AlertTriangle, BookOpen, BriefcaseBusiness, ChevronRight, CircleUserRound, Database, FileWarning, RefreshCw, ShieldCheck, Sparkles, Users, X } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { adminService, type AdminAnalytics, type AdminJobRole, type AdminKnowledgeDocument, type AdminLogs, type AdminReminder, type AdminSkill, type AdminUser, type AdminUserDetail } from "../services/admin.service";

const sections = [
  { path: "/admin", label: "Overview", icon: Activity },
  { path: "/admin/users", label: "Users", icon: Users },
  { path: "/admin/job-roles", label: "Roles & skills", icon: BriefcaseBusiness },
  { path: "/admin/knowledge-base", label: "Knowledge base", icon: BookOpen },
  { path: "/admin/reminders", label: "Reminders", icon: Sparkles },
  { path: "/admin/logs", label: "Logs", icon: FileWarning },
];

const formatDate = (value?: string | null): string => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

const messageOf = (error: unknown): string => error instanceof Error ? error.message : "Admin request failed.";

export const AdminPage = (): JSX.Element => {
  const location = useLocation();
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<AdminJobRole[]>([]);
  const [skills, setSkills] = useState<AdminSkill[]>([]);
  const [documents, setDocuments] = useState<AdminKnowledgeDocument[]>([]);
  const [reminders, setReminders] = useState<AdminReminder[]>([]);
  const [logs, setLogs] = useState<AdminLogs | null>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUserDetail | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const activeSection = useMemo(() => sections.find((section) => section.path === location.pathname) ?? sections[0], [location.pathname]);

  const loadCurrent = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError("");
    try {
      const metrics = await adminService.analytics();
      setAnalytics(metrics);
      if (location.pathname === "/admin/users") {
        setUsers((await adminService.users(search)).items);
      } else if (location.pathname === "/admin/job-roles") {
        const [nextRoles, nextSkills] = await Promise.all([adminService.jobRoles(), adminService.skills()]);
        setRoles(nextRoles);
        setSkills(nextSkills);
      } else if (location.pathname === "/admin/knowledge-base") {
        setDocuments(await adminService.knowledgeBase());
      } else if (location.pathname === "/admin/reminders") {
        setReminders(await adminService.reminders());
      } else if (location.pathname === "/admin/logs") {
        setLogs(await adminService.logs());
      }
    } catch (caught) {
      setError(messageOf(caught));
    } finally {
      setLoading(false);
    }
  }, [location.pathname, search]);

  useEffect(() => { void loadCurrent(); }, [loadCurrent]);

  const run = async (key: string, action: () => Promise<unknown>, successMessage: string): Promise<void> => {
    setBusy(key);
    setError("");
    setSuccess("");
    try {
      await action();
      setSuccess(successMessage);
      await loadCurrent();
    } catch (caught) {
      setError(messageOf(caught));
    } finally {
      setBusy("");
    }
  };

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand"><ShieldCheck size={22} /><div><strong>Admin Console</strong><span>CareerGuid AI</span></div></div>
        <nav aria-label="Admin sections">
          {sections.map(({ path, label, icon: Icon }) => (
            <Link key={path} to={path} className={location.pathname === path ? "admin-nav active" : "admin-nav"}>
              <Icon size={17} /><span>{label}</span><ChevronRight size={15} />
            </Link>
          ))}
        </nav>
        <Link className="admin-back-link" to="/dashboard">Back to user dashboard</Link>
      </aside>

      <section className="admin-content">
        <header className="admin-header">
          <div><span className="admin-eyebrow">Protected admin workspace</span><h1>{activeSection.label}</h1></div>
          <button className="admin-button secondary" type="button" onClick={() => void loadCurrent()} disabled={loading}><RefreshCw size={16} /> Refresh</button>
        </header>

        {error && <div className="admin-alert error"><AlertTriangle size={18} />{error}</div>}
        {success && <div className="admin-alert success"><ShieldCheck size={18} />{success}</div>}
        {loading ? <div className="admin-loading">Loading verified admin data…</div> : (
          <>
            {location.pathname === "/admin" && <Overview analytics={analytics} />}
            {location.pathname === "/admin/users" && <UsersSection users={users} search={search} setSearch={setSearch} selectedUser={selectedUser} setSelectedUser={setSelectedUser} onSelect={async (id) => {
              setBusy(`user:${id}`); setError("");
              try { setSelectedUser(await adminService.user(id)); } catch (caught) { setError(messageOf(caught)); } finally { setBusy(""); }
            }} busy={busy} />}
            {location.pathname === "/admin/job-roles" && <RolesSection roles={roles} skills={skills} busy={busy} run={run} />}
            {location.pathname === "/admin/knowledge-base" && <KnowledgeSection documents={documents} busy={busy} run={run} />}
            {location.pathname === "/admin/reminders" && <RemindersSection reminders={reminders} />}
            {location.pathname === "/admin/logs" && <LogsSection logs={logs} />}
          </>
        )}
      </section>
    </main>
  );
};

const Overview = ({ analytics }: { analytics: AdminAnalytics | null }): JSX.Element => {
  const cards = [
    ["Users", analytics?.users ?? 0, Users],
    ["Onboarded", analytics?.onboardedUsers ?? 0, CircleUserRound],
    ["Active roles", analytics?.activeJobRoles ?? 0, BriefcaseBusiness],
    ["Active roadmaps", analytics?.activeRoadmaps ?? 0, Database],
    ["Paid subscriptions", analytics?.activePaidSubscriptions ?? 0, ShieldCheck],
    ["Failed AI jobs", analytics?.failedAiJobs ?? 0, AlertTriangle],
  ] as const;
  return <>
    <div className="admin-metric-grid">{cards.map(([label, value, Icon]) => <article className="admin-metric" key={label}><Icon size={20} /><span>{label}</span><strong>{value}</strong></article>)}</div>
    <section className="admin-panel"><h2>Phase 15 control center</h2><p>Use this console to inspect user onboarding, maintain canonical job-role and skill data, curate RAG knowledge, review reminders, and investigate failed AI/email operations. Every mutation remains behind the admin JWT guard and is written to the audit log.</p><div className="admin-quick-links">{sections.slice(1).map((section) => <Link to={section.path} key={section.path}>{section.label}<ChevronRight size={15} /></Link>)}</div></section>
  </>;
};

const UsersSection = ({ users, search, setSearch, selectedUser, setSelectedUser, onSelect, busy }: { users: AdminUser[]; search: string; setSearch: (value: string) => void; selectedUser: AdminUserDetail | null; setSelectedUser: (value: AdminUserDetail | null) => void; onSelect: (id: string) => Promise<void>; busy: string }): JSX.Element => (
  <>
    <section className="admin-panel admin-toolbar"><div><h2>User directory</h2><p>View onboarding and activity state without editing user-owned career data.</p></div><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or email" aria-label="Search users" /></section>
    <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>User</th><th>Status</th><th>Target role</th><th>Last activity</th><th /></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td><strong>{user.full_name || "Unnamed user"}</strong><span>{user.email}</span></td><td><span className={user.onboarding_completed ? "admin-badge success" : "admin-badge warning"}>{user.onboarding_completed ? "Onboarded" : "Incomplete"}</span>{user.role === "admin" && <span className="admin-badge">Admin</span>}</td><td>{user.target_job_role || "—"}</td><td>{formatDate(user.last_activity_at)}</td><td><button className="admin-text-button" type="button" disabled={busy === `user:${user.id}`} onClick={() => void onSelect(user.id)}>Inspect</button></td></tr>)}</tbody></table></div>
    {selectedUser && <div className="admin-drawer"><button className="admin-drawer-close" type="button" onClick={() => setSelectedUser(null)} aria-label="Close user details"><X size={18} /></button><h2>{selectedUser.profile.full_name || "User details"}</h2><p>{selectedUser.profile.email}</p><div className="admin-detail-grid"><Detail label="Onboarding" value={selectedUser.profile.onboarding_completed ? "Completed" : "Incomplete"} /><Detail label="Email verified" value={selectedUser.profile.email_verified ? "Yes" : "No"} /><Detail label="Resumes" value={selectedUser.resumes.length} /><Detail label="Skill analyses" value={selectedUser.analyses.length} /><Detail label="Roadmaps" value={selectedUser.roadmaps.length} /><Detail label="Subscriptions" value={selectedUser.subscriptions.length} /></div></div>}
  </>
);

const Detail = ({ label, value }: { label: string; value: string | number }): JSX.Element => <div className="admin-detail"><span>{label}</span><strong>{value}</strong></div>;

const RolesSection = ({ roles, skills, busy, run }: { roles: AdminJobRole[]; skills: AdminSkill[]; busy: string; run: (key: string, action: () => Promise<unknown>, message: string) => Promise<void> }): JSX.Element => {
  const [roleName, setRoleName] = useState(""); const [roleSlug, setRoleSlug] = useState(""); const [category, setCategory] = useState("");
  const [skillName, setSkillName] = useState(""); const [normalizedName, setNormalizedName] = useState(""); const [skillCategory, setSkillCategory] = useState("");
  const [mappingRole, setMappingRole] = useState(""); const [mappingSkill, setMappingSkill] = useState(""); const [priority, setPriority] = useState<"must_have" | "good_to_have" | "optional">("must_have");
  const submitRole = (event: FormEvent) => { event.preventDefault(); void run("create-role", () => adminService.createJobRole({ roleName, roleSlug, category: category || null }), "Job role created.").then(() => { setRoleName(""); setRoleSlug(""); setCategory(""); }); };
  const submitSkill = (event: FormEvent) => { event.preventDefault(); void run("create-skill", () => adminService.createSkill({ skillName, normalizedName, category: skillCategory || null }), "Skill created.").then(() => { setSkillName(""); setNormalizedName(""); setSkillCategory(""); }); };
  const submitMapping = (event: FormEvent) => { event.preventDefault(); if (!mappingRole || !mappingSkill) return; void run("map-skill", () => adminService.assignRoleSkill(mappingRole, { skillId: mappingSkill, priority, weight: priority === "must_have" ? 3 : priority === "good_to_have" ? 2 : 1 }), "Required skill mapping saved."); };
  return <>
    <div className="admin-form-grid">
      <form className="admin-panel admin-form" onSubmit={submitRole}><h2>Add job role</h2><input required value={roleName} onChange={(e) => setRoleName(e.target.value)} placeholder="Role name" /><input required value={roleSlug} onChange={(e) => setRoleSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} placeholder="role-slug" /><input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Category" /><button className="admin-button" disabled={busy === "create-role"}>Create role</button></form>
      <form className="admin-panel admin-form" onSubmit={submitSkill}><h2>Add canonical skill</h2><input required value={skillName} onChange={(e) => setSkillName(e.target.value)} placeholder="Skill name" /><input required value={normalizedName} onChange={(e) => setNormalizedName(e.target.value)} placeholder="normalized_name" /><input value={skillCategory} onChange={(e) => setSkillCategory(e.target.value)} placeholder="Category" /><button className="admin-button" disabled={busy === "create-skill"}>Create skill</button></form>
      <form className="admin-panel admin-form" onSubmit={submitMapping}><h2>Assign required skill</h2><select required value={mappingRole} onChange={(e) => setMappingRole(e.target.value)}><option value="">Select role</option>{roles.filter((role) => role.is_active).map((role) => <option value={role.id} key={role.id}>{role.role_name}</option>)}</select><select required value={mappingSkill} onChange={(e) => setMappingSkill(e.target.value)}><option value="">Select skill</option>{skills.map((skill) => <option value={skill.id} key={skill.id}>{skill.skill_name}</option>)}</select><select value={priority} onChange={(e) => setPriority(e.target.value as typeof priority)}><option value="must_have">Must have</option><option value="good_to_have">Good to have</option><option value="optional">Optional</option></select><button className="admin-button" disabled={busy === "map-skill"}>Save mapping</button></form>
    </div>
    <section className="admin-panel"><h2>Configured job roles</h2><div className="admin-role-list">{roles.map((role) => <article key={role.id} className="admin-role-card"><div><h3>{role.role_name}</h3><p>{role.category || "Uncategorised"} · {role.role_skills?.length ?? 0} required skills</p></div><div className="admin-chip-row">{(role.role_skills ?? []).slice(0, 8).map((mapping) => <span key={mapping.id} className="admin-chip">{mapping.skills?.skill_name ?? "Skill"} · {mapping.priority.replaceAll("_", " ")}</span>)}</div><button className="admin-text-button danger" type="button" disabled={!role.is_active || busy === `disable:${role.id}`} onClick={() => void run(`disable:${role.id}`, () => adminService.disableJobRole(role.id), "Job role disabled without deleting historical analyses.")}>{role.is_active ? "Disable role" : "Disabled"}</button></article>)}</div></section>
  </>;
};

const KnowledgeSection = ({ documents, busy, run }: { documents: AdminKnowledgeDocument[]; busy: string; run: (key: string, action: () => Promise<unknown>, message: string) => Promise<void> }): JSX.Element => {
  const [title, setTitle] = useState(""); const [category, setCategory] = useState(""); const [sourceUrl, setSourceUrl] = useState(""); const [content, setContent] = useState("");
  const submit = (event: FormEvent) => { event.preventDefault(); void run("create-kb", () => adminService.createKnowledgeBase({ title, category, sourceUrl: sourceUrl || null, content }), "Knowledge document saved. Reindex to make it retrievable.").then(() => { setTitle(""); setCategory(""); setSourceUrl(""); setContent(""); }); };
  return <>
    <form className="admin-panel admin-form admin-kb-form" onSubmit={submit}><div className="admin-panel-title"><div><h2>Add knowledge document</h2><p>Store curated source content only. Embeddings are generated separately by the protected reindex action.</p></div><button type="button" className="admin-button secondary" disabled={busy === "reindex"} onClick={() => void run("reindex", () => adminService.reindexKnowledgeBase(), "Knowledge-base reindex batch completed.")}><RefreshCw size={15} /> Reindex</button></div><div className="admin-form-row"><input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Document title" /><input required value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Category" /><input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://source.example (optional)" /></div><textarea required minLength={20} value={content} onChange={(e) => setContent(e.target.value)} rows={8} placeholder="Curated knowledge content…" /><button className="admin-button" disabled={busy === "create-kb"}>Save document</button></form>
    <section className="admin-panel"><h2>Knowledge base</h2><div className="admin-document-list">{documents.map((document) => <article key={document.id}><div><strong>{document.title}</strong><span>{document.category} · {formatDate(document.updated_at)}</span><p>{document.content.slice(0, 220)}{document.content.length > 220 ? "…" : ""}</p></div><button className="admin-text-button danger" type="button" disabled={busy === `delete-kb:${document.id}`} onClick={() => void run(`delete-kb:${document.id}`, () => adminService.deleteKnowledgeBase(document.id), "Knowledge document deleted.")}>Delete</button></article>)}</div></section>
  </>;
};

const RemindersSection = ({ reminders }: { reminders: AdminReminder[] }): JSX.Element => <section className="admin-panel"><h2>Reminder delivery history</h2><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>User</th><th>Type</th><th>Email</th><th>Created</th><th>Reason</th></tr></thead><tbody>{reminders.map((item) => <tr key={item.id}><td><strong>{item.profile?.full_name || "User"}</strong><span>{item.profile?.email || item.user_id}</span></td><td>{item.reminder_type.replaceAll("_", " ")}</td><td><span className={item.email_status === "sent" ? "admin-badge success" : item.email_status === "failed" ? "admin-badge danger" : "admin-badge"}>{item.email_status}</span></td><td>{formatDate(item.created_at)}</td><td>{item.reason || item.email_error || "—"}</td></tr>)}</tbody></table></div></section>;

const LogsSection = ({ logs }: { logs: AdminLogs | null }): JSX.Element => <div className="admin-log-grid">
  <section className="admin-panel"><h2>Audit trail</h2>{(logs?.auditLogs ?? []).map((item) => <div className="admin-log-row" key={item.id}><strong>{item.action}</strong><span>{item.entity_type || "entity"} · {formatDate(item.created_at)}</span></div>)}</section>
  <section className="admin-panel"><h2>Failed AI jobs</h2>{(logs?.failedAiJobs ?? []).length === 0 ? <p>No failed AI jobs in the recent window.</p> : (logs?.failedAiJobs ?? []).map((item) => <div className="admin-log-row error" key={item.id}><strong>{item.job_type}</strong><span>{item.error_message || "Unknown worker error"}</span><small>Retries: {item.retry_count} · {formatDate(item.created_at)}</small></div>)}</section>
  <section className="admin-panel"><h2>Failed emails</h2>{(logs?.failedEmails ?? []).length === 0 ? <p>No failed emails in the recent window.</p> : (logs?.failedEmails ?? []).map((item) => <div className="admin-log-row error" key={item.id}><strong>{item.email_type}</strong><span>{item.email_to}</span><small>{item.error_message || "Unknown email error"}</small></div>)}</section>
</div>;
