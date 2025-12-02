# Shopify API 401 Error - Troubleshooting Guide

## 🔴 Error: "Request failed with status code 401"

This error means your Shopify Admin API access token is either:
1. **Invalid** - Token is incorrect or malformed
2. **Expired** - Token has been revoked or expired
3. **Missing Permissions** - Token doesn't have required API scopes

---

## ✅ Solution: Fix Your Shopify Access Token

### Step 1: Verify Your Access Token

1. **Go to Shopify Admin**
   - Navigate to: `https://yourstore.myshopify.com/admin`

2. **Check Your App**
   - Go to **Settings** → **Apps and sales channels**
   - Click **Develop apps**
   - Find your app (the one you created for Xeno Dashboard)

3. **Check API Credentials**
   - Click on your app
   - Go to **API credentials** tab
   - Check if the token is still active

### Step 2: Verify API Scopes (CRITICAL)

Your access token **MUST** have these scopes:

#### Required Scopes:
- ✅ **`read_customers`** - To fetch customer data
- ✅ **`read_orders`** - To fetch order data
- ✅ **`read_products`** - To fetch product data

#### How to Check/Update Scopes:

1. **In your Shopify app settings:**
   - Click **Configure Admin API scopes**
   - Make sure these are checked:
     - ✅ `read_customers`
     - ✅ `read_orders`
     - ✅ `read_products`

2. **If scopes are missing:**
   - Check the required scopes
   - Click **Save**
   - **Important**: You may need to **reinstall the app** or **regenerate the token**

### Step 3: Regenerate Access Token (If Needed)

If your token is invalid or missing scopes:

1. **In your Shopify app:**
   - Go to **API credentials** tab
   - Under **Admin API access token**, click **Reveal token once** or **Regenerate token**
   - **Copy the new token** (starts with `shpat_...`)

2. **Update in Dashboard:**
   - Go to your dashboard
   - You'll need to update the tenant's access token
   - **Note**: Currently, you may need to delete and recreate the tenant connection with the new token

---

## 🔍 Common Issues

### Issue 1: Token Format

**Correct format:**
```
shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Check:**
- Token starts with `shpat_`
- Token is about 32+ characters long
- No extra spaces or characters

### Issue 2: Token Expired/Revoked

**Symptoms:**
- Worked before but now returns 401
- You regenerated the token in Shopify

**Solution:**
- Get a new token from Shopify
- Update your tenant connection with the new token

### Issue 3: Missing API Scopes

**Symptoms:**
- Some resources work (e.g., customers) but others fail (e.g., orders)
- Error mentions "permission" or "scope"

**Solution:**
- Verify all required scopes are enabled
- Regenerate token after updating scopes

### Issue 4: Wrong Shopify Domain

**Check:**
- Domain format: `yourstore.myshopify.com`
- No `https://` prefix
- No trailing slash
- Matches your actual Shopify store domain

---

## 🧪 Testing Your Token

You can test your token directly using curl:

```bash
# Test customers endpoint
curl -X GET "https://yourstore.myshopify.com/admin/api/2024-01/customers.json?limit=1" \
  -H "X-Shopify-Access-Token: shpat_your_token_here"

# Test orders endpoint
curl -X GET "https://yourstore.myshopify.com/admin/api/2024-01/orders.json?limit=1&status=any" \
  -H "X-Shopify-Access-Token: shpat_your_token_here"

# Test products endpoint
curl -X GET "https://yourstore.myshopify.com/admin/api/2024-01/products.json?limit=1" \
  -H "X-Shopify-Access-Token: shpat_your_token_here"
```

**Expected Response:**
- Status: `200 OK`
- Body: JSON with your data

**If you get 401:**
- Token is invalid/expired
- Token doesn't have required scopes

**If you get 403:**
- Token is valid but missing specific scopes
- Check which endpoint failed and verify that scope

---

## 📋 Step-by-Step: Create New Token with Correct Scopes

1. **Go to Shopify Admin**
   ```
   https://yourstore.myshopify.com/admin
   ```

2. **Navigate to Apps**
   - Settings → Apps and sales channels
   - Click **Develop apps**

3. **Create/Edit App**
   - If you have an existing app, click on it
   - If not, click **Create an app**
   - Name it: "Xeno Dashboard"

4. **Configure API Scopes**
   - Click **Configure Admin API scopes**
   - **Check these scopes:**
     - ✅ `read_customers`
     - ✅ `read_orders`
     - ✅ `read_products`
   - Click **Save**

5. **Install App**
   - Click **Install app** (if not already installed)
   - Confirm installation

6. **Get Access Token**
   - Go to **API credentials** tab
   - Under **Admin API access token**, click **Reveal token once**
   - **Copy the token** (starts with `shpat_...`)
   - ⚠️ **Save it securely** - you won't see it again!

7. **Update in Dashboard**
   - Go to your dashboard
   - If you need to update an existing tenant:
     - You may need to delete and recreate the connection
     - Or update the tenant's access token in the database

---

## 🔄 After Fixing Token

1. **Update Tenant Connection**
   - Use the new access token
   - Verify Shopify domain is correct

2. **Test Sync**
   - Click "Sync Data" button
   - Check for errors in browser console
   - Check backend logs

3. **Verify Data**
   - Check dashboard shows customers, orders, products
   - Verify metrics are correct

---

## 🆘 Still Having Issues?

### Check Backend Logs

Look for detailed error messages:
- What specific resource failed? (customers/products/orders)
- What's the exact error message?
- Is it 401 (auth) or 403 (permissions)?

### Verify Token in Shopify

1. Go to your app in Shopify
2. Check **API credentials** tab
3. Verify token is active
4. Check **API scopes** are correct

### Test Token Manually

Use curl (see "Testing Your Token" section above) to verify:
- Token is valid
- Token has correct scopes
- Domain is correct

---

## 📝 Quick Checklist

- [ ] Access token starts with `shpat_`
- [ ] Token is about 32+ characters
- [ ] Shopify domain is `yourstore.myshopify.com` (no https://, no trailing slash)
- [ ] API scopes include: `read_customers`, `read_orders`, `read_products`
- [ ] App is installed in Shopify
- [ ] Token was copied correctly (no extra spaces)
- [ ] Tested token with curl (returns 200 OK)

---

**Once you fix the token and scopes, the sync should work correctly!** 🎉

