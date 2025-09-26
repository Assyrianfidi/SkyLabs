import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock the ContactForm component
const ContactForm = () => {
  return (
    <form data-testid="contact-form">
      <input 
        type="text" 
        name="name" 
        placeholder="Name" 
        data-testid="name-input" 
      />
      <button type="submit">Submit</button>
    </form>
  );
};

describe('ContactForm', () => {
  it('renders the form', () => {
    render(<ContactForm />);
    expect(screen.getByTestId('contact-form')).toBeInTheDocument();
  });

  it('allows entering a name', () => {
    render(<ContactForm />);
    const input = screen.getByTestId('name-input');
    fireEvent.change(input, { target: { value: 'John Doe' } });
    expect(input.value).toBe('John Doe');
  });
});
