# Contact Form API Documentation

This document provides detailed information about the Contact Form API endpoints, request/response formats, and error handling.

## Base URL

All API endpoints are relative to the base URL of your application (e.g., `https://api.yourdomain.com`).

## Endpoints

### Submit Contact Form

Submit a new contact form message.

```
POST /api/contact
```

#### Request Headers

```
Content-Type: application/json
```

#### Request Body

| Field   | Type   | Required | Description                                      |
|---------|--------|----------|--------------------------------------------------|
| name    | string | Yes      | Name of the person submitting the form           |
| email   | string | Yes      | Email address for response                      |
| phone   | string | No       | Phone number (optional)                          |
| message | string | Yes      | Message content                                  |
| website | string | No       | Honeypot field - should be empty for real users |

Example:

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "message": "Hello, I'm interested in your services.",
  "website": ""
}
```

#### Responses

**Success (200 OK)**

```json
{
  "success": true,
  "message": "Your message has been sent successfully! We'll get back to you soon.",
  "data": {
    "id": 123,
    "name": "John Doe",
    "email": "john@example.com",
    "submittedAt": "2023-06-15T10:30:00Z"
  }
}
```

**Validation Error (400 Bad Request)**

```json
{
  "success": false,
  "error": "Validation failed",
  "details": {
    "email": "Please enter a valid email address",
    "message": "Message must be at least 10 characters"
  }
}
```

**Rate Limit Exceeded (429 Too Many Requests)**

```json
{
  "success": false,
  "error": "Too many requests. Please try again later.",
  "retryAfter": 900
}
```

**Server Error (500 Internal Server Error)**

```json
{
  "success": false,
  "error": "An unexpected error occurred while processing your request. Please try again later.",
  "code": "INTERNAL_SERVER_ERROR"
}
```

## Rate Limiting

The API implements rate limiting to prevent abuse. By default, the following limits apply:

- **Production**: 5 requests per 15 minutes per IP address
- **Development/Test**: 100 requests per 15 minutes per IP address

Rate limit headers are included in responses:

- `X-RateLimit-Limit`: Maximum number of requests allowed in the time window
- `X-RateLimit-Remaining`: Number of requests remaining in the current window
- `X-RateLimit-Reset`: Time at which the rate limit resets (UNIX timestamp)
- `Retry-After`: Number of seconds to wait before making another request (only when rate limited)

## Security

### Honeypot Protection

A hidden field named `website` is used as a honeypot to detect and block spam bots. This field should:
- Be hidden from users using CSS (`display: none` or similar)
- Have a generic label like "Leave this field empty"
- Be ignored by the frontend when submitting the form

### Input Validation

All input is validated on the server side. The following validations are performed:

- **Name**: 2-100 characters, required
- **Email**: Valid email format, required
- **Phone**: Optional, but must be a valid phone number if provided
- **Message**: 10-2000 characters, required

### CORS

CORS is properly configured to only allow requests from trusted origins.

## Environment Variables

The following environment variables are used by the contact form API:

| Variable | Description | Example |
|----------|-------------|---------|
| `SMTP_HOST` | SMTP server host | `smtp.example.com` |
| `SMTP_PORT` | SMTP server port | `587` |
| `SMTP_SECURE` | Use TLS | `false` |
| `SMTP_USER` | SMTP username | `user@example.com` |
| `SMTP_PASS` | SMTP password | `your-password` |
| `SMTP_FROM` | Sender email address | `"SkyLabs Contact" <noreply@skylabs.com>` |
| `SMTP_TO` | Recipient email address | `your-email@example.com` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window in milliseconds | `900000` (15 minutes) |
| `RATE_LIMIT_MAX` | Maximum requests per window | `5` |
| `NODE_ENV` | Environment | `production`, `development`, or `test` |

## Testing

### Unit Tests

Run the test suite with:

```bash
npm test
```

### Manual Testing

You can test the API using `curl`:

```bash
# Valid request
curl -X POST http://localhost:3000/api/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","message":"This is a test message"}'

# Invalid request (missing required fields)
curl -X POST http://localhost:3000/api/contact \
  -H "Content-Type: application/json" \
  -d '{"name":""}'
```

## Error Handling

The API returns appropriate HTTP status codes and JSON error responses. The error response format is:

```typescript
interface ErrorResponse {
  success: false;
  error: string;
  code?: string;        // Optional error code
  details?: Record<string, string>;  // Additional error details
  retryAfter?: number;  // For rate limiting
}
```
## Monitoring and Logging

All API requests are logged with the following information:

- Timestamp
- IP address
- User agent
- Request method and path
- Response status code
- Processing time
- Any errors that occurred

Logs are stored in the `logs/` directory with separate files for errors and combined logs.
