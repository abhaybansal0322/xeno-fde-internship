# Troubleshooting Network Errors

## Quick Diagnosis Steps

### 1. Check if Backend is Running

Open a new terminal and run:
```bash
cd xeno-fde-internship/backend
npm run dev
```

You should see:
```
🚀 Server running on port 4000
✅ Database connected
```

### 2. Test Backend Connection

Open your browser and go to:
```
http://localhost:4000/health
```

You should see:
```json
{"status":"ok","timestamp":"..."}
```

If this doesn't work, the backend is not running or not accessible.

### 3. Check Frontend API Configuration

Make sure `frontend/.env.local` exists with:
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

If the file doesn't exist, create it:
```bash
cd xeno-fde-internship/frontend
echo NEXT_PUBLIC_API_URL=http://localhost:4000 > .env.local
```

### 4. Check Browser Console

Open browser DevTools (F12) and check:
- **Console tab**: Look for API error messages
- **Network tab**: 
  - Try to sign up
  - Look for the request to `http://localhost:4000/api/auth/register`
  - Check if it shows "Failed" or "Pending"
  - Click on it to see the error details

### 5. Common Issues

#### Issue: "ECONNREFUSED" or "ERR_NETWORK"
**Solution**: Backend server is not running
- Start the backend: `cd backend && npm run dev`

#### Issue: CORS Error
**Solution**: Already fixed, but if you still see it:
- Make sure backend is running with the latest code
- Restart both frontend and backend servers

#### Issue: "404 Not Found"
**Solution**: Wrong API URL or route doesn't exist
- Check `NEXT_PUBLIC_API_URL` in `.env.local`
- Verify backend routes are mounted correctly

#### Issue: Database Connection Error
**Solution**: Database not set up or migration not run
```bash
cd backend
npm run db:push
```

### 6. Verify Both Servers Are Running

**Terminal 1 (Backend)**:
```bash
cd xeno-fde-internship/backend
npm run dev
```

**Terminal 2 (Frontend)**:
```bash
cd xeno-fde-internship/frontend
npm run dev
```

Both should be running simultaneously!

### 7. Test API Directly

You can test the registration endpoint directly using curl:

```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","name":"Test User"}'
```

If this works, the backend is fine and the issue is with the frontend connection.

