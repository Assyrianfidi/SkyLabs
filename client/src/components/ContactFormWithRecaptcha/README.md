# Contact Form with reCAPTCHA v3

A secure, accessible, and performant contact form component with Google reCAPTCHA v3 integration.

## Features

- **TypeScript Support**: Fully typed with TypeScript for better developer experience
- **Accessibility**: WCAG 2.1 compliant with proper ARIA attributes and keyboard navigation
- **Security**:
  - reCAPTCHA v3 for bot protection
  - Honeypot field for additional bot detection
  - Client-side rate limiting
  - CSRF protection
- **Performance**:
  - Lazy loading of reCAPTCHA script
  - Optimized re-renders with React.memo
  - Code splitting with dynamic imports
- **Error Handling**:
  - Comprehensive form validation
  - Error boundaries
  - User-friendly error messages
  - Retry mechanisms

## Installation

1. Install the required dependencies:

```bash
npm install react-hook-form @google/recaptcha-verify
```

2. Add your reCAPTCHA site key to your environment variables:

```env
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your_site_key_here
```

## Usage

```tsx
import dynamic from 'next/dynamic';

// Import with no SSR to avoid window/document issues
const ContactFormWithRecaptcha = dynamic(
  () => import('@/components/ContactFormWithRecaptcha'),
  { ssr: false }
);

const ContactPage = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1>Contact Us</h1>
      <ContactFormWithRecaptcha />
    </div>
  );
};

export default ContactPage;
```

## Props

The component accepts the following props:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| className | string | '' | Additional CSS classes for the form container |
| onSubmit | (data: FormData) => Promise<void> | - | Custom submit handler |
| onSuccess | (data: any) => void | - | Callback when form is successfully submitted |
| onError | (error: Error) => void | - | Callback when form submission fails |

## Form Data Structure

The form collects the following data:

```typescript
interface FormData {
  name: string;
  email: string;
  message: string;
  website?: string; // Honeypot field
}
```

## Server-Side Validation

For security, always validate the form submission on the server. Here's an example using Next.js API route:

```typescript
// pages/api/contact.ts
import { verify } from '@google/recaptcha-verify';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { name, email, message, 'g-recaptcha-response': token } = req.body;

    // Verify reCAPTCHA token
    const recaptcha = new verify.Recaptcha(
      process.env.RECAPTCHA_SECRET_KEY,
      token
    );
    
    const { success, score } = await recaptcha.verify();
    
    if (!success || score < 0.5) {
      return res.status(400).json({ message: 'Failed reCAPTCHA verification' });
    }

    // Process the form data (e.g., send email, save to database)
    // ...

    return res.status(200).json({ message: 'Message sent successfully' });
  } catch (error) {
    console.error('Form submission error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
```

## Testing

Run the test suite:

```bash
npm test
```

### Test Coverage

- Form rendering and functionality
- Form validation
- Error handling
- Accessibility
- reCAPTCHA integration
- Rate limiting

## Accessibility

The form includes:

- Proper ARIA attributes
- Keyboard navigation
- Screen reader support
- Focus management
- Error messages with proper roles

## Deployment Checklist

- [ ] Set up reCAPTCHA v3 in Google Cloud Console
- [ ] Add reCAPTCHA site key to environment variables
- [ ] Configure CSP headers for reCAPTCHA
- [ ] Set up rate limiting on the API endpoint
- [ ] Test form submission with JavaScript disabled
- [ ] Verify accessibility with screen readers
- [ ] Monitor reCAPTCHA scores and adjust threshold if needed
- [ ] Set up error tracking for form submissions

## Troubleshooting

### reCAPTCHA not loading
- Verify your site key is correct
- Check browser console for errors
- Ensure your domain is whitelisted in reCAPTCHA settings

### Form not submitting
- Check network tab for failed requests
- Verify API endpoint is correct
- Ensure CORS is properly configured

## License

MIT
