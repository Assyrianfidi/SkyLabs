import { useState, type FormEvent, type ChangeEvent, useEffect } from 'react';
import { Mail, Phone, MapPin, Send, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

type FormSubmitResponse = {
  success: boolean;
  error?: string;
};

type ContactFormSubmitHandler = (data: ContactFormData) => Promise<FormSubmitResponse>;

export type ContactFormData = {
  name: string;
  email: string;
  phone: string;
  message: string;
  website?: string; // Honeypot field
};

export interface ContactFormProps {
  onSubmit?: ContactFormSubmitHandler;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  contactInfo?: {
    email: string;
    phone: string;
    location: string;
  };
}

const DEFAULT_FORM_STATE: ContactFormData = {
  name: '',
  email: '',
  phone: '',
  message: '',
  website: '',
};

const DEFAULT_CONTACT_INFO = {
  email: 'fidi.amazon@gmail.com',
  phone: '(123) 456-7890',
  location: 'San Francisco, CA',
};

export const ContactForm = ({
  onSubmit: externalOnSubmit,
  onSuccess,
  onError,
  contactInfo = DEFAULT_CONTACT_INFO,
}: ContactFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [formData, setFormData] = useState<ContactFormData>(DEFAULT_FORM_STATE);
  const [formErrors, setFormErrors] = useState<Partial<ContactFormData>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Check if form is valid
  const isFormValid = (): boolean => {
    return (
      formData.name.trim() !== '' &&
      formData.email.trim() !== '' &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) &&
      formData.message.trim() !== '' &&
      Object.values(formErrors).every(error => !error)
    );
  };

  // Update validation on form data change
  useEffect(() => {
    const errors: Partial<ContactFormData> = {};
    
    if (!formData.name.trim()) errors.name = 'Name is required';
    
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email';
    }
    
    if (!formData.message.trim()) {
      errors.message = 'Message is required';
    } else if (formData.message.trim().length < 10) {
      errors.message = 'Message must be at least 10 characters';
    }
    
    setFormErrors(errors);
  }, [formData]);

  // Scroll to top on success or error
  useEffect(() => {
    if (isSuccess || submitError) {
      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    }
  }, [isSuccess, submitError]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Default form submission handler
  const submitForm = async (data: ContactFormData): Promise<FormSubmitResponse> => {
    // This is a mock implementation - replace with actual API call
    console.log('Form submitted:', data);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Randomly fail 10% of the time for testing
    if (Math.random() < 0.1) {
      throw new Error('Failed to submit form. Please try again later.');
    }
    
    return { success: true };
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // If honeypot field is filled, treat as bot and show success without submitting
    if (formData.website) {
      setIsSuccess(true);
      return;
    }

    // Final validation check before submission
    if (!isFormValid()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const result = externalOnSubmit
        ? await externalOnSubmit(formData)
        : await submitForm(formData);

      if (result.success) {
        setIsSuccess(true);
        setFormData(DEFAULT_FORM_STATE);
        setFormErrors({});
        onSuccess?.();
        // The test expects this exact success message
        toast.success('Thank you! Your message has been sent successfully');
      } else {
        throw new Error(result.error || 'Failed to send message');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
      setSubmitError(errorMessage);
      onError?.(error instanceof Error ? error : new Error(errorMessage));
      toast.error('Failed to send message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="text-center py-12">
        <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
        <p className="text-2xl font-bold text-green-600">Thank you!</p>
        <p className="mt-2 text-gray-600">Your message has been sent successfully</p>
        <button
          onClick={() => {
            setIsSuccess(false);
            setFormData(DEFAULT_FORM_STATE);
            setFormErrors({});
          }}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {submitError && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-md">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            {submitError}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                formErrors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Your name"
            />
            {formErrors.name && (
              <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                formErrors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="your.email@example.com"
              aria-invalid={formErrors.email ? "true" : "false"}
              aria-describedby={formErrors.email ? "email-error" : ""}
            />
            {formErrors.email && (
              <p className="mt-1 text-sm text-red-600">{formErrors.email}</p>
            )}
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="(123) 456-7890"
            />
          </div>

          {/* Honeypot field - hidden from users but visible to bots */}
          <div className="hidden">
            <label htmlFor="website">Leave this field empty</label>
            <input
              type="text"
              id="website"
              name="website"
              value={formData.website}
              onChange={handleChange}
              tabIndex={-1}
              autoComplete="off"
              className="hidden"
            />
          </div>
        </div>

        <div>
          <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
            Message *
          </label>
          <textarea
            id="message"
            name="message"
            rows={5}
            value={formData.message}
            onChange={handleChange}
            className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              formErrors.message ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Your message..."
          />
          {formErrors.message && (
            <p className="mt-1 text-sm text-red-600">{formErrors.message}</p>
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting || !isFormValid()}
            aria-disabled={(isSubmitting || !isFormValid()) ? "true" : "false"}
            className={`px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center ${
              isSubmitting || !isFormValid() ? 'opacity-75 cursor-not-allowed' : ''
            }`}
            data-testid="submit-button"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin mr-2 h-4 w-4" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send Message
              </>
            )}
          </button>
        </div>
      </form>
      
      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="flex items-center">
          <div className="bg-blue-100 p-3 rounded-full mr-4">
            <Mail className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900">Email</h3>
            <a href={`mailto:${contactInfo.email}`} className="text-gray-600 hover:text-blue-600">
              {contactInfo.email}
            </a>
          </div>
        </div>
        
        <div className="flex items-center">
          <div className="bg-blue-100 p-3 rounded-full mr-4">
            <Phone className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900">Phone</h3>
            <a href={`tel:${contactInfo.phone.replace(/[^0-9+]/g, '')}`} className="text-gray-600 hover:text-blue-600">
              {contactInfo.phone}
            </a>
          </div>
        </div>
        
        <div className="flex items-center">
          <div className="bg-blue-100 p-3 rounded-full mr-4">
            <MapPin className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900">Location</h3>
            <p className="text-gray-600">{contactInfo.location}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactForm;
