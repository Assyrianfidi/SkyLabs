import { RenderResult, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/react';
import { vi } from 'vitest';

type TestBlurValidationOptions = {
  requiredMessage?: string;
  invalidMessage?: string;
};

/**
 * Tests blur validation for a form input field
 * @param user - User Event instance
 * @param screen - Testing Library screen or render result
 * @param fieldName - Name of the field to test
 * @param invalidValue - An invalid value for the field
 * @param validValue - A valid value for the field
 * @param requiredMessage - Expected required error message
 * @param invalidMessage - Expected invalid format error message
 */
export const testBlurValidation = async (
  user: any,
  screen: any,
  fieldName: string,
  invalidValue: string,
  validValue: string,
  requiredMessage: string,
  invalidMessage: string,
  options: TestBlurValidationOptions = {}
) => {
  const { requiredMessage: customRequired, invalidMessage: customInvalid } = options;
  const field = screen.getByTestId(fieldName);
  
  // Test required validation on blur
  await user.click(field);
  await user.tab();
  
  await waitFor(() => {
    expect(field).toHaveAttribute('aria-invalid', 'true');
    const errorId = field.getAttribute('aria-describedby');
    const errorElement = document.getElementById(errorId || '');
    expect(errorElement).toHaveTextContent(customRequired || requiredMessage);
  });
  
  // Test invalid format validation
  await user.type(field, invalidValue);
  await user.tab();
  
  await waitFor(() => {
    expect(field).toHaveAttribute('aria-invalid', 'true');
    const errorId = field.getAttribute('aria-describedby');
    const errorElement = document.getElementById(errorId || '');
    expect(errorElement).toHaveTextContent(customInvalid || invalidMessage);
  });
  
  // Test valid input clears errors
  await user.clear(field);
  await user.type(field, validValue);
  await user.tab();
  
  await waitFor(() => {
    expect(field).toHaveAttribute('aria-invalid', 'false');
    expect(field).toHaveAttribute('aria-describedby', '');
  });
};

/**
 * Tests form submission with loading state
 * @param user - User Event instance
 * @param submitButton - The submit button element or button text
 * @param submitSpy - Mock function for form submission
 */
export const testFormSubmission = async (
  user: any,
  submitButton: HTMLElement | string,
  submitSpy: ReturnType<typeof vi.fn>
) => {
  const button = typeof submitButton === 'string' 
    ? screen.getByRole('button', { name: new RegExp(submitButton, 'i') })
    : submitButton;
  
  await user.click(button);
  
  // Check if loading state is handled
  await waitFor(() => {
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent(/sending|validating|loading/i);
  });
  
  // Wait for submission to complete
  await waitFor(() => {
    expect(submitSpy).toHaveBeenCalled();
  });
};

/**
 * Tests honeypot field functionality
 * @param user - User Event instance
 * @param form - The form element or a function to get it
 * @param honeypotField - The honeypot field name or selector
 * @param submitSpy - Mock function for form submission
 */
export const testHoneypot = async (
  user: any,
  form: HTMLElement | (() => HTMLElement),
  honeypotField: string,
  submitSpy: ReturnType<typeof vi.fn>
) => {
  const formElement = typeof form === 'function' ? form() : form;
  const honeypot = formElement.querySelector(
    honeypotField.startsWith('[') 
      ? honeypotField 
      : `[name="${honeypotField}"]`
  ) as HTMLInputElement;
  
  if (!honeypot) {
    throw new Error(`Honeypot field '${honeypotField}' not found`);
  }
  
  // Fill honeypot field
  await user.type(honeypot, 'spam@example.com');
  
  // Submit form
  const submitButton = formElement.querySelector('button[type="submit"]') as HTMLButtonElement;
  await user.click(submitButton);
  
  // Verify honeypot prevents submission
  await waitFor(() => {
    expect(submitSpy).not.toHaveBeenCalled();
  });
};

/**
 * Fills a form field and optionally validates the value
 * @param user - User Event instance
 * @param field - Field element or label text
 * @param value - Value to fill
 * @param options - Additional options
 */
export const fillField = async (
  user: any,
  field: HTMLElement | string,
  value: string,
  options: { clearFirst?: boolean } = { clearFirst: true }
) => {
  const fieldElement = typeof field === 'string' 
    ? screen.getByLabelText(new RegExp(field, 'i'))
    : field;
  
  if (options.clearFirst) {
    await user.clear(fieldElement);
  }
  
  if (value) {
    await user.type(fieldElement, value);
  }
  
  return fieldElement;
};

/**
 * Submits a form and waits for it to complete
 * @param user - User Event instance
 * @param buttonText - Text of the submit button
 * @param options - Additional options
 */
export const submitForm = async (
  user: any,
  buttonText: string,
  options: { waitForSuccess?: boolean } = { waitForSuccess: true }
) => {
  const button = screen.getByRole('button', { name: new RegExp(buttonText, 'i') });
  await user.click(button);
  
  if (options.waitForSuccess) {
    await waitFor(() => {
      expect(button).not.toBeDisabled();
    });
  }
};
