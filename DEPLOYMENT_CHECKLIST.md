# Production Deployment Checklist

## ✅ Backend Deployment (Render/Heroku/etc.)

### 1. Environment Variables to Set

In your deployment platform's environment variables section, add:

```env
NODE_ENV=production
PORT=4000
DATABASE_URL=<your-production-database-url>
FRONTEND_URL=<your-frontend-url>  # e.g., https://your-app.vercel.app
NEXTAUTH_URL=<your-frontend-url>   # Same as FRONTEND_URL
```

**Important**: 
- Replace `<your-production-database-url>` with your actual database connection string
- Replace `<your-frontend-url>` with your actual deployed frontend URL

### 2. Database Migration

After deploying, run the database migration to create the User table:

**Option A: Via Render Shell**
1. Go to your backend service on Render
2. Click "Shell" tab
3. Run: `npx prisma db push`

**Option B: Via Local Connection**
```bash
# Set DATABASE_URL to production database
export DATABASE_URL="<your-production-database-url>"
cd backend
npx prisma db push
```

### 3. Verify Backend is Running

Test the health endpoint:
```
https://your-backend-url.onrender.com/health
```

Should return:
```json
{"status":"ok","timestamp":"..."}
```

### 4. Test Registration Endpoint

```bash
curl -X POST https://your-backend-url.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","name":"Test User"}'
```

---

## ✅ Frontend Deployment (Vercel/Netlify/etc.)

### 1. Environment Variables to Set

In your deployment platform's environment variables section, add:

```env
NEXT_PUBLIC_API_URL=https://your-backend-url.onrender.com
NEXTAUTH_URL=https://your-frontend-url.vercel.app
NEXTAUTH_SECRET=<generate-a-random-secret>
```

**To generate NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

Or use: https://generate-secret.vercel.app/32

### 2. Important Notes

- `NEXT_PUBLIC_API_URL` must start with `https://` (not `http://`)
- `NEXTAUTH_URL` must match your exact frontend domain
- After setting environment variables, **redeploy** the frontend

---

## 🔍 Troubleshooting Production Issues

### Issue: "Network Error" or "ECONNREFUSED"

**Check:**
1. Is `NEXT_PUBLIC_API_URL` set correctly in frontend?
2. Does the backend URL start with `https://`?
3. Is the backend service running? (Check Render/Heroku dashboard)

**Test:**
```bash
# Test backend directly
curl https://your-backend-url.onrender.com/health

# Test registration
curl -X POST https://your-backend-url.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

### Issue: CORS Error

**Solution:**
1. Make sure `FRONTEND_URL` is set in backend environment variables
2. Set it to your exact frontend URL (e.g., `https://your-app.vercel.app`)
3. Redeploy backend after setting the variable

### Issue: "User table doesn't exist"

**Solution:**
Run database migration:
```bash
# In Render shell or locally with production DATABASE_URL
npx prisma db push
```

### Issue: Database Connection Failed

**Check:**
1. Is `DATABASE_URL` set correctly?
2. Does the connection string include `?sslmode=require` for production?
3. Is the database accessible from your deployment platform?

---

## 📋 Quick Verification Steps

1. **Backend Health Check**
   - Visit: `https://your-backend-url/health`
   - Should see: `{"status":"ok",...}`

2. **Frontend Environment**
   - Open browser DevTools (F12)
   - Go to Console tab
   - Look for: `[API] POST https://your-backend-url/api/auth/register`
   - Check for any CORS or network errors

3. **Database**
   - Verify User table exists
   - Can test by trying to register a user

4. **CORS**
   - Check browser console for CORS errors
   - Verify `FRONTEND_URL` matches your frontend domain exactly

---

## 🔗 Example URLs

**Backend (Render):**
- Health: `https://xeno-backend.onrender.com/health`
- Register: `https://xeno-backend.onrender.com/api/auth/register`

**Frontend (Vercel):**
- App: `https://xeno-frontend.vercel.app`
- Signup: `https://xeno-frontend.vercel.app/auth/signup`

**Environment Variables:**

Backend:
```env
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://...
FRONTEND_URL=https://xeno-frontend.vercel.app
```

Frontend:
```env
NEXT_PUBLIC_API_URL=https://xeno-backend.onrender.com
NEXTAUTH_URL=https://xeno-frontend.vercel.app
NEXTAUTH_SECRET=your-generated-secret
```

