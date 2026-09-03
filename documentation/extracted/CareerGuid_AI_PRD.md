# CareerGuid AI PRD

## Page 1

Product Requirement Document
App Name: CareerGuid AI
Alternative name: SkillSight
1. Product Overview
CareerGuid AI is an AI-powered career guidance platform that helps students, freshers, and job seek-
ers analyze their resume, identify skill gaps, generate personalized learning roadmaps, and build ATS-
friendly resumes.
The platform uses AI/ML, RAG pipeline, GenAI agent, resume parsing, system design, Su-
pabase PostgreSQL, Supabase Storage, Redis, rate limiting, OTP verification, Docker de-
ployment, queue-based notifications, and scalable backend architecture .
The main purpose of this app is to help users answer:
“Mere current skills ke basis par mujhe target job role ke liye kya-kya improve karna chahiye?”
2. Vision Statement
T o build a smart AI career assistant that helps users become job-ready by analyzing their resume, identi-
fying missing skills, suggesting learning paths, sending progress reminders, and generating ATS-friendly
resumes for job applications.
3. Problem Statement
Many students and freshers face these problems:
1. Unhe pata nahi hota ki resume job role ke according strong hai ya nahi.
2. Resume me skills hain, lekin target job role ke required skills se match nahi hoti.
3. ATS-friendly resume banana difficult hota hai.
4. Learning roadmap clear nahi hota.
5. Interview preparation ke liye correct topics identify nahi kar pate.
6. Manual profile creation boring aur time-consuming hoti hai.
7. Users ko pata nahi hota ki unka resume me email, phone, skills, projects, experience properly
mention hai ya nahi.
8. Users roadmap generate kar lete hain, lekin timely complete nahi kar pate.
CareerGuid AI in problems ko solve karega using AI-based resume analysis, resume-first smart onboard-
ing, skill gap detection, RAG-based roadmap, progress tracking, weekly email reminders, and ATS re-
sume builder.
4. T arget Users
Primary Users
1

## Page 2

User T ype Description
Students College students looking for internships or fresher jobs
Freshers Recent graduates applying for entry-level roles
Job Seekers Candidates switching roles or preparing for interviews
Bootcamp Learners People learning tech skills and building job-ready profiles
Secondary Users
User T ype Description
Career Coaches Can use platform to guide students
T raining Institutes Can track student skill gaps
Colleges Can help students improve employability
Recruiters, future version Can view verified candidate profiles
5. User Roles
5.1 Guest User
A guest user can:
• Visit landing page
• View app overview
• View sample roadmap
• View pricing, if added later
• Register or login
5.2 Registered User
A registered user can:
• Create account
• Verify email using OTP
• Upload resume during onboarding
• Auto-fill profile from resume
• Edit incorrect auto-filled details
• Manually fill missing details
• Select target job role
• Analyze skill gap
• Generate RAG-based roadmap
• T rack roadmap progress
• Receive weekly reminder emails if roadmap tasks are pending
• Build ATS-friendly resume
• Download resume as PDF/DOCX
5.3 Admin
Admin can:
• Manage users
• Manage job roles
• Manage required skills
• Manage roadmap knowledge base
2

## Page 3

• Manage AI prompt templates
• View analytics
• Monitor failed resume parsing jobs
• View reminder logs
• View system logs
5.4 AI System / Agent
AI agent can:
• Parse resume
• Extract skills
• Auto-fill user profile
• Match skills with job role
• Generate learning roadmap
• Suggest ATS keywords
• Improve project descriptions
• Generate resume summary
• Recommend next learning steps
• Help track roadmap progress
6. Core Product Modules
6.1 Authentication Module
Features:
• Register
• Login
• Email verification using OTP
• Forgot password
• Reset password
• JWT authentication
• Password hashing using bcrypt
• Rate limiting using Redis
Authentication Flow
User registers
↓
System validates input
↓
OTP generated
↓
OTP stored in Redis with expiry
↓
OTP sent through email
↓
User verifies OTP
↓
Account activated
3

## Page 4

6.2 Smart Onboarding Module
When a user enters the app for the first time, the system will first ask the user to upload their resume .
The system will use AI-based resume parsing to automatically extract user details from the uploaded
resume and fill the onboarding form.
After auto-fill, the user can review all details. If some details are missing, the user can manually add
them. If any auto-filled detail is incorrect, the user can edit and update it before final submission.
Smart Onboarding Flow
User enters app for the first time
↓
Resume upload screen appears
↓
User uploads PDF/DOCX resume
↓
AI Resume Parser extracts details
↓
System auto-fills onboarding form
↓
User reviews auto-filled details
↓
User edits incorrect details or fills missing details
↓
User submits final profile
↓
Profile saved in Supabase PostgreSQL
↓
User redirected to dashboard
Auto-Filled Details from Resume
The system will try to automatically extract and fill:
Full name
Email
Phone number
Current city
Education
Work experience
Skills
Projects
LinkedIn URL
GitHub URL
Portfolio URL
Manually Filled or Edited Details
Some details may not be available in the resume, so the user can manually fill them:
Target job role
Preferred location
4

## Page 5

Work preference: Remote, Hybrid, Onsite
Expected salary
Notice period
Career goal
Also, the user can edit any auto-filled field if the extracted data is incorrect.
Field Source User Action
Full Name Auto-filled from resume User can edit
Email Auto-filled from resume User can edit
Phone Number Auto-filled from resume User can edit
Skills Auto-filled from resume User can add/remove skills
Projects Auto-filled from resume User can edit project details
LinkedIn URL Auto-filled if found User can edit/add
GitHub URL Auto-filled if found User can edit/add
Portfolio URL Auto-filled if found User can edit/add
T arget Job Role Manual User selects role
Preferred Location Manual User enters location
Work Preference Manual User selects remote/hybrid/onsite
Expected Salary Manual User enters expected salary
Notice Period Manual User enters notice period
Updated Feature Explanation
In this module, the onboarding process becomes resume-first. Instead of asking the user to manually
fill all details first, the system first asks the user to upload a resume.
The AI resume parser extracts important information such as name, email, phone number, education,
skills, experience, projects, LinkedIn, GitHub, and portfolio links.
After extraction, the form is automatically filled. The user only needs to review the details, correct
any wrong information, and complete the missing fields like target job role, preferred location, work
preference, expected salary, or notice period.
This reduces manual effort, saves time, and improves the onboarding experience.
User Story
As a first-time user, I want to upload my resume first, so that the system can automatically fill my profile
details and I only need to edit or complete the missing information.
Acceptance Criteria
User should see resume upload option first during onboarding.
User should be able to upload PDF/DOCX resume.
System should extract details from the resume.
System should auto-fill the onboarding form.
User should be able to edit auto-filled details.
User should be able to fill missing details manually.
User should be able to submit the final profile.
Final verified profile should be saved in Supabase PostgreSQL.
After successful onboarding, user should be redirected to the dashboard.
5

## Page 6

Final Short Version for PRD
Smart Onboarding Module: During first-time onboarding, the user will first upload their resume. The
system will parse the resume using AI and automatically fill details such as name, email, phone number,
education, skills, work experience, projects, LinkedIn, GitHub, and portfolio. After auto-fill, the user can
review the information, edit incorrect fields, and manually complete missing details such as target job
role, preferred location, work preference, expected salary, and notice period. Once reviewed, the user
submits the final profile, which is stored in Supabase PostgreSQL.
6.3 Resume Parsing Module
The system should support:
• PDF resume upload
• DOCX resume upload
• File size validation
• File type validation
• Resume text extraction
• Email extraction
• Phone extraction
• Skill extraction
• Education extraction
• Experience extraction
• Project extraction
• Certification extraction
• LinkedIn/GitHub/Portfolio extraction
6.4 Skill Gap Analysis Module
The user selects a target role.
Example roles:
• Backend Developer
• Frontend Developer
• Full Stack Developer
• Data Analyst
• AI/ML Engineer
• Cloud Engineer
• DevOps Engineer
• Java Developer
• MERN Stack Developer
The system compares:
User current skills
vs
Target role required skills
Output:
• Current skills
• Missing skills
• Recommended skills
• Match score
• Priority score
6

## Page 7

• Suggested learning order
Example:
Target Role: Backend Developer
Current Skills:
Java, SQL, HTML, CSS
Missing Skills:
Node.js, Express.js, MongoDB, REST API, JWT, Redis, System Design
Match Score:
58%
6.5 RAG-Based Career Guidance and Roadmap Generation Mod-
ule
RAG means Retrieval Augmented Generation .
The app will use a knowledge base containing:
• Job role requirements
• Skill descriptions
• Learning resources
• Interview questions
• Roadmaps
• Project ideas
• ATS keywords
• Resume writing tips
RAG Flow:
User profile + target role + skill gap
↓
Convert query into embedding
↓
Search Supabase pgvector index
↓
Retrieve relevant career data
↓
Send data to GenAI model
↓
Generate personalized roadmap
RAG-Based Roadmap Progress Reminder
When the GenAI/RAG system generates a personalized roadmap, the roadmap will be divided into week-
wise tasks.
Example:
Week 1: JavaScript basics
Week 2: Node.js and Express.js
Week 3: MongoDB and REST API
Week 4: JWT Authentication
7

## Page 8

Week 5: Backend Project
Week 6: System Design Basics
The user can mark tasks as completed from the dashboard. If the user is not completing tasks on time
or a weekly task is pending, the system will send a weekly email reminder .
Roadmap Reminder Flow
RAG generates personalized roadmap
↓
Roadmap saved in Supabase PostgreSQL
↓
User gets weekly tasks
↓
System checks progress every week
↓
If task is pending
↓
Email reminder sent to user
↓
User comes back and completes task
Reminder Logic
If currentWeekTask.status != completed:
Send weekly reminder email
If user inactive for 7 days:
Send progress reminder email
If roadmap progress < expected progress:
Send motivational email + pending tasks
Example email:
Subject: Your Backend Developer roadmap is pending
Hi Nitin,
You have not completed your Week 2 tasks yet.
Pending topics:
- Node.js basics
- Express.js routing
- REST API practice
Complete these tasks to stay on track for your Backend Developer goal.
New Features Added in Roadmap Module
Personalized roadmap generation
Week-wise learning plan
Task completion tracking
Roadmap progress percentage
8

## Page 9

Weekly email reminders
Inactive user reminder
Pending task reminder
Motivational progress email
Components Required
1. Roadmap Service
Responsible for:
Generating roadmap
Saving roadmap
Creating weekly milestones
Creating tasks
Updating task status
2. Progress T racking Service
Responsible for:
Track completed tasks
Track pending tasks
Calculate progress percentage
Check if user is behind schedule
3. Scheduler / Cron Job
Responsible for:
Run weekly check
Find users with pending roadmap tasks
Create reminder email jobs
4. Notification Service
Responsible for:
Send weekly reminder email
Send pending task email
Send motivational email
5. Message Queue
Use queue for async email sending.
Cron Job → Queue → Email Worker → Mail Sent
This avoids blocking the main backend server.
6.6 GenAI Career Agent
The GenAI agent will behave like a personal career mentor.
It will:
• Understand user profile
9

## Page 10

• Analyze current skills
• Understand target role
• Prioritize missing skills
• Generate weekly roadmap
• Recommend projects
• Recommend interview topics
• Suggest resume improvements
• Suggest next step after every milestone
• Help user stay consistent through roadmap reminders
Example output:
Week 1: JavaScript basics and Git
Week 2: Node.js and Express.js
Week 3: MongoDB and REST API
Week 4: Authentication using JWT
Week 5: Build backend project
Week 6: Learn system design basics
6.7 ATS-Friendly Resume Builder
The user can generate a professional resume using AI.
Features:
• AI resume summary generation
• Skills section optimization
• Project description improvement
• ATS keyword suggestions
• Role-based resume tailoring
• Grammar improvement
• Resume preview
• PDF download
• DOCX download
Flow:
User profile + target role
↓
AI suggests keywords
↓
AI generates resume content
↓
User previews resume
↓
User edits if needed
↓
Download as PDF/DOCX
6.8 Dashboard Module
The dashboard will show:
• Profile completion percentage
• Resume match score
• T arget role
10

## Page 11

• Missing skills
• Weekly roadmap
• Pending roadmap tasks
• Completed roadmap tasks
• Roadmap progress percentage
• Recommended projects
• ATS resume score
• Learning progress
• Recent AI suggestions
6.9 Notification Module
Notifications include:
• Welcome email
• OTP email
• Password reset email
• Roadmap generated notification
• Resume analysis completed notification
• Weekly roadmap reminder email
• Pending task reminder email
• Inactive user reminder email
• Motivational progress email
For high-level system design, email sending should be async.
User action / Cron job
↓
Backend creates email job
↓
Job pushed to queue
↓
Worker sends email
7. System Design Requirements
7.1 High-Level Architecture
User
↓
React Frontend
↓
Load Balancer / Nginx
↓
API Gateway
↓
Backend Services
- Auth Service
- Onboarding Service
- Resume Upload Service
- Resume Parsing Service
- Skill Gap Service
- RAG Service
- Roadmap Service
11

## Page 12

- Progress Tracking Service
- ATS Resume Builder Service
- Notification Service
Supporting Systems:
- Supabase PostgreSQL
- Supabase Storage
- Supabase pgvector for RAG embeddings
- Redis
- Message Queue
- Scheduler / Cron Job
- AI/ML Service
7.2 Supabase Usage
Supabase will replace MongoDB as the primary database layer. The project will use Supabase for:
• Supabase PostgreSQL for users, profiles, resumes, skill analysis, roadmaps, progress, and reminder
logs
• Supabase Storage for uploaded resumes and generated PDF/DOCX resumes
• Supabase pgvector for RAG embeddings and semantic retrieval
• Row Level Security policies to protect user-specific profile and roadmap data
7.3 Redis Usage
Redis will be used for:
• OTP storage
• Forgot password token
• Rate limiting
• T emporary session cache
• AI response caching
• Roadmap cache
• Queue support with BullMQ
Example:
otp:user@gmail.com = 459201
expiry = 5 minutes
7.4 Rate Limiting
Rate limiting should be applied in two layers: system-level throughput and anti-abuse protection .
The login API should not be limited globally to a very low number. The platform must support at least
100 users per minute logging in successfully under normal traffic.
System-Level Throughput Requirement
12

## Page 13

API / Flow Minimum Capacity Purpose
Login API 100 successful user logins/minute system-wide Allows multiple
users to login at the
same time without
blocking genuine
users
Register API 50 registrations/minute system-wide Supports user
growth during
campaigns or
college drives
Resume Upload API 100 uploads/hour system-wide Controls heavy file
uploads while
supporting normal
usage
AI Roadmap Generate 20 generations/day per user Controls AI cost and
prevents misuse
ATS Resume Generate 10 generations/day per user Controls AI/PDF
generation load
Anti-Abuse Rate Limits
API / Action Limit Applied On
Failed Login Attempts 5 failed
attempts/minute
Per IP + per email
Successful Login Requests 20
requests/minute
Per IP
Send OTP 3 requests/10
minutes
Per email + per IP
Forgot Password 3 requests/15
minutes
Per email + per IP
Resume Upload 10 uploads/hour Per user
AI Roadmap Generate 20 requests/day Per user
ATS Resume Generate 10 requests/day Per user
This design allows minimum 100 users per minute to login , while still protecting the system from
brute-force attacks, OTP spam, and AI misuse using Redis-based counters.
7.5 Load Balancer
Load balancer will distribute traffic between backend instances.
Request
↓
Load Balancer
↓
Backend 1 / Backend 2 / Backend 3
Benefits:
• Better scalability
• High availability
• No single backend overload
• Easy horizontal scaling
13

## Page 14

7.6 Roadmap Reminder System Design
RAG Service
↓
Roadmap Generator
↓
Roadmap saved in Supabase PostgreSQL
↓
Progress Tracking Service
↓
Scheduler / Cron Job
↓
Check pending weekly tasks
↓
Message Queue
↓
Email Worker
↓
Reminder Email sent to user
7.7 Docker Deployment
The app should be containerized using Docker.
Containers:
frontend-container
backend-container
ai-service-container
redis-container
nginx-container
worker-container
Supabase will be used as the managed backend database layer, so a MongoDB container is not required.
For local development, developers can either connect to a Supabase cloud project or use the Supabase
local development stack. Docker Compose will be used for the application services and VPS deployment.
8. Feature Categorization by Version
Version 0.1 — Prototype / Proof of Concept
Goal: Basic working demo.
Features
• Landing page
• Register/login UI
• Basic dashboard UI
• Resume upload UI
• Static skill gap result
• Static roadmap result
• Basic profile form
14

## Page 15

Purpose
This version is only for validating the idea and showing the UI flow.
Version 1.0 — MVP Release
Goal: Launch first usable product.
Category Features
Authentication Register, login, JWT authentication
Email Verification OTP generation, OTP verification using Redis
Smart Onboarding Resume-first onboarding, resume upload, auto-filled form, manual completion
Resume Parsing Extract name, email, phone, skills, education, experience, projects
Profile Auto-Fill Auto-fill details from resume
User Editing User can edit incorrect details and fill missing fields
Skill Gap Compare user skills with selected target role
Dashboard Show profile, missing skills, match score
Basic Roadmap Generate simple learning roadmap
Security Password hashing, input validation
Deployment Docker Compose local deployment with Supabase integration
Version 1.1 — ATS Resume Builder Release
Goal: Help users create job-ready resumes.
Category Features
Resume Builder AI-generated resume summary
ATS Optimization Role-based keywords
Resume Editing User can edit generated content
Download PDF download
Resume Preview Preview before download
Project Improvement AI improves project descriptions
Version 1.2 — RAG and GenAI Roadmap Release
Goal: Make guidance more personalized and intelligent.
Category Features
RAG Pipeline Supabase pgvector integration
Knowledge Base Job roles, skills, roadmaps, interview topics
AI Agent Personalized roadmap generation
Roadmap Structure Week-wise learning plan
T ask Structure T ask-based roadmap structure
Dashboard Roadmap saved in dashboard
Progress Basics Basic task completion status
Chat Assistant Ask career-related questions
Project Recommendation AI suggests projects based on role
Interview Prep AI suggests interview topics
15

## Page 16

Version 1.3 — Scalability and Security Release
Goal: Make system production-ready .
Category Features
Load Balancing Nginx / cloud load balancer
Rate Limiting Redis-based API rate limiting with minimum 100 successful
logins/minute system-wide
Queue System Async email and AI jobs
Monitoring Logs, error tracking
File Security File type and size validation
Forgot Password OTP/token-based reset
Welcome Email Async notification
AI Caching Cache repeated roadmap responses
Version 1.4 — Progress T racking and Reminder Release
Goal: Help users track learning journey and stay consistent.
Category Features
Progress T racker Mark roadmap tasks complete
Weekly Plan Week-wise learning plan
Roadmap Progress Progress percentage
Reminder System Weekly reminder emails
Pending T ask Notification Email if weekly task is pending
Inactive User Reminder Email if user inactive for 7 days
Motivational Email Motivation + pending tasks
Reminder Logs Store email reminder history
Dashboard Analytics Profile score, ATS score, roadmap progress
Version 2.0 — Advanced Career Platform
Goal: Convert product into a full career platform.
Category Features
Recruiter Portal Recruiters can view candidate profiles
College Dashboard College can track student readiness
AI Mock Interview Practice interviews with AI
Job Matching Match users with job postings
Multi-Resume Support Different resumes for different roles
Advanced ATS Score Detailed resume scoring
Mobile App Android/iOS app
Payment Plans Premium features
9. User Stories
16

## Page 17

Authentication
User Story 1
As a new user, I want to register using my email, so that I can create an account on the platform.
Acceptance Criteria
• User can enter name, email, and password
• Password is stored securely
• OTP is sent to email
• User must verify email before using dashboard
Smart Onboarding
User Story 2
As a first-time user, I want to upload my resume first, so that the system can automatically fill my profile
details and I only need to edit or complete the missing information.
Acceptance Criteria
• User should see resume upload option first during onboarding
• User should be able to upload PDF/DOCX resume
• System should extract details from the resume
• System should auto-fill the onboarding form
• User should be able to edit auto-filled details
• User should be able to fill missing details manually
• User should be able to submit the final profile
• Final verified profile should be saved in Supabase PostgreSQL
• After successful onboarding, user should be redirected to dashboard
Skill Gap Analysis
User Story 3
As a job seeker, I want to select a target job role, so that I can know which skills I am missing.
Acceptance Criteria
• User can select target role
• System fetches required skills
• System compares with user skills
• User sees current skills, missing skills, and match score
Roadmap Generation
User Story 4
As a learner, I want a personalized roadmap, so that I know what to study step by step.
17

## Page 18

Acceptance Criteria
• Roadmap is generated based on missing skills
• Roadmap is divided week-wise
• Roadmap includes topics and project suggestions
• Roadmap is saved in dashboard
Roadmap Reminder
User Story 5
As a user, I want to receive weekly reminders when I do not complete my roadmap tasks, so that I can
stay consistent with my learning plan.
Acceptance Criteria
• System should generate a week-wise roadmap
• User should be able to mark tasks as completed
• System should track roadmap progress
• System should check pending tasks weekly
• If weekly tasks are incomplete, system should send reminder email
• Reminder email should include pending topics
• System should not send duplicate reminders for the same week repeatedly
• User should be able to continue roadmap from dashboard
ATS Resume Builder
User Story 6
As a job seeker, I want to generate an ATS-friendly resume, so that I can apply to jobs with a better
resume.
Acceptance Criteria
• User can generate resume using profile data
• AI suggests keywords
• AI improves summary and project descriptions
• User can preview resume
• User can download resume as PDF
Forgot Password
User Story 7
As a user, I want to reset my password using OTP, so that I can recover my account securely .
Acceptance Criteria
• User enters email
• OTP/token sent to email
• OTP stored in Redis with expiry
• User verifies OTP
• User sets new password
18

## Page 19

• Old password is replaced with hashed new password
10. Functional Requirements
Authentication
• User should be able to register
• User should be able to login
• System should send OTP
• System should verify OTP
• User should be able to reset password
• JWT should protect private APIs
Onboarding
• User should upload resume first
• System should extract resume data
• System should auto-fill available fields
• User should edit incorrect auto-filled fields
• User should manually complete missing fields
• System should save final profile
Resume Analysis
• System should parse resume
• System should extract skills
• System should normalize skills
• System should compare with job role
• System should generate match score
Roadmap
• System should generate personalized roadmap
• Roadmap should be saved
• User should see roadmap in dashboard
• Roadmap should be divided week-wise
• User should be able to mark tasks as completed
• System should calculate progress percentage
Reminder System
• System should check roadmap progress weekly
• System should identify pending roadmap tasks
• System should send reminder emails
• System should send inactive user emails
• System should store reminder logs
• System should avoid duplicate reminders for the same week
ATS Resume Builder
• System should generate resume content
• System should suggest keywords
• User should preview resume
19

## Page 20

• User should download resume
11. Non-Functional Requirements
Performance
• Dashboard should load within 2 seconds
• Resume parsing should complete within reasonable time
• Large AI tasks should run asynchronously
• Cached roadmap should be returned quickly
• Reminder checks should run in background without affecting user APIs
Security
• Password hashing using bcrypt
• JWT authentication
• Redis OTP expiry
• Rate limiting
• Input validation
• File type validation
• File size validation
• HTTPS in production
Scalability
• Backend should support horizontal scaling
• AI service should be separately scalable
• Redis should support cache and rate limiting
• Queue should handle background jobs
• Supabase Storage should store uploaded resumes and generated resume files
• Scheduler and workers should run separately from main API server
Reliability
• Failed resume parsing jobs should be retryable
• Email jobs should be queued
• Reminder email jobs should be logged
• Logs should be maintained
• Supabase PostgreSQL backup and recovery should be planned
12. Success Metrics
Product Metrics
Metric T arget
Signup completion rate 60%+
Email verification success 80%+
Onboarding completion rate 70%+
Resume upload rate 75%+
Skill gap analysis usage 60%+ users
20

## Page 21

Metric T arget
Roadmap generation usage 50%+ users
Roadmap task completion rate 40%+
Weekly reminder open rate 30%+
ATS resume download rate 40%+ users
User retention after 7 days 25%+
T echnical Metrics
Metric T arget
API success rate 99%
Login throughput capacity Minimum 100 successful logins/minute
Resume parsing success 90%+
OTP delivery success 95%+
Reminder email delivery success 95%+
Average API response time Under 500ms for normal APIs
AI task failure rate Below 5%
System uptime 99%
AI Quality Metrics
Metric T arget
Skill extraction accuracy 85%+
Profile auto-fill accuracy 90%+
Roadmap relevance 80%+ positive feedback
ATS resume usefulness 80%+ positive feedback
13. Agile Development Plan
Workflow
The project will follow Agile/Scrum workflow.
Product Backlog
↓
Sprint Planning
↓
To Do
↓
In Progress
↓
Code Review
↓
Testing
↓
Done
↓
Sprint Demo
↓
Retrospective
21

## Page 22

Sprint Plan
Sprint 1: Authentication
Deliverables:
• Register
• Login
• JWT
• OTP verification
• Redis OTP storage
• Forgot password
Sprint 2: Smart Onboarding
Deliverables:
• Resume-first onboarding flow
• Resume upload
• Resume parsing
• Auto-filled profile form
• Edit incorrect details
• Manual missing details completion
Sprint 3: Skill Gap Analysis
Deliverables:
• T arget role selection
• Required skills database
• Skill comparison
• Match score
• Dashboard result
Sprint 4: RAG Roadmap
Deliverables:
• Knowledge base
• Supabase pgvector
• RAG retrieval
• GenAI roadmap
• Week-wise roadmap
• Save roadmap
Sprint 5: ATS Resume Builder
Deliverables:
• AI resume generation
• ATS keyword suggestions
• Resume preview
• PDF download
• DOCX download, optional
Sprint 6: Progress T racking and Reminder System
Deliverables:
22

## Page 23

• T ask completion tracking
• Roadmap progress percentage
• Weekly reminder email
• Inactive user reminder
• Pending task reminder
• Reminder logs
• Cron job / scheduler
• Queue-based email worker
Sprint 7: Scalability and Deployment
Deliverables:
• Docker setup
• Docker Compose
• Nginx reverse proxy
• Redis rate limiting
• Queue workers
• Logging
• Production deployment
14. MVP Definition
MVP Goal
The MVP should prove that the platform can:
1. Register and verify users
2. Upload resume first during onboarding
3. Parse resume
4. Auto-fill available details
5. Let users edit incorrect details
6. Let users manually complete missing details
7. Analyze skill gap
8. Generate basic roadmap
9. Show dashboard
MVP Features
• Register/login
• Email OTP verification
• Resume-first smart onboarding
• Resume upload
• Resume parsing
• Profile auto-fill
• Edit auto-filled details
• Manual missing details
• T arget role selection
• Skill gap analysis
• Basic roadmap
• Dashboard
Not Included in MVP
• Recruiter portal
23

## Page 24

• Payment system
• Mobile app
• Advanced AI mock interview
• College dashboard
• Advanced ATS scoring
• Advanced analytics
• Full weekly reminder automation, planned for Version 1.4
15. Supabase Database Design Update
The project will use Supabase PostgreSQL as the primary database instead of MongoDB. Supabase
will also be used for structured relational data, file metadata, storage integration, and optionally RAG
embeddings using pgvector.
15.1 Supabase Usage
Supabase PostgreSQL -> users, profiles, resumes, roadmaps, progress, reminder logs
Supabase Storage -> uploaded resumes and generated PDF/DOCX resumes
Supabase pgvector -> embeddings for RAG knowledge base and roadmap retrieval
Redis -> OTP, rate limiting, temporary tokens, cache, queue support
15.2 profiles T able
CREATE TABLE profiles (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
user_id UUID NOT NULL,
full_name TEXT,
email TEXT UNIQUE NOT NULL,
phone TEXT,
current_city TEXT,
education TEXT,
work_experience TEXT,
skills TEXT[],
projects JSONB,
linkedin_url TEXT,
github_url TEXT,
portfolio_url TEXT,
target_job_role TEXT,
preferred_location TEXT,
work_preference TEXT,
expected_salary TEXT,
notice_period TEXT,
career_goal TEXT,
onboarding_completed BOOLEAN DEFAULT FALSE,
created_at TIMESTAMP DEFAULT NOW(),
updated_at TIMESTAMP DEFAULT NOW()
);
15.3 resumes T able
CREATE TABLE resumes (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
user_id UUID NOT NULL,
file_url TEXT NOT NULL,
24

## Page 25

file_type TEXT,
extracted_text TEXT,
extracted_skills TEXT[],
extracted_profile JSONB,
parsing_status TEXT DEFAULT 'pending',
created_at TIMESTAMP DEFAULT NOW()
);
15.4 roadmaps T able
CREATE TABLE roadmaps (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
user_id UUID NOT NULL,
target_role TEXT NOT NULL,
weeks JSONB NOT NULL,
progress_percentage INT DEFAULT 0,
status TEXT DEFAULT 'active',
created_at TIMESTAMP DEFAULT NOW(),
updated_at TIMESTAMP DEFAULT NOW()
);
Example weeks JSONB value:
[
{
"weekNumber": 1,
"title": "JavaScript Basics" ,
"tasks": [
{
"taskId": "t1",
"title": "Learn variables and functions" ,
"status": "completed"
},
{
"taskId": "t2",
"title": "Practice loops" ,
"status": "pending"
}
],
"dueDate": "2026-07-05",
"status": "pending"
}
]
15.5 reminder_logs T able
CREATE TABLE reminder_logs (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
user_id UUID NOT NULL,
roadmap_id UUID NOT NULL,
week_number INT,
type TEXT,
email_sent BOOLEAN DEFAULT FALSE,
sent_at TIMESTAMP DEFAULT NOW()
);
25

## Page 26

15.6 rag_knowledge_base T able with pgvector
CREATE TABLE rag_knowledge_base (
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
title TEXT NOT NULL,
category TEXT,
content TEXT NOT NULL,
embedding VECTOR,
created_at TIMESTAMP DEFAULT NOW()
);
This table will store roadmap content, job role requirements, interview topics, ATS keywords, and learn-
ing resources for RAG-based retrieval.
16. APIs
Auth APIs
POST /api/auth/register
POST /api/auth/login
POST /api/auth/send-otp
POST /api/auth/verify-otp
POST /api/auth/forgot-password
POST /api/auth/reset-password
Onboarding APIs
POST /api/onboarding/resume-upload
POST /api/onboarding/auto-fill
PUT /api/onboarding/profile
GET /api/onboarding/profile
Skill Gap APIs
POST /api/skill-gap/analyze
GET /api/skill-gap/:userId
Roadmap APIs
POST /api/roadmap/generate
GET /api/roadmap/:userId
POST /api/roadmap/task/complete
GET /api/roadmap/progress/:userId
Reminder APIs
POST /api/reminders/check-weekly
GET /api/reminders/logs/:userId
ATS Resume APIs
POST /api/resume-builder/generate
GET /api/resume-builder/preview/:id
GET /api/resume-builder/download/pdf/:id
GET /api/resume-builder/download/docx/:id
26

## Page 27

17. Final Product Positioning
CareerGuid AI is not just a resume analyzer. It is a complete AI career preparation platform.
It helps users:
Upload resume
↓
Auto-fill profile
↓
Edit or complete missing details
↓
Understand current skills
↓
Find missing skills
↓
Get personalized roadmap
↓
Track roadmap progress
↓
Receive weekly reminders
↓
Build ATS-friendly resume
↓
Become job-ready
18. One-Line Resume Description
CareerGuid AI – AI-Powered Career Guidance Platform Designed a scalable AI-powered career
platform with resume-first smart onboarding, AI-based profile auto-fill, skill gap analysis, RAG-based
roadmap generation, weekly progress reminder emails, GenAI career agent, ATS-friendly resume
builder, Supabase PostgreSQL/Storage, Redis-based OTP/rate limiting, queue-based notifications,
Docker deployment, and system design architecture.
27
