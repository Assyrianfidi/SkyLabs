import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import ContactForm from '@/components/ContactForm';
import { rest } from 'msw';
import { setupServer } from 'msw/node';

// Mock server for API requests
const server = setupServer(
  rest.post('/api/contact', (req, res, ctx) => {
    // Simulate network error
    if (req.body.email === 'network-error@example.com') {
      return res.networkError('Failed to connect');
    }
    // Simulate timeout
    if (req.body.email === 'timeout@example.com') {
      return res(ctx.delay(10000), ctx.json({ success: true }));
    }
    // Simulate invalid JSON response
    if (req.body.email === 'invalid-json@example.com') {
      return res(ctx.text('Not JSON'));
    }
    return res(ctx.json({ success: true }));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('Edge Case Tests', () => {
  // Test network errors
  test('handles network errors during form submission', async () => {
    render(<ContactForm />);
    
    // Fill out the form with network error email
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'network-error@example.com' } });
    fireEvent.change(screen.getByLabelText(/message/i), { target: { value: 'This should cause a network error' } });
    
    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /send message/i }));
    
    // Check for network error message
    expect(await screen.findByText(/network error/i)).toBeInTheDocument();
  });

  // Test API timeouts
  test('handles API timeouts gracefully', async () => {
    // Mock the fetch with a timeout
    jest.useFakeTimers();
    
    render(<ContactForm />);
    
    // Fill out the form with timeout email
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'timeout@example.com' } });
    fireEvent.change(screen.getByLabelText(/message/i), { target: { value: 'This should time out' } });
    
    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /send message/i }));
    
    // Fast-forward time to trigger timeout
    jest.advanceTimersByTime(10000);
    
    // Check for timeout message
    expect(await screen.findByText(/request timed out/i)).toBeInTheDocument();
    
    jest.useRealTimers();
  });

  // Test invalid JSON response
  test('handles invalid JSON response', async () => {
    render(<ContactForm />);
    
    // Fill out the form with invalid JSON email
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'invalid-json@example.com' } });
    fireEvent.change(screen.getByLabelText(/message/i), { target: { value: 'This should return invalid JSON' } });
    
    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /send message/i }));
    
    // Check for JSON parse error
    expect(await screen.findByText(/invalid response/i)).toBeInTheDocument();
  });

  // Test XSS prevention
  test('sanitizes user input to prevent XSS', async () => {
    render(<ContactForm />);
    
    // Try to inject script tags
    const xssPayload = '<script>alert("XSS")</script>';
    
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: xssPayload } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/message/i), { target: { value: 'Test message' } });
    
    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /send message/i }));
    
    // Check that the script tags were stripped
    expect(screen.getByLabelText(/name/i)).not.toHaveValue(xssPayload);
    expect(screen.getByLabelText(/name/i)).toHaveValue(''); // Should be empty due to validation
  });

  // Test extremely long input
  test('handles extremely long input', async () => {
    render(<ContactForm />);
    
    const longString = 'a'.repeat(10000);
    
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: longString } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/message/i), { target: { value: longString } });
    
    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /send message/i }));
    
    // Check that the form handles long input (specific behavior depends on your implementation)
    // For example, you might want to check if the input is truncated or if an error is shown
    expect(screen.getByLabelText(/name/i).value.length).toBeLessThanOrEqual(255); // Assuming 255 char limit
  });
});
