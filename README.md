<div align="center">

# ⚒️ FinalForge

### Secure, responsive academic study platform

![JavaScript](https://img.shields.io/badge/JavaScript-App-F7DF1E?style=for-the-badge&logo=javascript&logoColor=111827)
![Firebase](https://img.shields.io/badge/Firebase-Auth%20%2B%20Firestore-FFCA28?style=for-the-badge&logo=firebase&logoColor=111827)
![PWA](https://img.shields.io/badge/PWA-Responsive-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-Deployment-000000?style=for-the-badge&logo=vercel&logoColor=white)

**Student-focused revision, quizzes and mock exams with verified academic access, progress workflows and admin controls.**

[CI](https://github.com/teldigi5-wq/finalforge/actions)

</div>

---

## Product snapshot

FinalForge is a responsive academic study platform designed for students across phone, tablet and desktop. The current 2026 release focuses on Year 1 Semester 1 exam preparation while the product direction also covers future mid-semester assessments, revision, quizzes, resources and learning analytics.

| Area | Current capability |
|---|---|
| **Access** | Approved Student-ID allowlist + verified SLIIT mailbox |
| **Daily login** | Student ID + password |
| **Assessment** | Mock papers, quizzes and practice workflows |
| **Recovery** | Autosaved exam answers, options and timing state |
| **Progress** | Student progress and weakness analytics |
| **Administration** | Protected admin workflows and roster boundaries |
| **Experience** | Responsive/PWA interface across mobile, tablet and desktop |

---

## Current modules

- IE1030 Data Communication Networks
- IT1120 Introduction to Programming
- IT1130 Mathematics for Computing
- IT1140 Fundamentals of Computing

## Current account flow

Students sign up using an approved Student ID. FinalForge automatically derives the matching SLIIT mailbox (`studentid@my.sliit.lk`), sends a verification email, and blocks access until the mailbox is verified. Daily login is Student ID + password.

## Mock exam recovery

Active mock exams autosave answers, selected options and timing state in the browser. Signed-in student progress is included in the cloud-sync snapshot. Students can resume a saved mock or clear saved answers and restart.

## Core capabilities

- Student-ID allowlist
- SLIIT email verification
- Student ID + password login
- Mock papers and marking guides
- Quiz/practice center
- Referral-sheet tools
- Progress and weakness analytics
- Responsive/PWA experience
- Admin console

## Security

Private roster and admin provisioning material must never be placed in public browser assets. The public repository intentionally excludes `students.json`, Firebase service-account credentials, admin provisioning values and real `.env` files.

> **Security boundary:** public client code should never be treated as a secure place for private roster data, administrative secrets or backend credentials.
