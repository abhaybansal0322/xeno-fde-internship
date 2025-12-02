# Render + Vercel Deployment Setup Guide

## 🎯 Step-by-Step Fix for Network Errors

### Step 1: Run Database Migration (CRITICAL)

The User table must exist in your production database.

**Option A: Via Render Shell (Recommended)**
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click on your backend service
3. Click the **"Shell"** tab (top right)
4. Run:
   ```bash
   npx prisma db push
   ```
5. You should see: `✔ Generated Prisma Client` and success messages

**Option B: Via Local Machine**
```bash
# Set your production DATABASE_URL
export DATABASE_URL="<your-render-database-url>"

# Navigate to backend
cd xeno-fde-internship/backend

# Push schema
npx prisma db push
```

---

### Step 2: Configure Backend Environment Variables (Render)

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click on your **backend service**
3. Go to **"Environment"** tab
4. Add/Verify these variables:

```env
NODE_ENV=production
PORT=4000
DATABASE_URL=<your-database-connection-string>
FRONTEND_URL=https://your-app.vercel.app
```

**Important:**
- Replace `<your-database-connection-string>` with your actual database URL
- Replace `https://your-app.vercel.app` with your **exact** Vercel frontend URL
- After adding/updating, **Redeploy** the backend service

---

### Step 3: Configure Frontend Environment Variables (Vercel)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click on your **frontend project**
3. Go to **Settings** → **Environment Variables**
4. Add/Verify these variables:

```env
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=<generate-a-random-secret>
```

**To generate NEXTAUTH_SECRET:**
- Visit: https://generate-secret.vercel.app/32
- Or run: `openssl rand -base64 32`

**Important:**
- Replace `https://your-backend.onrender.com` with your **exact** Render backend URL
- Replace `https://your-app.vercel.app` with your **exact** Vercel frontend URL
- After adding/updating, **Redeploy** the frontend (go to Deployments → click "..." → Redeploy)

---

### Step 4: Verify Backend is Running

Test your backend health endpoint:

1. Open browser and visit:
   ```
   https://your-backend.onrender.com/health
   ```

2. You should see:
   ```json
   {"status":"ok","timestamp":"2024-..."}
   ```

3. If you see an error, check:
   - Backend service is running (green status in Render)
   - Database connection is working
   - Check Render logs for errors

---

### Step 5: Test Backend API Directly

Test the registration endpoint from your terminal:

```bash
curl -X POST https://your-backend.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","name":"Test User"}'
```

**Expected responses:**

✅ **Success (201):**
```json
{
  "message": "User created successfully",
  "user": {
    "id": "...",
    "email": "test@example.com",
    "name": "Test User"
  }
}
```

❌ **Error - User table doesn't exist:**
```json
{
  "error": "Failed to register user",
  "message": "Table 'users' does not exist"
}
```
→ **Solution:** Run Step 1 (database migration)

❌ **Error - User already exists:**
```json
{
  "error": "User with this email already exists"
}
```
→ This is fine, means the endpoint is working!

---

### Step 6: Check Frontend Connection

1. Open your Vercel frontend URL
2. Press **F12** to open DevTools
3. Go to **Console** tab
4. Try to sign up
5. Look for these logs:

**✅ Good signs:**
```
[API] POST https://your-backend.onrender.com/api/auth/register
[API] Response: 201 /api/auth/register
```

**❌ Error signs:**
```
[API] Connection refused - Is the backend server running?
→ Backend URL is wrong or backend is down

[API] Network error - Check your connection and backend URL
→ CORS issue or backend not accessible

CORS error in console
→ FRONTEND_URL not set correctly in backend
```

---

### Step 7: Common Issues & Fixes

#### Issue: "Cannot connect to server"

**Check:**
1. Is `NEXT_PUBLIC_API_URL` set correctly in Vercel?
2. Does it start with `https://`?
3. Is the backend URL correct? (check Render dashboard for exact URL)

**Fix:**
- Update `NEXT_PUBLIC_API_URL` in Vercel
- Redeploy frontend

---

#### Issue: CORS Error

**Check:**
1. Is `FRONTEND_URL` set in Render backend?
2. Does it match your exact Vercel URL?

**Fix:**
- Set `FRONTEND_URL=https://your-exact-vercel-url.vercel.app` in Render
- Redeploy backend

---

#### Issue: "User table doesn't exist"

**Fix:**
- Run Step 1 (database migration via Render Shell)

---

#### Issue: "Invalid email or password" on login

**Check:**
- Did you successfully register a user?
- Is the database migration complete?

**Fix:**
- Register a new user first
- Check database has User table

---

### Step 8: Verify Everything Works

1. ✅ Backend health check works
2. ✅ Database migration completed
3. ✅ Environment variables set in both Render and Vercel
4. ✅ Both services redeployed after env var changes
5. ✅ Can register a new user
6. ✅ Can sign in with registered user

---

## 🔍 Quick Diagnostic Commands

### Check Backend Logs (Render)
1. Go to Render dashboard
2. Click on backend service
3. Click "Logs" tab
4. Look for:
   - `🚀 Server running on port 4000`
   - `✅ Database connected`
   - Any error messages

### Check Frontend Logs (Vercel)
1. Go to Vercel dashboard
2. Click on your project
3. Go to "Deployments"
4. Click on latest deployment
5. Check "Build Logs" and "Function Logs"

### Test Database Connection
In Render Shell:
```bash
npx prisma studio
# This will show if database connection works
```

---

## 📝 Example Configuration

**Render Backend Environment:**
```env
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
FRONTEND_URL=https://xeno-frontend.vercel.app
```

**Vercel Frontend Environment:**
```env
NEXT_PUBLIC_API_URL=https://xeno-backend.onrender.com
NEXTAUTH_URL=https://xeno-frontend.vercel.app
NEXTAUTH_SECRET=abc123xyz789... (32+ character random string)
```

---

## ⚠️ Important Notes

1. **Always redeploy after changing environment variables**
   - Render: Changes auto-trigger redeploy
   - Vercel: Manual redeploy needed (Deployments → ... → Redeploy)

2. **URLs must match exactly**
   - No trailing slashes
   - Use `https://` not `http://`
   - Match exact domain (including subdomain)

3. **Database migration is required**
   - User table won't exist until you run `npx prisma db push`
   - This is the #1 cause of registration errors

4. **Check both services are running**
   - Render: Green status indicator
   - Vercel: Deployment shows "Ready"

---

## 🆘 Still Having Issues?

1. **Check browser console** (F12 → Console) for specific error messages
2. **Check Render logs** for backend errors
3. **Check Vercel logs** for frontend build/runtime errors
4. **Test backend directly** with curl (Step 5)
5. **Verify environment variables** are set correctly in both platforms

