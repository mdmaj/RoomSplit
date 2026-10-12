# RoomSplit — Roommate Expense Manager

RoomSplit is a full-stack web application that helps roommates manage shared household expenses, split bills, track balances, record settlements, and export expense reports to Excel.

## Live Demo

* **Frontend:** https://room-split-rho.vercel.app
* **Backend API:** https://roomsplit-api-dzpd.onrender.com

## Features

* User registration and login with cookie-based authentication
* Create groups and invite roommates using group codes
* Add and manage shared expenses
* Split expenses equally among group members
* Track balances and settlements
* Filter expenses by month
* View spending summaries and category breakdowns
* Export expense reports to Excel
* Responsive user interface

## Tech Stack

**Frontend**

* React
* Vite
* Tailwind CSS
* Axios

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

## Getting Started

### 1. Clone the repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd RoomSplit
```

### 2. Configure the backend

```bash
cd backend
npm install
```

Create a `.env` file in the `backend` directory with the environment variables required by the application.

Example:

```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_strong_secret
```

Use the exact MongoDB environment variable name expected by your database configuration.

### 3. Start the backend

```bash
npm run dev
```

### 4. Configure the frontend

Open another terminal:

```bash
cd client
npm install
```

Create a `.env` file:

```env
VITE_API_URL=http://localhost:5000/api
```

### 5. Start the frontend

```bash
npm run dev
```

Open the local URL printed by Vite in your terminal.

## Security Notes

* Keep environment files and secrets out of Git.
* Use HTTPS in production.
* Use secure, HTTP-only cookies for authentication.
* Configure CORS to allow only trusted frontend origins.

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
