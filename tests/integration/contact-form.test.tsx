// @ts-nocheck
import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import ContactForm from '../client/src/components/ContactForm';

// Mock the fetch API
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock the reCAPTCHA
const mockGrecaptcha = {
  ready: (callback: () => void) => callback(),
  execute: jest.fn().mockResolvedValue('test-recaptcha-token'),
};

// @ts-ignore
global.grecaptcha = mockGrecaptcha;

describe("ContactForm Component", () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  test("renders all form fields correctly", () => {
    render(<ContactForm />);
    
    // Check all form fields are rendered
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/message/i)).toBeInTheDocument();
    
    // Check honeypot field is present but hidden
    const honeypot = screen.getByLabelText(/leave this field empty/i);
    expect(honeypot).toBeInTheDocument();
    expect(honeypot).toHaveAttribute('type', 'text');
    expect(honeypot).toHaveStyle('display: none');
    
    // Check submit button is present
    expect(screen.getByRole('button', { name: /send message/i })).toBeInTheDocument();
  });

  test("shows validation errors for required fields", async () => {
    render(<ContactForm />);
    
    // Submit form without filling any fields
    fireEvent.click(screen.getByRole("button", { name: /send message/i }));
    
    // Check for validation messages
    expect(await screen.findByText(/name is required/i)).toBeInTheDocument();
    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
    expect(await screen.findByText(/message is required/i)).toBeInTheDocument();
  });

  test("shows validation error for invalid email", async () => {
    render(<ContactForm />);
    
    // Enter an invalid email
    const emailInput = screen.getByLabelText(/email/i);
    fireEvent.change(emailInput, { target: { value: "invalid-email" } });
    
    // Submit the form
    fireEvent.click(screen.getByRole("button", { name: /send message/i }));
    
    // Check for email validation message
    expect(await screen.findByText(/please enter a valid email/i)).toBeInTheDocument();
  });

  test("submits form successfully with valid data", async () => {
    // Mock a successful fetch response
    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })
    );

    render(<ContactForm />);
    
    // Fill out the form
    fireEvent.change(screen.getByLabelText(/name/i), { 
      target: { value: "John Doe" } 
    });
    fireEvent.change(screen.getByLabelText(/email/i), { 
      target: { value: "john@example.com" } 
    });
    fireEvent.change(screen.getByLabelText(/phone/i), { 
      target: { value: "123-456-7890" } 
    });
    fireEvent.change(screen.getByLabelText(/message/i), { 
      target: { value: "Hello, this is a test message" } 
    });
    
    // Submit the form
    fireEvent.click(screen.getByRole("button", { name: /send message/i }));
    
    // Check if loading state is shown
    expect(await screen.findByText(/sending/i)).toBeInTheDocument();
    
    // Wait for the success message
    await waitFor(() => {
      expect(screen.getByText(/message sent successfully/i)).toBeInTheDocument();
    });
    
    // Verify the form was submitted with the correct data
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/contact"),
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "John Doe",
          email: "john@example.com",
          phone: "123-456-7890",
          message: "Hello, this is a test message",
          'g-recaptcha-response': 'test-recaptcha-token',
          // Honeypot field should be empty
          'website': ''
        }),
      })
    );
  });

  test("handles error response correctly", async () => {
    // Mock a failed fetch response
    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: "Something went wrong" }),
      })
    );

    render(<ContactForm />);
    
    // Fill out the form with valid data
    fireEvent.change(screen.getByLabelText(/name/i), { 
      target: { value: "John Doe" } 
    });
    fireEvent.change(screen.getByLabelText(/email/i), { 
      target: { value: "john@example.com" } 
    });
    fireEvent.change(screen.getByLabelText(/message/i), { 
      target: { value: "Hello, this is a test message" } 
    });
    
    // Submit the form
    fireEvent.click(screen.getByRole("button", { name: /send message/i }));
    
    // Check if error message is shown
    expect(await screen.findByText(/something went wrong/i)).toBeInTheDocument();
  });

  test("honeypot field prevents spam", async () => {
    render(<ContactForm />);
    
    // Fill out the form with honeypot field
    fireEvent.change(screen.getByLabelText(/name/i), { 
      target: { value: "Spam Bot" } 
    });
    fireEvent.change(screen.getByLabelText(/email/i), { 
      target: { value: "spam@example.com" } 
    });
    fireEvent.change(screen.getByLabelText(/message/i), { 
      target: { value: "This is spam!" } 
    });
    
    // Fill the honeypot field
    const honeypot = screen.getByLabelText(/leave this field empty/i);
    fireEvent.change(honeypot, { target: { value: "spam-bot" } });
    
    // Submit the form
    fireEvent.click(screen.getByRole("button", { name: /send message/i }));
    
    // The form should not submit (fetch should not be called)
    await waitFor(() => {
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });
});
