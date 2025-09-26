# reCAPTCHA v3 Integration

This document provides comprehensive documentation for the reCAPTCHA v3 integration in the SkyLabs application.

## Table of Contents
- [Overview](#overview)
- [Backend Implementation](#backend-implementation)
  - [Verification Utility](#verification-utility)
  - [Express Middleware](#express-middleware)
- [Frontend Implementation](#frontend-implementation)
  - [ReCaptchaUtility](#recaptchautility)
  - [useRecaptcha Hook](#userecaptcha-hook)
- [Configuration](#configuration)
- [Error Handling](#error-handling)
- [Testing](#testing)
- [Best Practices](#best-practices)

## Overview

The reCAPTCHA v3 integration provides protection against spam and abuse without user interaction. It returns a score (1.0 is very likely a good interaction, 0.0 is very likely a bot) based on the interactions with your site.

## Backend Implementation

### Verification Utility

Located at `server/utils/recaptchaVerifier.ts`, this utility handles the verification of reCAPTCHA tokens with Google's API.

#### Key Features:
- Token verification with Google's API
- Score-based verification
- Hostname verification
- Action verification
- Error handling and logging

#### Usage:

```typescript
import { verifyRecaptchaToken } from '../utils/recaptchaVerifier';

const result = await verifyRecaptchaToken(token, {
  minScore: 0.5,
  expectedHostname: 'yourdomain.com',
  expectedAction: 'login'
});

if (!result.success) {
  // Handle verification failure
  console.error('reCAPTCHA verification failed:', result.error);
}
```

### Express Middleware

Located at `server/middleware/recaptchaMiddleware.ts`, this middleware can be used to protect routes with reCAPTCHA verification.

#### Key Features:
- Token extraction from request
- Score validation
- Caching of verification results
- Configurable options

#### Usage:

```typescript
import { verifyRecaptcha } from '../middleware/recaptchaMiddleware';

// Basic usage
router.post('/protected-route', verifyRecaptcha(), (req, res) => {
  // Route handler
});

// With custom options
router.post('/login', verifyRecaptcha({
  input: 'recaptcha_token', // Custom field name
  action: 'login',          // Expected action
  minScore: 0.7,            // Minimum score
  required: true,           // Whether reCAPTCHA is required
  useCache: true            // Enable caching
}), (req, res) => {
  // Route handler
});
```

## Frontend Implementation

### ReCaptchaUtility

Located at `client/src/utils/recaptcha.ts`, this utility handles the client-side reCAPTCHA integration.

#### Key Features:
- Singleton pattern for script management
- Event-based API
- Token generation and refresh
- Badge visibility control

#### Usage:

```typescript
import ReCaptchaUtility from '../utils/recaptcha';

// Get instance
const recaptcha = ReCaptchaUtility.getInstance('your-site-key');

// Load script
await recaptcha.loadScript();

// Execute reCAPTCHA
const token = await recaptcha.execute('login');

// Handle events
recaptcha.on('execute', ({ action, token }) => {
  console.log(`reCAPTCHA executed for ${action} with token:`, token);
});

recaptcha.on('error', ({ type, error }) => {
  console.error(`reCAPTCHA error (${type}):`, error);
});
```

### useRecaptcha Hook

Located at `client/src/hooks/useRecaptcha.ts`, this React hook provides an easy way to use reCAPTCHA in React components.

#### Key Features:
- Automatic script loading
- Retry logic for failed attempts
- Loading and error states
- Token refresh

#### Usage:

```typescript
import { useRecaptcha } from '../hooks/useRecaptcha';

function LoginForm() {
  const { 
    executeRecaptcha, 
    refreshRecaptcha, 
    resetRecaptcha,
    isLoading, 
    error 
  } = useRecaptcha('your-site-key', {
    maxRetries: 3,
    retryDelay: 1000,
    onError: (error) => {
      console.error('reCAPTCHA error:', error);
    }
  });

  const handleSubmit = async () => {
    try {
      const token = await executeRecaptcha('login', {
        maxRetries: 2,
        delay: 500
      });
      
      // Submit form with token
      await submitLoginForm({ token });
      
    } catch (error) {
      // Handle error
    }
  };

  if (isLoading) {
    return <div>Loading reCAPTCHA...</div>;
  }

  if (error) {
    return (
      <div>
        <div>Failed to load reCAPTCHA</div>
        <button onClick={resetRecaptcha}>Retry</button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <button type="submit">Login</button>
    </form>
  );
}
```

## Configuration

### Environment Variables

#### Backend:
```env
# reCAPTCHA
RECAPTCHA_SECRET_KEY=your_secret_key
RECAPTCHA_MIN_SCORE=0.5
EXPECTED_DOMAIN=yourdomain.com
```

#### Frontend:
```env
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your_site_key
```

## Error Handling

### Common Errors

1. **Token Verification Failed**
   - Cause: Invalid or expired token
   - Solution: Generate a new token on the client side

2. **Score Too Low**
   - Cause: Suspicious activity detected
   - Solution: Implement additional verification steps

3. **Script Load Failure**
   - Cause: Network issues or invalid site key
   - Solution: Check network connection and site key

### Logging

All reCAPTCHA-related errors are logged to the console in development mode. In production, consider implementing a logging service.

## Testing

### Unit Tests

Run the test suite with:

```bash
npm test
```

### Manual Testing

1. Test with different scores using the reCAPTCHA test keys:
   - Site key: `6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI`
   - Secret key: `6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe`

2. Test error cases by:
   - Blocking the reCAPTCHA script
   - Using invalid tokens
   - Simulating network failures

## Best Practices

1. **Score Thresholds**
   - Use a threshold of 0.5 for most actions
   - Use a higher threshold (0.7-0.9) for sensitive actions
   - Log all scores for analysis and adjustment

2. **User Experience**
   - Show a loading state while initializing reCAPTCHA
   - Provide clear error messages
   - Implement a fallback for when reCAPTCHA fails

3. **Security**
   - Always verify tokens on the server
   - Use environment variables for keys
   - Implement rate limiting
   - Monitor for abuse

4. **Performance**
   - Load the reCAPTCHA script asynchronously
   - Cache verification results when appropriate
   - Use the badge visibility methods to control rendering

## Troubleshooting

### reCAPTCHA not loading
1. Check the browser console for errors
2. Verify the site key is correct
3. Ensure the domain is registered in the reCAPTCHA admin console

### Token verification failing
1. Check the server logs for specific error messages
2. Verify the secret key is correct
3. Ensure the token is being passed correctly from client to server

### Low scores
1. Review the reCAPTCHA admin console for insights
2. Consider implementing additional verification steps
3. Check for any JavaScript errors that might interfere with reCAPTCHA

## License

This integration is provided under the [MIT License](https://opensource.org/licenses/MIT).
