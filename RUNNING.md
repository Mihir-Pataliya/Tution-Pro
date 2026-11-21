# TuitionDesk - Full Stack Setup Guide

## Project Structure
- `src/` - React frontend
- `node/` - Node.js backend (Express + MongoDB)

## Running Both Servers

### Option 1: One Command (Recommended)
From the root folder (`D:\tuition-app`):
```
npm run dev
```
This starts both the React dev server (port 3000) and the Node.js backend (port 5000) simultaneously.

### Option 2: Two Separate Terminals
**Terminal 1 - React Frontend:**
```
npm start
```
Runs on `http://localhost:3000`

**Terminal 2 - Node.js Backend:**
```
cd node
npm start
```
Runs on `http://localhost:5000`

## MongoDB Setup

### Option A: Local Installation
1. Download MongoDB Community Server from https://www.mongodb.com/try/download/community
2. Install and start the MongoDB service
3. The backend will connect automatically to `mongodb://localhost:27017/tuitiondesk`

### Option B: MongoDB Atlas (Free Cloud)
1. Create a free account at https://www.mongodb.com/cloud/atlas
2. Create a cluster
3. Get your connection string
4. Update `node/.env`:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/tuitiondesk?retryWrites=true&w=majority
   ```

## Environment Configuration

### Frontend (Root)
- Uses `VITE_API_URL` in `src/api/axios.js` (defaults to `http://localhost:5000`)

### Backend (`node/.env`)
Create `node/.env` and use a long, random value for `JWT_SECRET` (do not use the sample value below):
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/tuitiondesk
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRE=7d
BCRYPT_SALT_ROUNDS=12
# Optional: enables generated Tuition Copilot answers. Keep this key on the server only.
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
```

The API refuses to start without `JWT_SECRET`. Copilot stays server-side; if `OPENAI_API_KEY` is not set, its response uses a local summary of aggregate tuition figures.

If antivirus HTTPS inspection is enabled, Node may need that antivirus root certificate configured for the OpenAI connection. Set `OPENAI_CA_CERT_PATH` to a PEM certificate path relative to `node/`; keep the CA file local and out of source control. Certificate verification remains enabled.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/dashboard/overview` | Owner-scoped dashboard analytics |
| POST | `/api/dashboard/copilot` | Secure server-side Tuition Copilot |
| GET | `/api/attendance?batchId=...` | Today's attendance for an owned batch |
| PUT | `/api/attendance` | Save today's attendance for an owned batch |

## Test the Backend

Once MongoDB is running, test the API with curl:
```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"tuitionName":"My Tuition","name":"John Doe","email":"john@example.com","phone":"1234567890","password":"password123"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"password123"}'
```
