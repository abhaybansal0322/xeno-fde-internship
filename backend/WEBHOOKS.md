# Shopify Webhook Registration Guide

Complete guide for setting up and verifying Shopify webhooks for the Xeno FDE ingestion system.

## Prerequisites

- Active Shopify Partner account
- Shopify app created in Partner Dashboard
- Backend deployed to a publicly accessible URL (or use ngrok for testing)
- Webhook verification implemented in your backend

## Webhook Topics to Register

Register the following webhook topics for comprehensive data synchronization:

### 1. **Orders**
- **orders/create** - Triggered when a new order is created
- **orders/updated** - Triggered when an order is updated
- **orders/cancelled** - Triggered when an order is cancelled

### 2. **Customers**
- **customers/create** - Triggered when a new customer is created
- **customers/update** - Triggered when customer information is updated
- **customers/delete** - Triggered when a customer is deleted

### 3. **Products**
- **products/create** - Triggered when a new product is added
- **products/update** - Triggered when a product is updated
- **products/delete** - Triggered when a product is deleted

## Registration Steps

### Method 1: Via Shopify Admin (Recommended for Testing)

1. **Navigate to Webhooks Settings**
   - Go to your Shopify store admin
   - Click **Settings** → **Notifications**
   - Scroll down to **Webhooks** section
   - Click **Create webhook**

2. **Configure Webhook**
   - **Event**: Select topic (e.g., "Order creation")
   - **Format**: JSON
   - **URL**: `https://your-domain.com/webhooks/shopify/orders_create`
   - **API Version**: 2024-01 (or latest stable)

3. **Save and Test**
   - Click **Save**
   - Note the webhook ID for reference
   - Test by triggering the event (e.g., create a test order)

4. **Repeat for Each Topic**
   - Create separate webhooks for each topic listed above
   - Use consistent URL pattern: `/webhooks/shopify/{topic_name}`

### Method 2: Via Shopify API (Recommended for Production)

Use the Shopify Admin API to programmatically register webhooks:

```javascript
const shopifyApiUrl = `https://${shopDomain}/admin/api/2024-01/webhooks.json`;

const webhookTopics = [
  'orders/create',
  'orders/updated',
  'customers/create',
  'customers/update',
  'products/create',
  'products/update',
];

for (const topic of webhookTopics) {
  const response = await fetch(shopifyApiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': accessToken,
    },
    body: JSON.stringify({
      webhook: {
        topic: topic,
        address: `https://your-domain.com/webhooks/shopify/${topic.replace('/', '_')}`,
        format: 'json',
      },
    }),
  });

  const data = await response.json();
  console.log(`Registered webhook: ${topic}`, data.webhook.id);
}
```

## Payload Validation

### HMAC Verification Steps

All incoming webhooks must be verified using HMAC-SHA256:

1. **Extract HMAC Signature**
   - Header: `X-Shopify-Hmac-Sha256`

2. **Get Raw Request Body**
   - Must be the raw string, NOT parsed JSON

3. **Calculate HMAC**
   ```javascript
   const crypto = require('crypto');
   
   const hash = crypto
     .createHmac('sha256', SHOPIFY_API_SECRET)
     .update(rawBody, 'utf8')
     .digest('base64');
   ```

4. **Compare Signatures**
   ```javascript
   const isValid = crypto.timingSafeEqual(
     Buffer.from(hash),
     Buffer.from(hmacHeader)
   );
   ```

5. **Reject Invalid Requests**
   - Return 401 if HMAC doesn't match
   - Log suspicious requests

### Sample Webhook Payloads

**orders/create:**
```json
{
  "id": 820982911946154508,
  "email": "customer@example.com",
  "created_at": "2024-01-15T12:00:00-05:00",
  "updated_at": "2024-01-15T12:00:00-05:00",
  "total_price": "299.00",
  "currency": "USD",
  "financial_status": "paid",
  "customer": {
    "id": 115310627314723954,
    "email": "customer@example.com",
    "first_name": "John",
    "last_name": "Doe"
  },
  "line_items": [
    {
      "id": 866550311766439020,
      "variant_id": 808950810,
      "title": "Sample Product",
      "quantity": 2,
      "price": "149.50"
    }
  ]
}
```

**customers/create:**
```json
{
  "id": 706405506930370084,
  "email": "newcustomer@example.com",
  "created_at": "2024-01-15T12:00:00-05:00",
  "updated_at": "2024-01-15T12:00:00-05:00",
  "first_name": "Jane",
  "last_name": "Smith",
  "orders_count": 0,
  "total_spent": "0.00",
  "phone": "+15142546011",
  "addresses": []
}
```

## Testing Webhooks

### Using ngrok (Local Development)

1. **Install ngrok**
   ```bash
   # Download from https://ngrok.com/download
   # Or via npm
   npm install -g ngrok
   ```

2. **Start ngrok tunnel**
   ```bash
   ngrok http 3000
   ```

3. **Copy forwarding URL**
   ```
   Forwarding: https://abc123.ngrok.io -> http://localhost:3000
   ```

4. **Update webhook URLs**
   - Replace `your-domain.com` with `abc123.ngrok.io`
   - Example: `https://abc123.ngrok.io/webhooks/shopify/orders_create`

5. **Monitor requests**
   - View ngrok dashboard: `http://localhost:4040`
   - See all incoming webhook requests in real-time

### Manual Testing with curl

```bash
# Generate HMAC signature (requires openssl)
PAYLOAD='{"id":123,"test":true}'
SECRET="your_shopify_api_secret"
HMAC=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" -binary | base64)

# Send test webhook
curl -X POST https://your-domain.com/webhooks/shopify/orders_create \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Hmac-Sha256: $HMAC" \
  -H "X-Shopify-Shop-Domain: test-store.myshopify.com" \
  -H "X-Shopify-Topic: orders/create" \
  -H "X-Shopify-API-Version: 2024-01" \
  -d "$PAYLOAD"
```

## Webhook Headers Reference

Shopify sends these headers with every webhook:

| Header | Description | Example |
|--------|-------------|---------|
| `X-Shopify-Topic` | Event type | `orders/create` |
| `X-Shopify-Hmac-Sha256` | HMAC signature | `base64_signature` |
| `X-Shopify-Shop-Domain` | Shop domain | `store.myshopify.com` |
| `X-Shopify-API-Version` | API version | `2024-01` |
| `X-Shopify-Webhook-Id` | Unique webhook ID | `uuid` |
| `X-Shopify-Triggered-At` | Timestamp | ISO 8601 format |

## Monitoring and Debugging

### View Webhook Logs in Shopify

1. Go to **Settings** → **Notifications** → **Webhooks**
2. Click on a webhook
3. View recent deliveries and their status codes

### Common Issues

**401 Unauthorized:**
- HMAC verification failed
- Check that SHOPIFY_API_SECRET matches app settings
- Ensure raw body is used (not parsed JSON)

**404 Not Found:**
- Webhook endpoint URL incorrect
- Check route configuration

**500 Internal Server Error:**
- Application error during processing
- Check backend logs

**Timeout:**
- Processing taking too long (>5 seconds)
- Consider async processing with queues

## Production Deployment Checklist

- [ ] All webhook topics registered
- [ ] HMAC verification enabled
- [ ] SHOPIFY_WEBHOOK_SECRET configured
- [ ] Webhook URLs use HTTPS
- [ ] Error handling implemented
- [ ] Idempotency checks in place (using webhook ID)
- [ ] Logging configured
- [ ] Rate limiting considered
- [ ] Monitoring alerts set up
- [ ] Documented in README

## Resources

- [Shopify Webhook Documentation](https://shopify.dev/docs/api/admin-rest/2024-01/resources/webhook)
- [Webhook Security](https://shopify.dev/docs/apps/webhooks/configuration/https#step-5-verify-the-webhook)
- [API Versioning](https://shopify.dev/docs/api/usage/versioning)

---

For implementation details, see [`webhookVerification.js`](./src/utils/webhookVerification.js)
