# API Documentation

## Overview

The Royalty Distribution Platform provides a RESTful API for managing IP assets, stakeholders, usage tracking, and royalty payments.

## Base URL

```
Development: http://localhost:5000/api
Production: https://api.royalty-platform.com/api
```

## Authentication

The API uses JWT tokens for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

## Response Format

All responses follow this format:

```json
{
  "success": true,
  "data": {},
  "message": "Operation completed successfully"
}
```

Error responses:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

## Endpoints

### Authentication

#### POST /auth/login
Login with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "jwt_token_here",
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "name": "John Doe"
    }
  }
}
```

#### POST /auth/register
Register a new user account.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "user@example.com",
  "password": "password123",
  "walletAddress": "GABC123..."
}
```

### Dashboard

#### GET /dashboard/stats
Get dashboard statistics and recent activity.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalIPAssets": 42,
    "totalRoyalties": 125430,
    "activeStakeholders": 18,
    "monthlyGrowth": 23.5,
    "recentActivity": [
      {
        "action": "New IP asset registered",
        "asset": "Summer Vibes",
        "time": "2 hours ago"
      }
    ]
  }
}
```

### IP Assets

#### GET /ip-assets
List all IP assets for the authenticated user.

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `type`: Filter by asset type (music, video, art, text, software)
- `search`: Search by title or description

**Response:**
```json
{
  "success": true,
  "data": {
    "assets": [
      {
        "id": "asset_id",
        "title": "Summer Vibes",
        "description": "Upbeat summer music track",
        "creatorId": "creator_id",
        "tokenId": "token_id",
        "contractAddress": "0x123...",
        "type": "music",
        "createdAt": "2024-01-15T00:00:00Z",
        "updatedAt": "2024-01-15T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 42,
      "pages": 3
    }
  }
}
```

#### POST /ip-assets
Create a new IP asset.

**Request Body:**
```json
{
  "title": "Summer Vibes",
  "description": "Upbeat summer music track",
  "type": "music",
  "metadata": {
    "genre": "Pop",
    "duration": "3:45"
  },
  "royaltyShares": [
    {
      "stakeholder": "GABC123...",
      "percentage": 60
    },
    {
      "stakeholder": "GDEF456...",
      "percentage": 40
    }
  ]
}
```

#### GET /ip-assets/:id
Get details of a specific IP asset.

#### PUT /ip-assets/:id
Update an IP asset (only creator can update).

#### DELETE /ip-assets/:id
Delete an IP asset (only creator can delete).

### Stakeholders

#### GET /stakeholders
List all stakeholders.

**Query Parameters:**
- `ipAssetId`: Filter by IP asset
- `role`: Filter by role (creator, producer, distributor, publisher, other)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "stakeholder_id",
      "name": "John Doe",
      "email": "john@example.com",
      "walletAddress": "GABC123...",
      "role": "creator",
      "royaltyPercentage": 60.0,
      "ipAssetId": "ip_asset_id",
      "createdAt": "2024-01-15T00:00:00Z",
      "updatedAt": "2024-01-15T00:00:00Z"
    }
  ]
}
```

#### POST /stakeholders
Add a new stakeholder to an IP asset.

**Request Body:**
```json
{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "walletAddress": "GDEF456...",
  "role": "producer",
  "royaltyPercentage": 25.0,
  "ipAssetId": "ip_asset_id"
}
```

#### PUT /stakeholders/:id
Update stakeholder information.

#### DELETE /stakeholders/:id
Remove a stakeholder from an IP asset.

### Royalties

#### GET /royalties
List royalty payments.

**Query Parameters:**
- `stakeholderId`: Filter by stakeholder
- `ipAssetId`: Filter by IP asset
- `status`: Filter by status (pending, completed, failed)
- `startDate`: Filter by start date
- `endDate`: Filter by end date

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "payment_id",
      "stakeholderId": "stakeholder_id",
      "ipAssetId": "ip_asset_id",
      "amount": 1250.50,
      "currency": "USD",
      "transactionHash": "0xabc123...",
      "status": "completed",
      "createdAt": "2024-01-15T00:00:00Z",
      "processedAt": "2024-01-15T00:05:00Z"
    }
  ]
}
```

#### GET /royalties/:id
Get details of a specific royalty payment.

#### POST /royalties/:id/process
Manually process a pending royalty payment.

### Usage Tracking

#### POST /usage/track
Record usage for an IP asset.

**Request Body:**
```json
{
  "ipAssetId": "ip_asset_id",
  "platform": "spotify",
  "usageType": "stream",
  "amount": 1000,
  "currency": "USD",
  "metadata": {
    "country": "US",
    "user_id": "user_123"
  }
}
```

#### GET /usage/records
List usage records.

**Query Parameters:**
- `ipAssetId`: Filter by IP asset
- `platform`: Filter by platform
- `usageType`: Filter by usage type
- `startDate`: Filter by start date
- `endDate`: Filter by end date

#### POST /usage/webhook/:platform
Platform webhook endpoint for automated usage tracking.

**Platform-specific payloads:**

**Spotify:**
```json
{
  "streams": [
    {
      "track_id": "ip_asset_id",
      "count": 1000,
      "country": "US",
      "user_id": "user_123",
      "timestamp": "2024-01-15T10:00:00Z"
    }
  ]
}
```

**YouTube:**
```json
{
  "views": [
    {
      "video_id": "ip_asset_id",
      "count": 5000,
      "country": "US",
      "user_id": "user_123",
      "timestamp": "2024-01-15T10:00:00Z"
    }
  ]
}
```

### Analytics

#### GET /analytics/usage/:ipAssetId
Get usage analytics for a specific IP asset.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalUsage": 10000,
    "totalAmount": 5000.00,
    "byPlatform": {
      "spotify": 3000.00,
      "youtube": 1500.00,
      "apple_music": 500.00
    },
    "byType": {
      "stream": 4000.00,
      "download": 800.00,
      "license": 200.00
    },
    "dailyUsage": {
      "2024-01-15": 500.00,
      "2024-01-16": 600.00
    }
  }
}
```

#### GET /analytics/earnings/:stakeholderId
Get earnings analytics for a stakeholder.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalEarnings": 12500.00,
    "paymentsCount": 45,
    "earningsByCurrency": {
      "USD": 10000.00,
      "EUR": 2500.00
    },
    "monthlyEarnings": {
      "2024-01": 2000.00,
      "2024-02": 2500.00
    }
  }
}
```

## Error Codes

| Code | Description |
|------|-------------|
| AUTH_REQUIRED | Authentication required |
| INVALID_TOKEN | Invalid or expired token |
| INSUFFICIENT_PERMISSIONS | User lacks required permissions |
| RESOURCE_NOT_FOUND | Requested resource not found |
| VALIDATION_ERROR | Request validation failed |
| CONTRACT_ERROR | Smart contract operation failed |
| PLATFORM_ERROR | Platform integration error |
| PAYMENT_FAILED | Payment processing failed |

## Rate Limiting

- **General API**: 100 requests per 15 minutes
- **Webhook endpoints**: 1000 requests per 15 minutes
- **Analytics endpoints**: 50 requests per 15 minutes

## Webhook Security

Webhook endpoints use HMAC signature verification:

1. Generate a signature using your webhook secret
2. Include the signature in the `X-Signature` header
3. The server will verify the signature before processing

## SDKs and Libraries

### JavaScript/TypeScript

```bash
npm install royalty-platform-sdk
```

```javascript
import { RoyaltyPlatform } from 'royalty-platform-sdk'

const client = new RoyaltyPlatform({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.royalty-platform.com/api'
})

// Create IP asset
const asset = await client.ipAssets.create({
  title: 'Summer Vibes',
  type: 'music',
  royaltyShares: [...]
})
```

### Python

```bash
pip install royalty-platform-python
```

```python
from royalty_platform import RoyaltyPlatform

client = RoyaltyPlatform(
    api_key='your-api-key',
    base_url='https://api.royalty-platform.com/api'
)

# Track usage
usage = client.usage.track({
    'ip_asset_id': 'asset_id',
    'platform': 'spotify',
    'usage_type': 'stream',
    'amount': 1000
})
```

## Testing

### Test Environment

Use the test environment for development:

```
Base URL: https://test-api.royalty-platform.com/api
Network: Stellar Testnet
```

### Sample Test Data

```bash
# Create test IP asset
curl -X POST https://test-api.royalty-platform.com/api/ip-assets \
  -H "Authorization: Bearer test_token" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Track",
    "type": "music",
    "royaltyShares": [
      {"stakeholder": "GTEST123...", "percentage": 100}
    ]
  }'
```

## Support

For API support:
- Documentation: https://docs.royalty-platform.com
- Support Email: api-support@royalty-platform.com
- Status Page: https://status.royalty-platform.com
