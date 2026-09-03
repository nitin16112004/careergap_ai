# CareerGuid AI Web Flow Document

## Page 1

CareerGuid AI Web Flow Document
Web Flow Document
Project: CareerGuid AI / SkillSight
Document Type: UX Web Flow Specification
Prepared For: AI Coding Agent Implementation
Role Perspective: UX Strategist
1. App Structure Overview
CareerGuid AI is a web app with these major areas:
Public Website
-> Authentication
-> Resume-first Onboarding
-> User Dashboard
-> Skill Gap Analysis
-> RAG Roadmap
-> ATS Resume Builder
-> Progress Tracking + Reminder System
-> Payment / Upgrade
-> Admin Panel
2. User Roles
2.1 Guest User
Can access:
/
/features
/pricing
/login
/signup
/forgot-password

## Page 2

Cannot access:
/dashboard
/onboarding
/roadmap
/resume-builder
/admin
If guest tries protected route, redirect to:
/login?redirect=/requested-path
2.2 Registered User
Can access:
/onboarding
/dashboard
/profile
/skill-gap
/roadmap
/resume-builder
/settings
/billing
2.3 Admin
Can access:
/admin
/admin/users
/admin/job-roles
/admin/knowledge-base
/admin/logs
/admin/reminders
3. Global Navigation Rules
3.1 Public Navbar
Visible on:

## Page 3

/
/features
/pricing
/login
/signup
Navbar items:
Logo: CareerGuid AI
Home
Features
Pricing
Login
Get Started
Button Action
Logo Navigate to /
Home Navigate to /
Features Navigate to /features
Pricing Navigate to /pricing
Login Navigate to /login
Get Started Navigate to /signup
3.2 Authenticated Sidebar
Visible after login.
Sidebar items:
Dashboard
Skill Gap
Roadmap
Resume Builder
Profile
Billing
Settings
Logout

## Page 4

Item Route
Dashboard /dashboard
Skill Gap /skill-gap
Roadmap /roadmap
Resume Builder /resume-builder
Profile /profile
Billing /billing
Settings /settings
Logout Clear session and redirect to /login
3.3 Route Guard Rules
After login:
If email not verified -> /verify-email
If onboarding not completed -> /onboarding/upload-resume
If onboarding completed -> /dashboard

## Page 5

4. Full Route Map
Page Route Access
Landing Page / Public
Features Page /features Public
Pricing Page /pricing Public
Login /login Public
Signup /signup Public
Verify Email /verify-email Logged-in, unverified
Forgot Password /forgot-password Public
Reset Password /reset-password Public
Resume Upload Onboarding /onboarding/upload-resume User
Auto-filled Profile Review /onboarding/review-profile User
Onboarding Complete /onboarding/success User
Dashboard /dashboard User
Skill Gap /skill-gap User
Roadmap /roadmap User
Roadmap Detail /roadmap/:roadmapId User
Resume Builder /resume-builder User
Resume Preview /resume-builder/:id/preview User
Profile /profile User
Billing /billing User
Settings /settings User
Admin Dashboard /admin Admin
Admin Users /admin/users Admin
Admin Job Roles /admin/job-roles Admin
Admin Knowledge Base /admin/knowledge-base Admin
Admin Reminder Logs /admin/reminders Admin
404 Page * All

## Page 6

5. Public Website Flow
5.1 Landing Page
Route:
/
Purpose: Explain product and convert visitors into users.
Sections:
Hero Section
Problem Section
How It Works
Features
AI Workflow Preview
Pricing Teaser
FAQ
Footer
Hero content:
Title: Build a job-ready career path with AI
Subtitle: Upload your resume, discover missing skills, generate a personalized 
roadmap, and create an ATS-friendly resume.
Primary CTA: Get Started
Secondary CTA: View Features
Button Behavior
Get Started Navigate to /signup
View Features Navigate to /features
Login Navigate to /login
Empty state: Not needed.
Error state:
Something went wrong while loading the page. Please refresh.
5.2 Features Page
Route:

## Page 7

/features
Feature cards:
Resume-first onboarding
AI resume parsing
Skill gap analysis
RAG-based roadmap
Weekly reminders
ATS resume builder
Progress dashboard
CTA:
Start Your Career Analysis
Button behavior:
Click -> /signup
5.3 Pricing Page
Route:
/pricing
Plans:
Free Plan
Pro Plan
Premium Plan
Free Plan
Includes:
1 resume upload
Basic skill gap analysis
Basic roadmap
Limited ATS resume generation
CTA:
Start Free
Behavior:

## Page 8

If guest -> /signup
If logged in -> /dashboard
Pro Plan
Includes:
Multiple resume uploads
Advanced roadmap
Weekly reminders
ATS resume downloads
Priority AI generation
CTA:
Upgrade to Pro
Behavior:
If guest -> /signup?plan=pro
If logged in -> /billing/checkout?plan=pro
Premium Plan
Includes:
AI mock interview
Advanced ATS scoring
Multiple role-based resumes
Career assistant chat
CTA:
Upgrade to Premium
Behavior:
If guest -> /signup?plan=premium
If logged in -> /billing/checkout?plan=premium

## Page 9

6. Authentication Flow
6.1 Signup Page
Route:
/signup
Fields:
Full Name
Email
Password
Confirm Password
Field Rule
Full Name Required, minimum 2 characters
Email Required, valid email
Password Minimum 8 characters
Confirm Password Must match password
Buttons:
Create Account
Continue with Google, optional
Already have an account? Login
Primary button behavior:
Click Create Account
-> Disable button
-> Show loading: Creating account...
-> Call signup API / Supabase Auth
-> If success -> /verify-email
-> If error -> show inline error
Success message:
Account created successfully. Please verify your email.

## Page 10

Error UI Message
Email already exists This email is already registered. Please login.
Weak password Password must be at least 8 characters.
Network error Unable to create account. Please try again.
6.2 Verify Email Page
Route:
/verify-email
Purpose: Verify user email using OTP or email verification link.
UI:
Title: Verify your email
Subtitle: Enter the OTP sent to your email.
OTP input: 6 digits
Button: Verify Email
Secondary Button: Resend OTP
Button Behavior
Verify Email Validate OTP and activate account
Resend OTP Send new OTP, start 60-second cooldown
Change Email Navigate back to signup or settings
Success:
Email verified successfully.
Redirecting to onboarding...
Redirect:
/onboarding/upload-resume
Error Message
Wrong OTP Invalid OTP. Please check and try again.
Expired OTP OTP expired. Please request a new one.
Too many attempts Too many attempts. Please try again later.

## Page 11

6.3 Login Page
Route:
/login
Fields:
Email
Password
Buttons:
Login
Forgot Password
Create Account
Login behavior:
User enters email and password
-> Click Login
-> Disable button
-> Show loading: Logging in...
-> Validate credentials
-> If email not verified -> /verify-email
-> If onboarding not completed -> /onboarding/upload-resume
-> If onboarding completed -> /dashboard
Rate-limit UX note:
The system should support at least 100 successful user logins per minute system-wide.
Legitimate successful logins should not be blocked by failed-attempt protection.
Failed attempts error:
Too many failed login attempts. Please wait 1 minute and try again.
Error Message
Wrong credentials Invalid email or password.
User not found Invalid email or password.
Network error Login failed. Please check your connection.
6.4 Forgot Password Page
Route:

## Page 12

/forgot-password
Fields:
Email
Button:
Send Reset Link / OTP
Behavior:
Enter email
-> Click Send Reset Link
-> Show loading
-> System sends password reset email
-> Show success message
Success state:
If an account exists with this email, password reset instructions have been sent.
Security note: Do not reveal whether email exists.
6.5 Reset Password Page
Route:
/reset-password
Fields:
New Password
Confirm New Password
Button:
Reset Password
Success:
Password reset successful. Please login again.
Redirect:

## Page 13

/login
7. Resume-First Onboarding Flow
7.1 Onboarding Step 1: Resume Upload
Route:
/onboarding/upload-resume
Purpose: User uploads resume first. No manual form appears before upload.
Page layout:
Title: Upload your resume to get started
Subtitle: We will auto-fill your profile using AI. You can edit or complete missing 
details later.
Upload Card
Supported formats: PDF, DOCX
Max size: 5 MB
Primary Button: Upload Resume
Secondary Button: Skip for now, optional
Upload component behavior:
Drag and drop resume
OR
Click Browse File
Accepted files:
.pdf
.docx
Rejected files:
.exe
.png
.jpg
.zip
.txt
Primary button behavior:

## Page 14

User selects file
-> Validate file type and size
-> Upload to Supabase Storage
-> Create resume parsing job
-> Show progress state
-> When parsing completes -> /onboarding/review-profile
Loading state:
Uploading your resume...
Analyzing your resume with AI...
Extracting your profile details...
Success state:
Resume analyzed successfully.
Error Message Button
Invalid file type Please upload a PDF or DOCX
resume.
Choose another file
File too large File size must be less than 5 MB.Choose another file
Upload failed Resume upload failed. Please try
again.
Retry
Parsing failed We could not extract your resume
details. You can retry or fill details
manually.
Retry / Fill manually
Skip behavior:
Click Skip for now
-> Show confirmation modal:
Without resume upload, profile auto-fill and skill extraction will not work properly.
Buttons:
- Upload Resume
- Continue Manually
If user chooses Continue Manually:
/onboarding/review-profile?manual=true
7.2 Onboarding Step 2: Review Auto-Filled Profile
Route:

## Page 15

/onboarding/review-profile
Purpose: Show extracted data in editable form.
Page title:
Review your profile details
Subtitle:
We auto-filled details from your resume. Please edit incorrect fields and complete 
missing details.
Field behavior:
Each field should show:
Label
Input value
Source badge: Auto-filled / Manual / Missing
Confidence indicator, optional
Edit option
Fields:
Full Name
Email
Phone Number
Current City
Education
Work Experience
Skills
Projects
LinkedIn URL
GitHub URL
Portfolio URL
Target Job Role
Preferred Location
Work Preference
Expected Salary
Notice Period
Career Goal
Source badge rules:
Condition Badge
Extracted from resume Auto-filled
User manually added Manual
Empty required field Missing

## Page 16

Required fields:
Full Name
Email
Phone Number
Education
Skills
Target Job Role
Preferred Location
Work Preference
Optional fields:
Portfolio URL
Expected Salary
Notice Period
Career Goal
Buttons:
Save and Continue
Back
Re-upload Resume
Save and Continue
Validate required fields
-> If valid, save profile
-> Mark onboarding completed
-> Navigate to /onboarding/success
Re-upload Resume
Show confirmation modal:
Re-uploading resume may replace auto-filled details.
Buttons:
- Cancel
- Re-upload
If confirm:
/onboarding/upload-resume
Validation errors:

## Page 17

Field Error
Empty full name Full name is required.
Invalid email Please enter a valid email.
Empty phone Phone number is required.
No skills Please add at least one skill.
No target role Please select your target job role.
No work preference Please select remote, hybrid, or onsite.
Success state:
Profile saved successfully.
7.3 Onboarding Success Page
Route:
/onboarding/success
UI:
Title: Your profile is ready
Subtitle: We have saved your details. Now let's analyze your skill gap.
Primary Button: Analyze Skill Gap
Secondary Button: Go to Dashboard
Button Route
Analyze Skill Gap /skill-gap
Go to Dashboard /dashboard
8. Dashboard Flow
Route:
/dashboard
Purpose: Central home for logged-in user.
Dashboard cards:

## Page 18

Profile Completion
Resume Match Score
Target Role
Skill Gap Summary
Roadmap Progress
Pending Tasks
ATS Resume Status
Reminder Status
Primary actions:
Analyze Skill Gap
Generate Roadmap
Build ATS Resume
Continue Roadmap
Update Profile
Condition Empty State
No resume uploaded Upload your resume to get AI-powered
recommendations.
No skill analysis Analyze your skill gap to see missing skills.
No roadmap Generate your personalized roadmap.
No ATS resume Build your first ATS-friendly resume.
Button Route
Upload Resume /onboarding/upload-resume
Analyze Skill Gap /skill-gap
Generate Roadmap /roadmap
Build ATS Resume /resume-builder
Continue Roadmap /roadmap
9. Skill Gap Flow
Route:
/skill-gap
Purpose: Analyze user skills against target job role.
Page sections:

## Page 19

Current Profile Summary
Target Job Role Selector
Skill Gap Result
Recommended Skills
CTA to Generate Roadmap
User actions:
Select target job role
Click Analyze Skill Gap
View match score
View missing skills
Generate roadmap
Analyze Skill Gap
Check if user profile exists
-> Check if skills exist
-> Call skill gap API
-> Show loading
-> Render result
Loading state:
Analyzing your skills...
Comparing your profile with target role...
Success state:
Skill gap analysis completed.
Result UI:
Match Score: 58%
Current Skills
Missing Skills
Recommended Learning Order
Empty state:
You need to complete your profile before analyzing skill gap.
Button: Complete Profile

## Page 20

Error Message
No skills found Please add skills to your profile first.
No target role selected Please select a target job role.
API failed Could not analyze skill gap. Please try again.
CTA:
Generate Personalized Roadmap
Behavior:
Navigate to /roadmap?generate=true
10. RAG Roadmap Flow
10.1 Roadmap Page
Route:
/roadmap
Purpose: Generate and track roadmap.
If no roadmap exists:
Title: Generate your personalized roadmap
Subtitle: Based on your target role and missing skills.
Button: Generate Roadmap
If roadmap exists:
Show active roadmap
Show progress
Show weekly tasks
Show pending tasks
10.2 Generate Roadmap Flow
Button:

## Page 21

Generate Roadmap
Behavior:
Click Generate Roadmap
-> Check skill gap analysis exists
-> Create roadmap generation job
-> Show loading state
-> When complete, show roadmap
Loading state:
Generating your personalized roadmap...
Retrieving learning resources...
Creating week-wise tasks...
Success state:
Your roadmap is ready.
Error Message
No skill gap found Please complete skill gap analysis first.
AI generation failed Roadmap generation failed. Please try again.
Rate limit reached You have reached your daily roadmap generation limit.
10.3 Roadmap Detail Screen
Route:
/roadmap/:roadmapId
Roadmap UI:
Roadmap title
Target role
Progress percentage
Week-wise accordion
Task list
Due dates
Complete buttons
Task card fields:

## Page 22

Task title
Task description
Week number
Due date
Status: Pending / Completed
Button: Mark Complete / Reopen
Mark Complete
Click Mark Complete
-> Update task status
-> Update progress percentage
-> Show success toast
Success toast:
Task marked as completed.
Reopen
Click Reopen
-> Change status back to pending
-> Update progress percentage
10.4 Roadmap Reminder UX
Condition Banner
User behind schedule You have pending tasks for this week. Complete them to
stay on track.
User inactive 7 days You have been inactive for 7 days. Continue your
roadmap today.
Reminder sent We sent you a reminder email about pending tasks.
Reminder email is automatic. User does not manually trigger it.
User can see reminder logs:
Last reminder sent: 27 June 2026
Reason: Week 2 pending tasks

## Page 23

11. ATS Resume Builder Flow
Route:
/resume-builder
Purpose: Generate ATS-friendly resume.
Initial screen:
Title: Build ATS-friendly resume
Subtitle: We will use your profile and target role to generate a professional resume.
Button: Generate Resume
User actions:
Generate resume
Preview resume
Edit resume content
Download PDF
Download DOCX
Generate behavior:
Click Generate Resume
-> Check user profile exists
-> Check target role exists
-> Retrieve ATS keywords
-> Generate resume content
-> Show preview
Loading state:
Generating your ATS-friendly resume...
Optimizing keywords...
Improving project descriptions...
Success state:
Your ATS-friendly resume is ready.
Editor sections:

## Page 24

Summary
Skills
Education
Projects
Experience
Certifications
Links
Button Behavior
Edit Section Make section editable
Save Changes Save edited content
Download PDF Generate/download PDF
Download DOCX Generate/download DOCX
Regenerate Generate new version
Error Message
Missing profile Please complete your profile first.
Missing target role Please select a target job role first.
AI failed Resume generation failed. Please try again.
Download failed Could not download resume. Please retry.
Free limit reached Upgrade to generate more resumes.
12. Profile Page Flow
Route:
/profile
Purpose: User can view and edit profile.
Sections:

## Page 25

Personal Details
Education
Experience
Skills
Projects
Links
Career Preferences
Resume History
Buttons:
Edit Profile
Save Changes
Cancel
Upload New Resume
Edit Profile
Enable form fields
Save Changes
Validate fields
Save changes
Show success toast
Upload New Resume
Navigate to /onboarding/upload-resume?source=profile
Success state:
Profile updated successfully.
Error state:
Could not update profile. Please try again.
13. Billing and Upgrade Flow
Route:

## Page 26

/billing
Purpose: Manage plan and upgrade.
Billing page sections:
Current Plan
Usage Limits
Available Plans
Billing History
Upgrade CTA
Plans:
Free
Pro
Premium
Usage indicators:
Resume uploads used
Roadmap generations used
ATS resume generations used
AI assistant messages used
Example:
ATS Resume Generations: 1 / 3 used
Roadmap Generations: 2 / 5 used
13.1 Upgrade Flow
User clicks:
Upgrade to Pro
Flow:
Click Upgrade
-> Open plan confirmation screen
-> Select billing cycle: Monthly / Yearly
-> Click Continue to Payment
-> Redirect to payment provider checkout
-> Payment success or failure
Routes:

## Page 27

/billing
/billing/checkout?plan=pro
/billing/success
/billing/failed
Payment provider options:
Razorpay for India
Stripe for international
13.2 Checkout Page
Route:
/billing/checkout
UI:
Selected Plan
Plan Features
Billing Cycle
Price
Button: Pay Now
Button: Cancel
Button Behavior
Pay Now Open payment checkout
Cancel Return to /billing
13.3 Payment Success Page
Route:
/billing/success
UI:
Title: Payment successful
Subtitle: Your plan has been upgraded.
Button: Go to Dashboard
Behavior:

## Page 28

Update user subscription
Redirect to dashboard
13.4 Payment Failed Page
Route:
/billing/failed
UI:
Title: Payment failed
Subtitle: We could not complete your payment.
Buttons:
- Try Again
- Back to Billing
13.5 Upgrade Prompt Modals
Show upgrade modal when user reaches limit.
Examples:
You have reached your free ATS resume generation limit.
Upgrade to Pro to generate more resumes.
Buttons:
Upgrade Now
Maybe Later
Button Route
Upgrade Now /billing/checkout?plan=pro
Maybe Later Close modal
14. Settings Flow
Route:
/settings

## Page 29

Sections:
Account Settings
Notification Preferences
Password Settings
Delete Account
Notification preferences:
Weekly roadmap reminders
Motivational emails
Resume analysis emails
Product updates
Toggle behavior:
Toggle ON/OFF
-> Save preference immediately
-> Show toast: Preferences updated.
Delete account flow:
Click Delete Account
-> Show confirmation modal
-> User types DELETE
-> Confirm
-> Deactivate/delete account
-> Logout
15. Admin Flow
15.1 Admin Dashboard
Route:
/admin
Cards:

## Page 30

Total Users
Completed Onboarding
Resume Uploads
Roadmaps Generated
Reminder Emails Sent
Failed AI Jobs
15.2 Admin Users Page
Route:
/admin/users
Admin actions:
Search users
View profile
View roadmap progress
Disable user
Change role
15.3 Admin Job Roles Page
Route:
/admin/job-roles
Actions:
Create job role
Edit job role
Delete job role
Add required skills
Set skill priority
Button behavior:
Add Job Role -> open modal
Save -> create role
Edit -> open edit modal
Delete -> confirmation modal
15.4 Admin Knowledge Base Page
Route:

## Page 31

/admin/knowledge-base
Actions:
Upload document
Add manual content
Generate embeddings
Edit document
Delete document
Empty state:
No knowledge base documents yet. Add your first document to improve RAG responses.
15.5 Admin Reminder Logs Page
Route:
/admin/reminders
Shows:
User
Roadmap
Reminder type
Email status
Sent date
Filters:
Reminder type
Email sent status
Date range

## Page 32

16. Empty States Summary
Screen Empty State
Dashboard no resume Upload your resume to start your AI career analysis.
Dashboard no roadmap Generate a roadmap to start your learning journey.
Skill Gap no profile Complete your profile before analyzing skill gap.
Roadmap no tasks No roadmap tasks found. Generate a roadmap first.
Resume Builder no profile Complete your profile to generate ATS resume.
Billing no history No billing history available.
Admin users empty No users found.
Knowledge base empty No documents added yet.
17. Error States Summary
Situation Message
Network error Something went wrong. Please check your connection
and try again.
Unauthorized Your session has expired. Please login again.
Forbidden You do not have permission to access this page.
Resume upload failed Resume upload failed. Please try again.
Resume parsing failed We could not extract details from your resume. Retry or
fill manually.
AI generation failed AI generation failed. Please try again.
Payment failed Payment failed. Please try again.
Rate limit reached Too many requests. Please try again later.
Server error Server is temporarily unavailable. Please try again later.

## Page 33

18. Success States Summary
Action Success Message
Signup Account created successfully. Please verify your email.
Email verification Email verified successfully.
Login Logged in successfully.
Resume upload Resume uploaded successfully.
Resume parsing Resume analyzed successfully.
Profile save Profile saved successfully.
Skill gap Skill gap analysis completed.
Roadmap generation Your roadmap is ready.
Task complete Task marked as completed.
ATS resume Your ATS-friendly resume is ready.
PDF download Resume downloaded successfully.
Payment Payment successful. Your plan is upgraded.
Settings save Settings updated successfully.
19. Main User Journey
New User Journey
Landing Page
-> Signup
-> Verify Email
-> Resume Upload
-> Auto-filled Profile Review
-> Edit / Complete Missing Details
-> Onboarding Success
-> Skill Gap Analysis
-> Generate Roadmap
-> Dashboard
-> Track Tasks
-> Receive Reminder Emails
-> Build ATS Resume
-> Download Resume

## Page 34

Returning User Journey
Login
-> Dashboard
-> Continue Roadmap
-> Mark Tasks Complete
-> Generate / Edit ATS Resume
-> Download Resume
User Behind Schedule Journey
User has pending roadmap tasks
-> Weekly scheduler checks progress
-> System sends reminder email
-> User clicks email link
-> User lands on Roadmap page
-> Pending week is highlighted
-> User completes task
Upgrade Journey
User reaches free limit
-> Upgrade modal appears
-> User clicks Upgrade Now
-> Checkout page
-> Payment
-> Payment success
-> Plan upgraded
-> User continues premium action
20. Button Behavior Rules
Global rules:
All primary buttons must show loading state after click.
All API buttons must be disabled while request is running.
All destructive actions must show confirmation modal.
All successful actions must show toast.
All failed actions must show clear error message.
Primary button states:

## Page 35

Default
Hover
Loading
Disabled
Success
Error
Example:
Button: Generate Roadmap
Default text: Generate Roadmap
Loading text: Generating...
Success: Show toast and display roadmap
Error: Show error message and keep button enabled
21. Form Behavior Rules
All forms should support:
Inline validation
Required field indicators
Disabled submit until required fields valid
Auto-save optional for long forms
Clear error when user edits field
Validation style:
Red border on invalid field
Small error text below field
Toast only for form-level error
22. AI Coding Agent Implementation
Notes
The frontend should implement:

## Page 36

ProtectedRoute component
PublicRoute component
AuthLayout
DashboardLayout
AdminLayout
Toast system
Modal system
Loading skeletons
EmptyState component
ErrorState component
FileUpload component
EditableProfileForm component
RoadmapTaskCard component
PlanCard component
UpgradeModal component
Recommended component structure:
src/
 ├── pages/
 │   ├── public/
 │   ├── auth/
 │   ├── onboarding/
 │   ├── dashboard/
 │   ├── skill-gap/
 │   ├── roadmap/
 │   ├── resume-builder/
 │   ├── billing/
 │   ├── settings/
 │   └── admin/
 ├── components/
 │   ├── layout/
 │   ├── forms/
 │   ├── common/
 │   ├── roadmap/
 │   ├── resume/
 │   └── billing/
 ├── services/
 │   ├── api.ts
 │   ├── auth.service.ts
 │   ├── onboarding.service.ts
 │   ├── roadmap.service.ts
 │   └── billing.service.ts
 ├── hooks/
 ├── store/
 ├── utils/
 └── routes/

## Page 37

23. Final UX Summary
CareerGuid AI should feel like a guided career assistant, not a complex dashboard.
The ideal experience is:
Upload resume first
-> Let AI do the heavy work
-> User only edits or completes missing details
-> Show clear skill gap
-> Generate simple week-wise roadmap
-> Help user stay consistent through reminders
-> Help user apply better with ATS resume
Main UX principle:
Reduce manual effort, give clear next steps, and keep the user motivated until they become job-
ready.
