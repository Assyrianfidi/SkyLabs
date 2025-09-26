import { useState, useCallback, useEffect } from 'react';
import { MapPin, Loader2, Send } from 'lucide-react';
import { toast } from 'react-hot-toast';

type FormData = {
  name: string;
  email: string;
  phone: string;
  message: string;
  website?: string; // Honeypot field
};

type FormErrors = Partial<Record<keyof FormData, string>>;

const ContactForm = () => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    message: '',
    website: ''
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateField = useCallback((name: keyof FormData, value: string): string => {
    switch (name) {
      case 'name':
        if (!value.trim()) return 'Name is required';
        break;
      case 'email':
        if (!value.trim()) return 'Email is required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Please enter a valid email';
        break;
      case 'phone':
        if (value && !/^\(\d{3}\) \d{3}-\d{4}$/.test(value)) return 'Phone must be in format (123) 456-7890';
        break;
      case 'message':
        if (!value.trim()) return 'Message is required';
        if (value.trim().length < 10) return 'Message must be at least 10 characters';
        break;
    }
    return '';
  }, []);

  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;

    (Object.keys(formData) as Array<keyof FormData>).forEach((field) => {
      if (field === 'website') return; // Skip honeypot
      const error = validateField(field, formData[field]);
      if (error) {
        newErrors[field] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [formData, validateField]);

  useEffect(() => {
    if (Object.keys(touched).length > 0) validateForm();
  }, [formData, touched]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Honeypot check
    if (formData.website) return;

    setTouched({
      name: true,
      email: true,
      phone: true,
      message: true
    });

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      // Simulated API request
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast.success('Thank you! Your message has been sent successfully');

      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        message: '',
        website: ''
      });
      setErrors({});
      setTouched({});
    } catch {
      toast.error('Failed to send message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = () =>
    Object.keys(errors).length === 0 &&
    formData.name.trim() !== '' &&
    formData.email.trim() !== '' &&
    formData.message.trim() !== '';

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <div className="flex items-center mb-6">
        <MapPin className="w-6 h-6 text-blue-600 mr-2" />
        <h2 className="text-2xl font-bold text-gray-800">Contact Us</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Honeypot - hidden from visual users but accessible to screen readers */}
        <div className="sr-only">
          <label htmlFor="website">Leave this field empty</label>
          <input 
            type="text" 
            id="website" 
            name="website" 
            value={formData.website} 
            onChange={handleChange} 
            autoComplete="off" 
            tabIndex={-1}
            aria-hidden="true"
          />
        </div>

        {/* Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
          <input
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            onBlur={handleBlur}
            aria-invalid={errors.name ? true : false}
            aria-describedby={errors.name ? 'name-error' : undefined}
            className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.name ? 'border-red-500' : 'border-gray-300'
            }`}
            aria-required="true"
          />
{{ ... }}
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            onBlur={handleBlur}
            aria-invalid={errors.email ? true : false}
            aria-describedby={errors.email ? 'email-error' : undefined}
            className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.email ? 'border-red-500' : 'border-gray-300'
            }`}
            aria-required="true"
          />
{{ ... }}
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            onBlur={handleBlur}
            placeholder="(123) 456-7890"
            aria-invalid={errors.phone ? true : false}
            aria-describedby={errors.phone ? 'phone-error' : undefined}
            className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.phone ? 'border-red-500' : 'border-gray-300'
            }`}
          />
{{ ... }}
            name="message"
            rows={4}
            value={formData.message}
            onChange={handleChange}
            onBlur={handleBlur}
            aria-invalid={errors.message ? true : false}
            aria-describedby={errors.message ? 'message-error' : undefined}
            className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.message ? 'border-red-500' : 'border-gray-300'
            }`}
            aria-required="true"
          />
{{ ... }}
        </div>

        {/* Submit */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting || !isFormValid()}
            aria-disabled={isSubmitting || !isFormValid()}
            aria-busy={isSubmitting}
            className={`w-full flex justify-center items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
              isSubmitting || !isFormValid() ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" />
                Sending...
              </>
            ) : (
              <>
                <Send className="-ml-1 mr-2 h-5 w-5" />
                Send Message
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ContactForm;
