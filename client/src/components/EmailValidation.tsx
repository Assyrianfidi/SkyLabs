import React, { useState } from "react";
import { toast } from "react-hot-toast";
import { Loader2 } from "lucide-react";

interface EmailValidationProps {
  onSubmit?: (email: string) => Promise<void> | void;
}

const EmailValidation: React.FC<EmailValidationProps> = ({ onSubmit }) => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Validation function for reuse
  const handleValidation = (value: string) => {
    if (!value.trim()) return "Email is required";
    if (!validateEmail(value)) return "Please enter a valid email";
    return "";
  };

  const handleBlur = () => {
    const validationError = handleValidation(email);
    setError(validationError);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = handleValidation(email);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setIsSubmitting(true);
      if (onSubmit) await onSubmit(email);

      toast.success("Email validated successfully!");
      setEmail("");
      setError("");
    } catch (err) {
      console.error(err);
      toast.error("Failed to validate email. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Email Address <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              // Clear error when user starts typing
              if (error) setError('');
            }}
            onBlur={handleBlur}
            className={`w-full px-3 py-2 border ${
              error ? "border-red-500" : "border-gray-300"
            } rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
            placeholder="your@email.com"
            aria-invalid={!!error}
            aria-describedby={error ? 'email-error' : undefined}
            disabled={isSubmitting}
            required
          />
          {error && (
            <p 
              id="email-error" 
              role="alert"
              className="mt-1 text-sm text-red-600"
            >
              {error}
            </p>
          )}
        </div>
        <button
          type="submit"
          disabled={isSubmitting || !email.trim()}
          aria-disabled={isSubmitting || !email.trim()}
          className="w-full flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" aria-hidden="true" />
              <span>Validating...</span>
            </>
          ) : (
            <span>Validate Email</span>
          )}
        </button>
      </form>
    </div>
  );
};

export default EmailValidation;
