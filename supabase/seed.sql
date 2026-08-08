-- Phase 1 seed data for CareerGuid AI.
-- Run after applying migrations.

insert into public.job_roles (role_name, role_slug, role_description, category)
values
  ('Backend Developer', 'backend-developer', 'Build APIs, services, databases, authentication, and scalable backend systems.', 'Software Engineering'),
  ('Frontend Developer', 'frontend-developer', 'Build responsive user interfaces, component systems, and client-side app flows.', 'Software Engineering'),
  ('Full Stack Developer', 'full-stack-developer', 'Build frontend, backend, database, and deployment pieces across the stack.', 'Software Engineering'),
  ('Data Analyst', 'data-analyst', 'Analyze data, build dashboards, query databases, and communicate insights.', 'Data'),
  ('AI/ML Engineer', 'ai-ml-engineer', 'Build machine learning, AI, and model-powered application workflows.', 'AI'),
  ('Cloud Engineer', 'cloud-engineer', 'Design, deploy, and operate cloud infrastructure and services.', 'Cloud'),
  ('DevOps Engineer', 'devops-engineer', 'Automate CI/CD, infrastructure, monitoring, and deployment workflows.', 'DevOps'),
  ('Java Developer', 'java-developer', 'Build backend applications and services using Java ecosystem tools.', 'Software Engineering'),
  ('MERN Stack Developer', 'mern-stack-developer', 'Build Express, React, and Node.js applications with the documented Supabase PostgreSQL backend.', 'Software Engineering')
on conflict (role_slug) do update
set
  role_name = excluded.role_name,
  role_description = excluded.role_description,
  category = excluded.category,
  is_active = true,
  updated_at = now();

insert into public.skills (skill_name, normalized_name, category, description)
values
  ('JavaScript', 'javascript', 'Programming Language', 'Core language for web development.'),
  ('TypeScript', 'typescript', 'Programming Language', 'Typed JavaScript for scalable frontend and backend apps.'),
  ('React.js', 'reactjs', 'Frontend', 'Component-based frontend library for building user interfaces.'),
  ('Node.js', 'nodejs', 'Backend', 'JavaScript runtime for backend services.'),
  ('Express.js', 'expressjs', 'Backend', 'Minimal Node.js web framework.'),
  ('PostgreSQL', 'postgresql', 'Database', 'Relational database used through Supabase PostgreSQL.'),
  ('Supabase', 'supabase', 'Backend Platform', 'PostgreSQL, Auth, Storage, and pgvector platform.'),
  ('Redis', 'redis', 'Infrastructure', 'In-memory cache, queue backend, rate limit, and temporary data store.'),
  ('Docker', 'docker', 'DevOps', 'Containerization for local and production deployment.'),
  ('REST API', 'restapi', 'Backend', 'HTTP API design and integration skill.'),
  ('JWT', 'jwt', 'Security', 'JSON Web Token authentication and authorization.'),
  ('System Design', 'systemdesign', 'Architecture', 'Design of scalable and reliable software systems.'),
  ('Python', 'python', 'Programming Language', 'Language used for AI service and scripting.'),
  ('FastAPI', 'fastapi', 'Backend', 'Python web framework for AI service APIs.'),
  ('RAG', 'rag', 'AI', 'Retrieval Augmented Generation for contextual AI responses.'),
  ('AI/ML', 'aiml', 'AI', 'Artificial intelligence and machine learning fundamentals.')
on conflict (normalized_name) do update
set
  skill_name = excluded.skill_name,
  category = excluded.category,
  description = excluded.description;

with aliases(skill_name, alias_name, normalized_alias) as (
  values
    ('JavaScript', 'JS', 'js'),
    ('JavaScript', 'ECMAScript', 'ecmascript'),
    ('TypeScript', 'TS', 'ts'),
    ('React.js', 'React', 'react'),
    ('Node.js', 'Node', 'node'),
    ('Node.js', 'NodeJS', 'nodejs'),
    ('Express.js', 'Express', 'express'),
    ('PostgreSQL', 'Postgres', 'postgres'),
    ('REST API', 'REST', 'rest'),
    ('JWT', 'JSON Web Token', 'jsonwebtoken'),
    ('System Design', 'HLD', 'hld'),
    ('System Design', 'LLD', 'lld'),
    ('AI/ML', 'Machine Learning', 'machinelearning'),
    ('AI/ML', 'Artificial Intelligence', 'artificialintelligence')
)
insert into public.skill_aliases (skill_id, alias_name, normalized_alias)
select skills.id, aliases.alias_name, aliases.normalized_alias
from aliases
join public.skills on skills.skill_name = aliases.skill_name
on conflict (skill_id, normalized_alias) do update
set alias_name = excluded.alias_name;

with role_skill_seed(role_slug, normalized_name, priority, skill_level, weight) as (
  values
    ('backend-developer', 'javascript', 'must_have', 'intermediate', 3),
    ('backend-developer', 'typescript', 'good_to_have', 'intermediate', 2),
    ('backend-developer', 'nodejs', 'must_have', 'intermediate', 3),
    ('backend-developer', 'expressjs', 'must_have', 'intermediate', 3),
    ('backend-developer', 'postgresql', 'must_have', 'intermediate', 3),
    ('backend-developer', 'redis', 'good_to_have', 'beginner', 2),
    ('backend-developer', 'restapi', 'must_have', 'intermediate', 3),
    ('backend-developer', 'jwt', 'must_have', 'beginner', 2),
    ('backend-developer', 'systemdesign', 'good_to_have', 'beginner', 2),
    ('frontend-developer', 'javascript', 'must_have', 'intermediate', 3),
    ('frontend-developer', 'typescript', 'must_have', 'intermediate', 3),
    ('frontend-developer', 'reactjs', 'must_have', 'intermediate', 3),
    ('frontend-developer', 'restapi', 'must_have', 'beginner', 2),
    ('full-stack-developer', 'javascript', 'must_have', 'intermediate', 3),
    ('full-stack-developer', 'typescript', 'must_have', 'intermediate', 3),
    ('full-stack-developer', 'reactjs', 'must_have', 'intermediate', 3),
    ('full-stack-developer', 'nodejs', 'must_have', 'intermediate', 3),
    ('full-stack-developer', 'expressjs', 'must_have', 'intermediate', 3),
    ('full-stack-developer', 'postgresql', 'must_have', 'intermediate', 3),
    ('full-stack-developer', 'supabase', 'good_to_have', 'beginner', 2),
    ('full-stack-developer', 'docker', 'good_to_have', 'beginner', 2),
    ('data-analyst', 'postgresql', 'must_have', 'intermediate', 3),
    ('data-analyst', 'python', 'good_to_have', 'beginner', 2),
    ('ai-ml-engineer', 'python', 'must_have', 'intermediate', 3),
    ('ai-ml-engineer', 'aiml', 'must_have', 'intermediate', 3),
    ('ai-ml-engineer', 'rag', 'good_to_have', 'beginner', 2),
    ('ai-ml-engineer', 'fastapi', 'good_to_have', 'beginner', 2),
    ('cloud-engineer', 'docker', 'must_have', 'intermediate', 3),
    ('cloud-engineer', 'systemdesign', 'good_to_have', 'beginner', 2),
    ('devops-engineer', 'docker', 'must_have', 'intermediate', 3),
    ('devops-engineer', 'redis', 'good_to_have', 'beginner', 2),
    ('devops-engineer', 'systemdesign', 'good_to_have', 'beginner', 2),
    ('java-developer', 'postgresql', 'must_have', 'intermediate', 3),
    ('java-developer', 'restapi', 'must_have', 'intermediate', 3),
    ('java-developer', 'jwt', 'good_to_have', 'beginner', 2),
    ('java-developer', 'systemdesign', 'good_to_have', 'beginner', 2),
    ('mern-stack-developer', 'javascript', 'must_have', 'intermediate', 3),
    ('mern-stack-developer', 'typescript', 'good_to_have', 'beginner', 2),
    ('mern-stack-developer', 'reactjs', 'must_have', 'intermediate', 3),
    ('mern-stack-developer', 'nodejs', 'must_have', 'intermediate', 3),
    ('mern-stack-developer', 'expressjs', 'must_have', 'intermediate', 3),
    ('mern-stack-developer', 'restapi', 'must_have', 'intermediate', 3),
    ('mern-stack-developer', 'jwt', 'good_to_have', 'beginner', 2)
)
insert into public.role_skills (role_id, skill_id, priority, skill_level, weight)
select job_roles.id, skills.id, role_skill_seed.priority, role_skill_seed.skill_level, role_skill_seed.weight
from role_skill_seed
join public.job_roles on job_roles.role_slug = role_skill_seed.role_slug
join public.skills on skills.normalized_name = role_skill_seed.normalized_name
on conflict (role_id, skill_id) do update
set
  priority = excluded.priority,
  skill_level = excluded.skill_level,
  weight = excluded.weight;

insert into public.plans (
  plan_name,
  plan_slug,
  description,
  price_monthly,
  price_yearly,
  currency,
  resume_upload_limit,
  roadmap_generation_limit,
  ats_resume_generation_limit,
  ai_chat_limit
)
values
  ('Free', 'free', 'Starter plan for validating resume-first career guidance.', 0, 0, 'INR', 1, 2, 1, 0),
  ('Pro', 'pro', 'Higher limits for active job seekers.', 499, 4990, 'INR', 10, 20, 10, 100),
  ('Premium', 'premium', 'Advanced career platform access for power users.', 999, 9990, 'INR', 25, 50, 25, 500)
on conflict (plan_slug) do update
set
  plan_name = excluded.plan_name,
  description = excluded.description,
  price_monthly = excluded.price_monthly,
  price_yearly = excluded.price_yearly,
  currency = excluded.currency,
  resume_upload_limit = excluded.resume_upload_limit,
  roadmap_generation_limit = excluded.roadmap_generation_limit,
  ats_resume_generation_limit = excluded.ats_resume_generation_limit,
  ai_chat_limit = excluded.ai_chat_limit,
  is_active = true;

insert into public.resume_templates (
  template_name,
  template_slug,
  description,
  preview_image_url,
  is_premium,
  is_active
)
values
  ('Classic ATS', 'classic-ats', 'Simple single-column ATS-friendly resume template.', null, false, true),
  ('Modern ATS', 'modern-ats', 'Clean two-section resume template for technical profiles.', null, false, true),
  ('Premium Focus', 'premium-focus', 'Premium layout for role-targeted resume versions.', null, true, true)
on conflict (template_slug) do update
set
  template_name = excluded.template_name,
  description = excluded.description,
  preview_image_url = excluded.preview_image_url,
  is_premium = excluded.is_premium,
  is_active = excluded.is_active;
