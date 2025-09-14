# Reasons Love App

A full-stack application with a React frontend and Node.js backend.

## Project Structure

```
reasons-love-app/
├── frontend/           # React frontend application
│   ├── src/           # Source files
│   ├── public/        # Static assets
│   ├── package.json   # Frontend dependencies
│   ├── vite.config.js # Vite configuration
│   └── ...           # Other frontend config files
├── backend/           # Node.js backend application
│   ├── models/        # Database models
│   ├── routes/        # API routes
│   ├── server.js      # Main server file
│   └── ...           # Other backend files
└── .github/           # GitHub workflows
```

## Getting Started

### Frontend Development
```bash
cd frontend
npm install
npm run dev
```

### Backend Development
```bash
cd backend
npm install
npm run dev
```

### Full Stack Development
From the frontend directory:
```bash
npm run dev:full
```

This will start both the frontend and backend servers concurrently.

## Scripts

- `npm run dev` - Start frontend development server
- `npm run build` - Build frontend for production
- `npm run server` - Start backend server
- `npm run dev:full` - Start both frontend and backend servers
