# PeopleFlow — HR Management System

A role-based human resources web application built with Angular. PeopleFlow lets HR teams manage employees, attendance, and leave, while employees use a self-service portal to check in, request leave, and track their balances. The interface supports **English and Arabic with full RTL layout**.

![Dashboard](docs/screenshots/dashboard.png)

1. Features

# Admin / HR
- Dashboard with attendance, leave, and headcount statistics
- Employee management: add, edit, view, and delete employees
- Review and approve or reject new account sign-ups
- Attendance tracking by date, with check-in and check-out
- Leave request review with automatic balance deduction on approval
- Leave balance overview with low-balance warnings

# Employee portal
- Personal dashboard: today's status, remaining leave, pending requests
- Check in and check out, with monthly attendance history
- Submit leave requests with live balance validation and overlap detection
- Track request status (pending, approved, rejected)
- View leave balance by type

# Platform
- Role-based access control with route guards (`admin`, `hr`, `employee`)
- Sign-up flow that requires HR approval before the account becomes active
- Role-targeted notifications, translated into the user's language
- English and Arabic, with RTL support, switchable at runtime
- Responsive layout

# Tech Stack

| Area | Technology |
| --- | --- |
| Framework | Angular (standalone components) |
| Language | TypeScript |
| Reactive layer | RxJS |
| Styling | SCSS, CSS logical properties for RTL/LTR |
| Mock API | JSON Server |
| i18n | Custom `LanguageService` and `translate` pipe (JSON dictionaries) |

2. Getting Started

# Prerequisites
- Node.js 18 or later
- npm

# Installation

bash
git clone https://github.com/<your-username>/<repository-name>.git
cd <repository-name>
npm install


# Run

Start the mock API and the app in two terminals.

bash
# Terminal 1: mock API (http://localhost:3000)
npx json-server --watch db.json --port 3000

# Terminal 2: Angular app (http://localhost:4200)
npm start


The API base URL is configured in `src/environments/environment.ts`.

3. Demo Accounts

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@peopleflow.com` | `Admin123!` |
| HR | `hr@peopleflow.com` | `Hr123456!` |
| Employee | `sarah.miller@peopleflow.com` | `Employee123!` |

On the sign-in page, choose the **Employee** or **Admin / HR** tab that matches the account.

4. Project Structure

```text
src/app
├── core
│   ├── guards        # authGuard, roleGuard
│   ├── models        # TypeScript interfaces
│   ├── pipes         # translate, notification text
│   └── services      # auth, employees, attendance, leave, notifications, i18n
├── features
│   ├── auth          # login, signup
│   ├── dashboard     # admin dashboard
│   ├── employees     # employee list, details, edit, employee portal
│   ├── attendance
│   ├── leave-requests
│   ├── leave-balances
│   ├── notifications
│   └── profile
└── shared
    └── components    # main layout, navbar, sidebar
public/i18n           # en.json, ar.json
```

5. Internationalization

Translations live in `public/i18n/en.json` and `public/i18n/ar.json`. To add a string, add the same key to both files and use it in templates with the `translate` pipe:

```html
{{ 'DASHBOARD.TITLE' | translate }}
```

The document direction (`ltr` or `rtl`) is set automatically when the language changes.

6. Security Notice

This project uses JSON Server as a mock backend. Passwords are stored in plain text and authentication runs on the client, so **it is intended for learning and demonstration only**. A production deployment requires a real backend with password hashing, token-based authentication, and server-side authorization.

7. Roadmap

- [ ] Real backend with JWT authentication
- [ ] Unit and end-to-end tests
- [ ] Reports and CSV/PDF export
- [ ] Email notifications
- [ ] Password reset flow

8. Author

**Reem Huwari**
