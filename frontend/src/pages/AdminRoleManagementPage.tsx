import { AlertTriangle, BookOpen, BriefcaseBusiness, ChevronRight, FileWarning, ShieldCheck, Sparkles, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { adminService, type AdminJobRole, type AdminSkill } from "../services/admin.service";

const sections = [
  { path: "/admin", label: "Overview" },
  { path: "/admin/users", label: "Users" },
  { path: "/admin/job-roles", label: "Roles & skills" },
  { path: "/admin/knowledge-base", label: "Knowledge base" },
  { path: "/admin/reminders", label: "Reminders" },
  { path: "/admin/logs", label: "Logs" },
];

const normalizeSkillName = (value: string): string => value.trim().toLowerCase().replace(/\s+/g, "-");
const messageOf = (error: unknown): string => error instanceof Error ? error.message : "Admin request failed.";

export const AdminRoleManagementPage = (): JSX.Element => {
  const [roles, setRoles] = useState<AdminJobRole[]>([]);
  const [skills, setSkills] = useState<AdminSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [roleName, setRoleName] = useState("");
  const [roleSlug, setRoleSlug] = useState("");
  const [roleDescription, setRoleDescription] = useState("");
  const [roleCategory, setRoleCategory] = useState("");

  const [editRoleId, setEditRoleId] = useState("");
  const [editRoleName, setEditRoleName] = useState("");
  const [editRoleSlug, setEditRoleSlug] = useState("");
  const [editRoleDescription, setEditRoleDescription] = useState("");
  const [editRoleCategory, setEditRoleCategory] = useState("");

  const [skillName, setSkillName] = useState("");
  const [normalizedName, setNormalizedName] = useState("");
  const [skillCategory, setSkillCategory] = useState("");
  const [skillDescription, setSkillDescription] = useState("");

  const [editSkillId, setEditSkillId] = useState("");
  const [editSkillName, setEditSkillName] = useState("");
  const [editNormalizedName, setEditNormalizedName] = useState("");
  const [editSkillCategory, setEditSkillCategory] = useState("");
  const [editSkillDescription, setEditSkillDescription] = useState("");

  const [mappingRole, setMappingRole] = useState("");
  const [mappingSkill, setMappingSkill] = useState("");
  const [priority, setPriority] = useState<"must_have" | "good_to_have" | "optional">("must_have");
  const [skillLevel, setSkillLevel] = useState<"" | "beginner" | "intermediate" | "advanced">("");
  const [weight, setWeight] = useState(3);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError("");
    try {
      const [nextRoles, nextSkills] = await Promise.all([adminService.jobRoles(), adminService.skills()]);
      setRoles(nextRoles);
      setSkills(nextSkills);
    } catch (caught) {
      setError(messageOf(caught));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const run = async (key: string, action: () => Promise<unknown>, successMessage: string): Promise<boolean> => {
    setBusy(key);
    setError("");
    setSuccess("");
    try {
      await action();
      await load();
      setSuccess(successMessage);
      return true;
    } catch (caught) {
      setError(messageOf(caught));
      return false;
    } finally {
      setBusy("");
    }
  };

  const selectedRole = useMemo(() => roles.find((item) => item.id === editRoleId) ?? null, [roles, editRoleId]);
  const selectedSkill = useMemo(() => skills.find((item) => item.id === editSkillId) ?? null, [skills, editSkillId]);

  const chooseRole = (roleId: string): void => {
    const role = roles.find((item) => item.id === roleId);
    setEditRoleId(roleId);
    setEditRoleName(role?.role_name ?? "");
    setEditRoleSlug(role?.role_slug ?? "");
    setEditRoleDescription(role?.role_description ?? "");
    setEditRoleCategory(role?.category ?? "");
  };

  const chooseSkill = (skillId: string): void => {
    const skill = skills.find((item) => item.id === skillId);
    setEditSkillId(skillId);
    setEditSkillName(skill?.skill_name ?? "");
    setEditNormalizedName(skill?.normalized_name ?? "");
    setEditSkillCategory(skill?.category ?? "");
    setEditSkillDescription(skill?.description ?? "");
  };

  const createRole = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    const ok = await run("create-role", () => adminService.createJobRole({
      roleName,
      roleSlug,
      roleDescription: roleDescription || null,
      category: roleCategory || null,
    }), "Job role created.");
    if (ok) {
      setRoleName(""); setRoleSlug(""); setRoleDescription(""); setRoleCategory("");
    }
  };

  const updateRole = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    if (!editRoleId) return;
    await run("update-role", () => adminService.updateJobRole(editRoleId, {
      roleName: editRoleName,
      roleSlug: editRoleSlug,
      roleDescription: editRoleDescription || null,
      category: editRoleCategory || null,
    }), "Job role updated.");
  };

  const createSkill = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    const ok = await run("create-skill", () => adminService.createSkill({
      skillName,
      normalizedName,
      category: skillCategory || null,
      description: skillDescription || null,
    }), "Canonical skill created.");
    if (ok) {
      setSkillName(""); setNormalizedName(""); setSkillCategory(""); setSkillDescription("");
    }
  };

  const updateSkill = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    if (!editSkillId) return;
    await run("update-skill", () => adminService.updateSkill(editSkillId, {
      skillName: editSkillName,
      normalizedName: editNormalizedName,
      category: editSkillCategory || null,
      description: editSkillDescription || null,
    }), "Canonical skill updated.");
  };

  const saveMapping = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    if (!mappingRole || !mappingSkill) return;
    await run("save-mapping", () => adminService.assignRoleSkill(mappingRole, {
      skillId: mappingSkill,
      priority,
      skillLevel: skillLevel || null,
      weight,
    }), "Required skill mapping saved.");
  };

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand"><ShieldCheck size={22} /><div><strong>Admin Console</strong><span>CareerGuid AI</span></div></div>
        <nav aria-label="Admin sections">
          {sections.map((section) => (
            <Link key={section.path} to={section.path} className={section.path === "/admin/job-roles" ? "admin-nav active" : "admin-nav"}>
              {section.path === "/admin/users" ? <Users size={17} /> : section.path === "/admin/job-roles" ? <BriefcaseBusiness size={17} /> : section.path === "/admin/knowledge-base" ? <BookOpen size={17} /> : section.path === "/admin/reminders" ? <Sparkles size={17} /> : section.path === "/admin/logs" ? <FileWarning size={17} /> : <ShieldCheck size={17} />}
              <span>{section.label}</span><ChevronRight size={15} />
            </Link>
          ))}
        </nav>
        <Link className="admin-back-link" to="/dashboard">Back to user dashboard</Link>
      </aside>

      <section className="admin-content">
        <header className="admin-header"><div><span className="admin-eyebrow">Protected admin workspace</span><h1>Roles & skills</h1></div><button className="admin-button secondary" type="button" onClick={() => void load()} disabled={loading}>Refresh</button></header>
        {error && <div className="admin-alert error" role="alert"><AlertTriangle size={18} />{error}</div>}
        {success && <div className="admin-alert success" role="status"><ShieldCheck size={18} />{success}</div>}

        {loading ? <div className="admin-loading">Loading role and skill configuration…</div> : <>
          <div className="admin-form-grid">
            <form className="admin-panel admin-form" onSubmit={(event) => void createRole(event)}>
              <h2>Add job role</h2>
              <label className="admin-field"><span>Role name</span><input required value={roleName} onChange={(event) => { setRoleName(event.target.value); if (!roleSlug) setRoleSlug(event.target.value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")); }} /></label>
              <label className="admin-field"><span>Role slug</span><input required value={roleSlug} onChange={(event) => setRoleSlug(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} /></label>
              <label className="admin-field"><span>Description</span><textarea value={roleDescription} onChange={(event) => setRoleDescription(event.target.value)} rows={3} /></label>
              <label className="admin-field"><span>Category</span><input value={roleCategory} onChange={(event) => setRoleCategory(event.target.value)} /></label>
              <button className="admin-button" disabled={busy === "create-role"}>Create role</button>
            </form>

            <form className="admin-panel admin-form" onSubmit={(event) => void updateRole(event)}>
              <h2>Edit job role</h2>
              <label className="admin-field"><span>Job role</span><select required value={editRoleId} onChange={(event) => chooseRole(event.target.value)}><option value="">Select role</option>{roles.map((role) => <option key={role.id} value={role.id}>{role.role_name}{role.is_active ? "" : " (disabled)"}</option>)}</select></label>
              <label className="admin-field"><span>Role name</span><input required disabled={!selectedRole} value={editRoleName} onChange={(event) => setEditRoleName(event.target.value)} /></label>
              <label className="admin-field"><span>Role slug</span><input required disabled={!selectedRole} value={editRoleSlug} onChange={(event) => setEditRoleSlug(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} /></label>
              <label className="admin-field"><span>Description</span><textarea disabled={!selectedRole} value={editRoleDescription} onChange={(event) => setEditRoleDescription(event.target.value)} rows={3} /></label>
              <label className="admin-field"><span>Category</span><input disabled={!selectedRole} value={editRoleCategory} onChange={(event) => setEditRoleCategory(event.target.value)} /></label>
              <button className="admin-button" disabled={!selectedRole || busy === "update-role"}>Save role</button>
            </form>

            <form className="admin-panel admin-form" onSubmit={(event) => void createSkill(event)}>
              <h2>Add canonical skill</h2>
              <label className="admin-field"><span>Skill name</span><input required value={skillName} onChange={(event) => { setSkillName(event.target.value); if (!normalizedName) setNormalizedName(normalizeSkillName(event.target.value)); }} /></label>
              <label className="admin-field"><span>Normalized name</span><input required value={normalizedName} onChange={(event) => setNormalizedName(event.target.value)} /></label>
              <label className="admin-field"><span>Category</span><input value={skillCategory} onChange={(event) => setSkillCategory(event.target.value)} /></label>
              <label className="admin-field"><span>Description</span><textarea value={skillDescription} onChange={(event) => setSkillDescription(event.target.value)} rows={3} /></label>
              <button className="admin-button" disabled={busy === "create-skill"}>Create skill</button>
            </form>

            <form className="admin-panel admin-form" onSubmit={(event) => void updateSkill(event)}>
              <h2>Edit canonical skill</h2>
              <label className="admin-field"><span>Skill</span><select required value={editSkillId} onChange={(event) => chooseSkill(event.target.value)}><option value="">Select skill</option>{skills.map((skill) => <option key={skill.id} value={skill.id}>{skill.skill_name}</option>)}</select></label>
              <label className="admin-field"><span>Skill name</span><input required disabled={!selectedSkill} value={editSkillName} onChange={(event) => setEditSkillName(event.target.value)} /></label>
              <label className="admin-field"><span>Normalized name</span><input required disabled={!selectedSkill} value={editNormalizedName} onChange={(event) => setEditNormalizedName(event.target.value)} /></label>
              <label className="admin-field"><span>Category</span><input disabled={!selectedSkill} value={editSkillCategory} onChange={(event) => setEditSkillCategory(event.target.value)} /></label>
              <label className="admin-field"><span>Description</span><textarea disabled={!selectedSkill} value={editSkillDescription} onChange={(event) => setEditSkillDescription(event.target.value)} rows={3} /></label>
              <div className="admin-drawer-actions">
                <button className="admin-button" disabled={!selectedSkill || busy === "update-skill"}>Save skill</button>
                <button className="admin-button danger" type="button" disabled={!selectedSkill || busy === `delete-skill:${editSkillId}`} onClick={() => { if (selectedSkill && window.confirm(`Delete canonical skill “${selectedSkill.skill_name}”? Referenced skills cannot be deleted.`)) void run(`delete-skill:${editSkillId}`, () => adminService.deleteSkill(editSkillId), "Canonical skill deleted.").then((ok) => { if (ok) chooseSkill(""); }); }}>Delete skill</button>
              </div>
            </form>

            <form className="admin-panel admin-form" onSubmit={(event) => void saveMapping(event)}>
              <h2>Add or update required skill</h2>
              <label className="admin-field"><span>Job role</span><select required value={mappingRole} onChange={(event) => setMappingRole(event.target.value)}><option value="">Select role</option>{roles.filter((role) => role.is_active).map((role) => <option key={role.id} value={role.id}>{role.role_name}</option>)}</select></label>
              <label className="admin-field"><span>Skill</span><select required value={mappingSkill} onChange={(event) => setMappingSkill(event.target.value)}><option value="">Select skill</option>{skills.map((skill) => <option key={skill.id} value={skill.id}>{skill.skill_name}</option>)}</select></label>
              <label className="admin-field"><span>Priority</span><select value={priority} onChange={(event) => setPriority(event.target.value as typeof priority)}><option value="must_have">Must have</option><option value="good_to_have">Good to have</option><option value="optional">Optional</option></select></label>
              <label className="admin-field"><span>Skill level</span><select value={skillLevel} onChange={(event) => setSkillLevel(event.target.value as typeof skillLevel)}><option value="">Not specified</option><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></label>
              <label className="admin-field"><span>Weight (1–10)</span><input type="number" min={1} max={10} value={weight} onChange={(event) => setWeight(Math.min(10, Math.max(1, Number(event.target.value) || 1)))} /></label>
              <button className="admin-button" disabled={busy === "save-mapping"}>Save mapping</button>
            </form>
          </div>

          <section className="admin-panel">
            <h2>Configured job roles</h2>
            <div className="admin-role-list">{roles.map((role) => <article key={role.id} className="admin-role-card">
              <div><h3>{role.role_name}</h3><p>{role.category || "Uncategorised"} · {role.role_skills?.length ?? 0} required skills · {role.is_active ? "active" : "disabled"}</p></div>
              <div className="admin-chip-row">{(role.role_skills ?? []).map((mapping) => <span key={mapping.id} className="admin-chip">{mapping.skills?.skill_name ?? "Skill"} · {mapping.priority.replaceAll("_", " ")} · weight {mapping.weight}<button className="admin-text-button danger" type="button" aria-label={`Remove ${mapping.skills?.skill_name ?? "skill"} from ${role.role_name}`} disabled={!mapping.skills?.id || busy === `remove-map:${role.id}:${mapping.skills?.id ?? ""}`} onClick={() => { const skillId = mapping.skills?.id; if (skillId && window.confirm(`Remove ${mapping.skills?.skill_name ?? "this skill"} from ${role.role_name}?`)) void run(`remove-map:${role.id}:${skillId}`, () => adminService.removeRoleSkill(role.id, skillId), "Required skill mapping removed."); }}>Remove</button></span>)}</div>
              <button className="admin-text-button danger" type="button" disabled={!role.is_active || busy === `disable-role:${role.id}`} onClick={() => { if (window.confirm(`Disable ${role.role_name}? Historical analyses and roadmaps will be preserved.`)) void run(`disable-role:${role.id}`, () => adminService.disableJobRole(role.id), "Job role disabled without deleting historical data."); }}>{role.is_active ? "Disable role" : "Disabled"}</button>
            </article>)}</div>
          </section>

          <section className="admin-panel">
            <h2>Canonical skill catalog</h2>
            <div className="admin-document-list">{skills.map((skill) => <article key={skill.id}><div><strong>{skill.skill_name}</strong><span>{skill.normalized_name} · {skill.category || "Uncategorised"}</span><p>{skill.description || "No description"}</p></div><button className="admin-text-button" type="button" onClick={() => chooseSkill(skill.id)}>Edit</button></article>)}</div>
          </section>
        </>}
      </section>
    </main>
  );
};
