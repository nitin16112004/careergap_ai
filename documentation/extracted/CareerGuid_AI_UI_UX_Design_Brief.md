# CareerGuid AI UI UX Design Brief

## Page 1

UI/UX Design Brief
App: CareerGuid AI / SkillSight
Role: Senior UI/UX Designer
Purpose
This brief is written so an AI app builder can create the UI without guessing.
1. Design Vision
CareerGuid AI should feel like a modern AI career assistant: clean, trustworthy,
focused, and motivating.
The user should never feel confused about what to do next. The app should
guide them step by step:
Upload resume
-> AI auto-fills profile
-> User edits missing details
-> Skill gap analysis
-> Personalized roadmap
-> Weekly progress tracking
-> ATS resume builder
-> Job-ready profile
The design should combine:
• Clean SaaS dashboard style
• Friendly AI assistant feeling
• Career/professional trust
• Learning progress motivation
• Simple onboarding flow
Use Material Design-style color roles, component consistency, and hierarchy as
inspiration because Material Design provides structured color and typography
systems for accessible UI design.
Also follow platform-level usability principles from Apple Human Interface
Guidelines for layout clarity, readable typography, and user-friendly interaction
patterns.
1

## Page 2

2. Design Style
2.1 Overall Style Direction
Style name: Modern AI SaaS + Career Dashboard
Visual feeling:
Clean
Trustworthy
Professional
AI-powered
Soft
Motivating
Minimal
Premium
A void:
Too many gradients
Too much dark UI
Too many icons
Overloaded dashboard
Complex navigation
Aggressive colors
Unclear AI outputs
The app should feel similar to:
Reference What to take
Notion Clean layout, readable spacing, calm interface
Linear Sharp SaaS dashboard, clean cards, premium feel
Duolingo Progress motivation, streak/reminder psychology
Coursera Learning roadmap and course-like task structure
Grammarly AI suggestions and correction flow
Supabase Developer-friendly clean green-accent UI
3. Color Palette
3.1 Primary Brand Colors
Use a professional green-blue AI theme because the project uses Supabase and
career growth concepts.
2

## Page 3

Token Color Hex Usage
Primary Emerald Green #10B981 Main CTA,
active states,
success, progress
Primary Dark Deep Emerald #047857 Hover state,
strong emphasis
Primary Light Soft Mint #D1FAE5 Background
highlights
Secondary Indigo #4F46E5 AI features,
roadmap,
premium actions
Accent Sky Blue #0EA5E9 Links, info states,
charts
3.2 Neutral Colors
Token Color Hex Usage
Background Off White #F8FAFC Main page background
Surface White #FFFFFF Cards, forms, modals
Surface Soft Light Gray #F1F5F9 Secondary sections
Border Gray 200 #E2E8F0 Card borders, input borders
Text Primary Slate 900 #0F172A Headings
Text Secondary Slate 600 #475569 Paragraphs
Text Muted Slate 400 #94A3B8 Labels, hints
Disabled Gray 300 #CBD5E1 Disabled buttons
3.3 Semantic Colors
State Color Hex Usage
Success Green #22C55E Completed tasks, success toast
Warning Amber #F59E0B Pending tasks, reminders
Error Red #EF4444 Errors, validation
Info Blue #3B82F6 Informational banners
Premium Purple #8B5CF6 Upgrade plan, premium features
3.4 Gradient Usage
Use gradients only in hero, AI cards, and premium upgrade banners.
Primary gradient:
background: linear-gradient(135deg, #10B981 0%, #0EA5E9 100%);
3

## Page 4

AI gradient:
background: linear-gradient(135deg, #4F46E5 0%, #8B5CF6 100%);
Premium gradient:
background: linear-gradient(135deg, #7C3AED 0%, #EC4899 100%);
Do not use gradients on every card. Most UI should stay clean and white.
4. Accessibility Rules
The app should follow WCAG 2.2 accessibility standards. Normal text should
target at least 4.5:1 contrast, and large text at least 3:1.
Rules:
All text must be readable on background.
Do not use color alone to show status.
Every icon-only button must have aria-label.
Inputs must have labels.
Focus states must be visible.
Buttons must be keyboard accessible.
Error messages must appear near the field.
Focus ring:
outline: 2px solid #10B981;
outline-offset: 2px;
5. Typography
5.1 Font Family
Use:
font-family: "Inter", "Segoe UI", Roboto, Arial, sans-serif;
Reason: Inter is modern, clean, readable, and common in SaaS dashboards.
5.2 Type Scale
Style Size Weight Line Height Usage
Display 48px 700 56px Landing hero title
H1 36px 700 44px Page title
H2 28px 700 36px Section title
4

## Page 5

Style Size Weight Line Height Usage
H3 22px 600 30px Card title
H4 18px 600 26px Subsection title
Body Large 16px 400 26px Main content
Body 14px 400 22px Dashboard text
Caption 12px 500 18px Labels, badges
Button 14px 600 20px Buttons
5.3 Typography Rules
Use H1 only once per page.
Use body text in 14px or 16px.
Do not use very thin font weights.
Keep paragraph width under 720px.
Use bold only for emphasis, not entire paragraphs.
6. Layout System
6.1 Spacing Scale
Use an 8px spacing system.
4px = tiny gap
8px = small gap
12px = compact spacing
16px = default spacing
24px = card spacing
32px = section spacing
48px = major section spacing
64px = hero spacing
6.2 Border Radius
Element Radius
Small input 8px
Button 10px
Card 16px
Modal 20px
Hero card 24px
Full dashboard panel 24px
5

## Page 6

6.3 Shadow System
Use soft shadows only.
--shadow-sm: 0 1px 2px rgba(15, 23, 42, 0.06);
--shadow-md: 0 8px 24px rgba(15, 23, 42, 0.08);
--shadow-lg: 0 16px 40px rgba(15, 23, 42, 0.12);
Rules:
Use border + subtle shadow for cards.
Do not use heavy black shadows.
Hover cards can increase shadow slightly.
7. Desktop Layout Rules
Desktop breakpoint:
Desktop: 1024px and above
Tablet: 768px to 1023px
Mobile: below 768px
7.1 Desktop App Layout
Authenticated layout:
Left Sidebar: 260px fixed
Top Header: 72px height
Main Content: fluid
Right Panel: optional, 320px
Structure:
+------------------------------------------+
| Top Header |
+---------------+--------------------------+
| Sidebar | Main Content |
| 260px | Dashboard / Pages |
| | |
+---------------+--------------------------+
Main content width:
max-width: 1280px;
margin: 0 auto;
padding: 32px;
6

## Page 7

8. Mobile Layout Rules
Mobile behavior:
Sidebar becomes bottom navigation or hamburger drawer.
Cards become single-column.
Tables become stacked cards.
Forms use full-width inputs.
Primary CTA stays sticky at bottom on long forms.
Roadmap weeks become accordion list.
Mobile header:
Logo left
Menu icon right
Height: 64px
Mobile bottom nav items:
Dashboard
Roadmap
Resume
Profile
Do not show all sidebar items in bottom nav. Keep only top 4 actions.
9. Component Design System
9.1 Buttons
Primary Button
Usage:
Signup
Login
Upload Resume
Analyze Skill Gap
Generate Roadmap
Generate Resume
Upgrade
Style:
background: #10B981;
color: #FFFFFF;
border-radius: 10px;
height: 44px;
padding: 0 20px;
7

## Page 8

font-weight: 600;
border: none;
Hover:
background: #047857;
Disabled:
background: #CBD5E1;
color: #64748B;
cursor: not-allowed;
Loading:
Show spinner left + loading text.
Example: Generating...
Secondary Button
Usage:
Cancel
Back
View Details
Edit Profile
Style:
background: #FFFFFF;
color: #0F172A;
border: 1px solid #E2E8F0;
border-radius: 10px;
height: 44px;
padding: 0 20px;
font-weight: 600;
Hover:
background: #F8FAFC;
Danger Button
Usage:
Delete resume
Delete account
Remove document
Style:
8

## Page 9

background: #EF4444;
color: #FFFFFF;
border-radius: 10px;
Always show confirmation modal before destructive action.
Link Button
Usage:
Forgot password
Resend OTP
View roadmap
Change plan
Style:
color: #0EA5E9;
font-weight: 600;
text-decoration: none;
Hover:
text-decoration: underline;
10. Card Style
10.1 Standard Card
Use for dashboard blocks, feature cards, roadmap cards.
background: #FFFFFF;
border: 1px solid #E2E8F0;
border-radius: 16px;
box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
padding: 24px;
Hover card:
transform: translateY(-2px);
box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
10.2 AI Highlight Card
Use for AI insights, AI-generated roadmap, ATS suggestions.
background: linear-gradient(135deg, #EEF2FF 0%, #ECFDF5 100%);
border: 1px solid #C7D2FE;
9

## Page 10

border-radius: 20px;
padding: 24px;
Include small badge:
AI Generated
Badge style:
background: #EEF2FF;
color: #4F46E5;
border-radius: 999px;
padding: 4px 10px;
font-size: 12px;
font-weight: 600;
10.3 Warning Card
Use when user is behind roadmap.
background: #FFFBEB;
border: 1px solid #FDE68A;
color: #92400E;
border-radius: 16px;
Message:
You have pending tasks for this week. Complete them to stay on track.
11. Form Design
11.1 Input Style
height: 44px;
border: 1px solid #CBD5E1;
border-radius: 10px;
padding: 0 12px;
font-size: 14px;
background: #FFFFFF;
Focus:
border-color: #10B981;
box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
Error:
border-color: #EF4444;
background: #FEF2F2;
10

## Page 11

11.2 Labels
font-size: 14px;
font-weight: 600;
color: #0F172A;
margin-bottom: 6px;
Required field:
Full Name *
Error text:
font-size: 12px;
color: #EF4444;
margin-top: 4px;
12. Badges and Status Pills
12.1 Source Badges for Onboarding
Status Text Style
Auto-filled Auto-filled Green badge
Manual Manual Blue badge
Missing Missing Red badge
Low confidence Review needed Amber badge
Green badge:
background: #D1FAE5;
color: #047857;
Blue badge:
background: #DBEAFE;
color: #1D4ED8;
Amber badge:
background: #FEF3C7;
color: #92400E;
Red badge:
background: #FEE2E2;
color: #B91C1C;
11

## Page 12

13. Page-by-Page UI Design
13.1 Landing Page
Layout
Navbar
Hero Section
Problem Section
How It Works
Feature Grid
AI Preview Section
Pricing Teaser
FAQ
Footer
Hero Section
Left side:
Headline
Subtitle
CTA buttons
Trust badges
Right side:
Dashboard preview mockup
Resume upload preview
Skill gap score preview
Hero title:
Build your job-ready career path with AI
Hero subtitle:
Upload your resume, discover missing skills, generate a personalized roadmap, and create an ATS-friendly resume in minutes.
Buttons:
Get Started
View Features
Hero visual:
Floating dashboard card showing:
- Match Score: 58%
- Missing Skills: Node.js, Redis, System Design
- Roadmap Progress: 35%
12

## Page 13

13.2 Signup Page
Layout:
Left: Brand message / illustration
Right: Signup form card
Signup form card:
Title: Create your account
Subtitle: Start your AI career analysis today.
Fields:
- Full Name
- Email
- Password
- Confirm Password
Button: Create Account
Link: Already have an account? Login
Design:
Centered card
Max width: 420px
Card padding: 32px
13.3 Login Page
Layout same as signup.
Fields:
Email
Password
Buttons:
Login
Forgot Password
Create Account
Success redirect rules:
Email not verified -> Verify Email
Onboarding not completed -> Resume Upload
Completed -> Dashboard
13.4 Resume Upload Onboarding Screen
This is one of the most important screens.
13

## Page 14

Layout
Page Title
Short explanation
Large upload card
Supported format info
Security note
CTA
Upload card:
Icon: file upload
Text: Drag and drop your resume here
Subtext: PDF or DOCX, max 5 MB
Button: Browse File
After file selected:
Show file name
Show file size
Show remove file button
Button: Analyze Resume
Loading state:
Step 1: Uploading resume
Step 2: Extracting profile details
Step 3: Preparing editable form
Use progress indicator:
Uploading -> Analyzing -> Ready
13.5 Auto-Filled Profile Review Screen
Layout:
Left: Form sections
Right: Profile completion card
Sections:
Personal Details
Education
Skills
Projects
Links
Career Preferences
Every auto-filled field should show badge:
Auto-filled
14

## Page 15

Every missing field should show:
Missing
Right side card:
Profile Completion: 78%
Auto-filled fields: 9
Missing fields: 4
Review needed: 2
Primary CTA:
Save and Continue
Secondary CTA:
Re-upload Resume
13.6 Dashboard
Dashboard should be card-based and action-focused.
Desktop Dashboard Layout
Top Row:
- Welcome card
- Profile completion
- Target role
- Reminder status
Middle Row:
- Skill Gap Summary
- Roadmap Progress
- ATS Resume Status
Bottom Row:
- Pending Tasks
- AI Suggestions
- Recent Activity
Dashboard Header
Good morning, Nitin
Here is your career progress for Backend Developer.
Primary CTA:
Continue Roadmap
Secondary CTA:
15

## Page 16

Build ATS Resume
Dashboard Cards
Profile Completion Card
Profile Completion
78%
Progress bar
Button: Complete Profile
Skill Gap Card
Skill Match Score
58%
Current Skills: Java, SQL, HTML
Missing Skills: Node.js, Redis, System Design
Button: View Skill Gap
Roadmap Progress Card
Roadmap Progress
35%
Week 2 of 6
Pending tasks: 3
Button: Continue Roadmap
Reminder Status Card
Reminder Status
You have 3 pending tasks this week.
Last reminder sent: 27 June 2026
A TS Resume Card
ATS Resume
Not generated yet
Button: Generate Resume
13.7 Skill Gap Page
Layout:
Top: Target role selector
Middle: Match score visualization
Bottom: Missing skills and learning order
Match score visual:
16

## Page 17

Circular progress chart
Score: 58%
Label: Moderate match
Skill tags:
Current Skills: green tags
Missing Skills: red/amber tags
Recommended Skills: blue tags
CTA:
Generate Personalized Roadmap
13.8 Roadmap Page
Use a learning platform style.
Layout:
Header:
- Roadmap title
- Target role
- Progress percentage
Main:
- Week-wise roadmap accordion
Right:
- Upcoming tasks
- Reminder status
Week card:
Week 1: JavaScript Basics
Status: Completed / Pending
Tasks:
[ ] Learn variables and functions
[ ] Practice loops
[ ] Understand ES6 features
Completed task:
Checkbox checked
Text slightly muted
Completed badge
Pending task:
Checkbox unchecked
Due date visible
17

## Page 18

Behind schedule task:
Amber warning border
Text: Pending from last week
13.9 ATS Resume Builder
Layout:
Left: Resume editor
Right: Live preview
Sections:
Summary
Skills
Education
Projects
Experience
Certifications
Links
Buttons:
Generate Resume
Improve with AI
Save Changes
Download PDF
Download DOCX
Regenerate
AI suggestion pattern:
Original:
Built a book app.
Improved:
Developed a full-stack book sharing application with user authentication, book listing, search, and request management features.
Use side-by-side comparison for AI improvements.
13.10 Billing Page
Layout:
Current Plan Card
Usage Limits
Pricing Cards
Billing History
Pricing cards:
18

## Page 19

Free
Pro
Premium
Highlight recommended plan:
Pro
Badge: Recommended
Upgrade button:
Upgrade to Pro
Premium card should use purple gradient header.
14. Modals
14.1 Confirmation Modal
Used for:
Delete resume
Delete account
Re-upload resume
Cancel payment
Structure:
Title
Description
Cancel button
Confirm button
Danger confirm button should be red.
14.2 Upgrade Modal
Trigger when user reaches free limit.
Title:
Upgrade to continue
Message:
You have reached your free ATS resume generation limit. Upgrade to Pro to generate more resumes.
Buttons:
Upgrade Now
Maybe Later
19

## Page 20

14.3 AI Processing Modal
Used for long AI tasks.
Content:
AI is working on your request
Step indicator
Progress animation
Estimated message, not exact timer
Do not show fake percentage unless backend provides real progress.
15. Empty State Design
Empty states should be helpful and action-oriented.
Style
Small illustration/icon
Clear title
Helpful explanation
Primary CTA
Example:
Title: No roadmap yet
Text: Generate a personalized roadmap based on your missing skills.
Button: Generate Roadmap
16. Error State Design
Error states should explain what happened and what user can do next.
Example:
Title: Resume parsing failed
Text: We could not extract details from your resume. You can retry or continue manually.
Buttons:
- Retry
- Fill manually
Use red only for actual errors.
20

## Page 21

17. Success State Design
Success states should be encouraging.
Example:
Title: Your roadmap is ready
Text: We created a 6-week roadmap for your Backend Developer goal.
Button: Start Roadmap
Use green accent and subtle celebration icon.
18. Loading States
Use skeleton loaders for dashboard cards.
Use step loaders for AI processes:
Uploading resume...
Extracting profile details...
Generating roadmap...
Optimizing ATS resume...
Do not show blank screens during loading.
19. Icon Style
Use simple line icons.
Recommended icon style:
Lucide Icons
Stroke width: 2px
Rounded caps
24px default size
Icon usage:
Feature Icon
Resume Upload UploadCloud
Skill Gap BarChart
Roadmap Map
ATS Resume FileText
Reminder Bell
Profile User
21

## Page 22

Feature Icon
Billing CreditCard
Settings Settings
AI Sparkles
20. Data Visualization
Use simple charts only.
Charts:
Circular progress for match score
Linear progress bar for roadmap completion
Bar chart for skill category coverage
Small line chart for weekly progress
Colors:
Completed: Green
Pending: Amber
Missing: Red
Recommended: Blue
Premium: Purple
21. Responsive Behavior
Desktop
Sidebar visible
Cards in 2-3 columns
ATS builder split view
Dashboard full layout
Tables visible
Tablet
Sidebar collapses
Cards in 2 columns
ATS preview moves below editor
22

## Page 23

Mobile
Bottom nav
Cards single column
Forms full width
Roadmap accordion
ATS editor only first, preview as separate tab
Sticky bottom CTA
Mobile ATS tabs:
Edit
Preview
Download
22. Motion and Microinteractions
Use subtle motion only.
Button hover: slight darkening
Card hover: lift 2px
Modal open: fade + scale
Toast: slide from top-right
Progress update: smooth width animation
Checkbox complete: small success animation
Duration:
transition: all 180ms ease;
A void:
Bouncy animations
Slow animations
Too many moving elements
23. UX Principles
23.1 Reduce Manual Work
Resume upload should come first. AI should auto-fill as much as possible.
23.2 Always Show Next Step
Every page should have a clear primary CTA.
23

## Page 24

Examples:
Upload Resume
Review Profile
Analyze Skill Gap
Generate Roadmap
Continue Roadmap
Build Resume
23.3 Build Trust
Show:
Your data is secure
Resume is stored privately
You can edit AI-filled details
AI suggestions are editable
23.4 Make AI Explainable
Do not just show AI output. Show why.
Example:
We recommended Node.js because it is required for Backend Developer roles and missing from your profile.
23.5 Keep Users Motivated
Use:
Progress bars
Weekly goals
Completion badges
Reminder messages
Motivational empty states
24. Design Tokens for AI App Builder
Use these exact tokens:
:root {
--color-primary: #10B981;
--color-primary-dark: #047857;
--color-primary-light: #D1FAE5;
--color-secondary: #4F46E5;
--color-accent: #0EA5E9;
24

## Page 25

--color-premium: #8B5CF6;
--color-bg: #F8FAFC;
--color-surface: #FFFFFF;
--color-surface-soft: #F1F5F9;
--color-border: #E2E8F0;
--color-text-primary: #0F172A;
--color-text-secondary: #475569;
--color-text-muted: #94A3B8;
--color-success: #22C55E;
--color-warning: #F59E0B;
--color-error: #EF4444;
--color-info: #3B82F6;
--radius-sm: 8px;
--radius-md: 10px;
--radius-lg: 16px;
--radius-xl: 24px;
--shadow-sm: 0 1px 2px rgba(15, 23, 42, 0.06);
--shadow-md: 0 8px 24px rgba(15, 23, 42, 0.08);
--shadow-lg: 0 16px 40px rgba(15, 23, 42, 0.12);
}
25. Final Design Summary
CareerGuid AI should look like a premium AI SaaS dashboard for career growth.
The app should feel:
Professional like LinkedIn
Clean like Notion
Smart like Grammarly
Motivating like Duolingo
Structured like Coursera
Developer-modern like Supabase
The most important UI experience:
User uploads resume first
AI auto-fills profile
User edits missing/incorrect details
System shows skill gap clearly
25

## Page 26

AI creates a simple roadmap
User tracks weekly progress
System reminds user if they fall behind
User creates ATS resume and downloads it
Final design principle:
Make the user feel guided, not overwhelmed. Every screen should
answer: “What should I do next?”
26
