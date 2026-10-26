# RoomSplit — Roommate Expense Manager

RoomSplit is a full-stack web application for roommates to manage shared household expenses, split bills, track balances, record settlements, and export expense reports to Excel.

The application is designed for desktop and mobile screens, with compact dashboard cards, responsive expense and settlement forms, and touch-friendly controls.

## Live Demo

* **Frontend:** https://room-split-rho.vercel.app
* **Backend API:** https://roomsplit-api-dzpd.onrender.com

## Features

* User registration and login with persistent, HTTP-only cookie authentication
* 30-day authenticated browser sessions unless the user logs out
* Create households and invite roommates using group codes
* Add shared expenses and record who paid
* Split expenses equally among household members
* View balances, suggested transfers, and recorded settlements
* Record payments between roommates
* Filter recent expenses by month, with the current month shown by default
* View monthly spending trends and category breakdowns
* Export expense reports to Excel
* Responsive mobile-first dashboard, household, expense, and settlement screens
* Redesigned emerald/teal interface with clear visual hierarchy and touch-friendly form controls
* Dashboard summary cards for household totals, memberships, and recent activity
* Reusable household cards and create/join household forms
* Monthly spending and category visualizations for faster expense analysis
* Route-aware loading states while authentication and household data are retrieved

## Tech Stack

**Frontend**

* React 19
* Vite
* Tailwind CSS
* Axios
* React Router
* Recharts
* Lucide React

The frontend uses reusable components for dashboard statistics, household lists and cards, household forms, and spending visualizations. Protected routes restore the authenticated session before rendering application pages.

**Backend**

* Node.js
* Express.js
* MongoDB
* Mongoose
* JWT
* HTTP-only authentication cookies
* ExcelJS

**Deployment**

* Vercel — Frontend
* Render — Backend
* MongoDB Atlas — Database

## Project Structure

```text
RoomSplit/
├── backend/
│   └── src/
│       ├── config/          # Database configuration
│       ├── controllers/     # Authentication, expenses, balances, and exports
│       ├── middleware/      # Authentication and request middleware
│       ├── models/          # Mongoose models
│       ├── routes/          # Express API routes
│       └── server.js
├── client/
│   └── src/
│       ├── components/      # Shared dashboard, household, and chart components
│       ├── context/         # Authentication state and session restoration
│       ├── pages/           # Authentication, dashboard, household, and balance screens
│       ├── routeLoaders.js  # Protected-route data loading
│       └── services/        # Axios API client
└── README.md
```

## Getting Started

### Prerequisites

* Node.js 18 or newer
* npm
* MongoDB database, local or MongoDB Atlas

### 1. Clone the repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd RoomSplit
```

### 2. Install and configure the backend

```bash
cd backend
npm install
```

Create `backend/.env` with the environment variables required by the application:

```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_long_random_secret
```

`MONGO_URI` is also accepted as a fallback for the database connection, but `MONGODB_URI` is recommended.

### 3. Start the backend

For development:

```bash
npm run dev
```

For a production-style start:

```bash
npm start
```

### 4. Install and configure the frontend

Open another terminal:

```bash
cd client
npm install
```

Create `client/.env` when the API is not running at the default local URL:

```env
VITE_API_URL=http://localhost:5000/api
```

The frontend uses `http://localhost:5000/api` by default when `VITE_API_URL` is not set.

### 5. Start the frontend

```bash
npm run dev
```

Open the local URL printed by Vite in your terminal.

## Available Frontend Commands

Run these commands from the `client` directory:

```bash
npm run dev       # Start the Vite development server
npm run build     # Create a production build
npm run lint      # Run ESLint
npm run preview   # Preview the production build locally
```

## Authentication

RoomSplit stores the JWT in an HTTP-only `token` cookie. The browser automatically sends this cookie with API requests, and the client checks `/auth/me` when the application starts.

The session remains available for 30 days across browser restarts. A user must authenticate again when the session expires, the cookie is invalid, the JWT secret changes, the account is removed, or the user explicitly logs out.

For local development, use `NODE_ENV=development`. Production deployments must use HTTPS and a correctly configured frontend origin so secure cross-site cookies can be sent.

## Security Notes

* Keep environment files and secrets out of Git.
* Use HTTPS in production.
* Keep `JWT_SECRET` long, random, and private.
* Use secure, HTTP-only cookies for authentication.
* Configure CORS to allow only trusted frontend origins.
* Never place JWTs or database credentials in frontend environment variables.

## Future Improvements

* Automated tests for authentication and expense calculations
* Notifications for new expenses and settlements
* Recurring expenses
* Group activity history
* Additional reporting and analytics

## Author

**Md Mazid Hussain**

* GitHub: https://github.com/mdmaj
* LinkedIn: https://www.linkedin.com/in/md-mazid-hussain-maj1707/
* Portfolio: https://www.mdmaj.in/
