import { useCallback, useRef, useEffect } from 'react';
import { AnalyticsEvent, AnalyticsEventPayload, AnalyticsService } from '../components/ContactFormWithRecaptcha/types';

/**
 * Default analytics service implementation
 */
const defaultAnalyticsService: AnalyticsService = {
  trackEvent: (event, payload) => {
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', event, {
        ...payload,
        event_timestamp: new Date().toISOString(),
      });
    } else if (process.env.NODE_ENV !== 'production') {
      console.log(`[Analytics Event] ${event}`, payload);
    }
  },
  trackError: (error, metadata) => {
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'exception', {
        description: error.message,
        fatal: false,
        ...metadata,
      });
    } else if (process.env.NODE_ENV !== 'production') {
      console.error('[Analytics Error]', error, metadata);
    }
  },
  trackMetric: (name, value, metadata) => {
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'timing_complete', {
        name,
        value,
        ...metadata,
      });
    } else if (process.env.NODE_ENV !== 'production') {
      console.log(`[Analytics Metric] ${name}: ${value}`, metadata);
    }
  },
};

/**
 * Custom hook for handling analytics events
 */
export const useAnalytics = (customService?: Partial<AnalyticsService>) => {
  const serviceRef = useRef<AnalyticsService>({
    ...defaultAnalyticsService,
    ...customService,
  });

  // Update the service if the custom service changes
  useEffect(() => {
    if (customService) {
      serviceRef.current = {
        ...defaultAnalyticsService,
        ...customService,
      };
    }
  }, [customService]);

  /**
   * Track an analytics event
   */
  const trackEvent = useCallback((event: AnalyticsEvent, payload: Omit<AnalyticsEventPayload, 'event' | 'timestamp'>) => {
    try {
      const eventPayload: AnalyticsEventPayload = {
        ...payload,
        event,
        timestamp: Date.now(),
      };
      
      serviceRef.current.trackEvent(event, eventPayload);
    } catch (error) {
      console.error('Error tracking analytics event:', error);
    }
  }, []);

  /**
   * Track an error
   */
  const trackError = useCallback((error: Error, metadata?: Record<string, unknown>) => {
    try {
      serviceRef.current.trackError(error, metadata);
    } catch (trackingError) {
      console.error('Error tracking error:', trackingError);
    }
  }, []);

  /**
   * Track a metric
   */
  const trackMetric = useCallback((name: string, value: number, metadata?: Record<string, unknown>) => {
    try {
      serviceRef.current.trackMetric(name, value, metadata);
    } catch (error) {
      console.error('Error tracking metric:', error);
    }
  }, []);

  /**
   * Track form load
   */
  const trackFormLoad = useCallback((formName: string, metadata?: Record<string, unknown>) => {
    trackEvent('form_load', {
      form_name: formName,
      ...metadata,
    });
  }, [trackEvent]);

  /**
   * Track form submission
   */
  const trackFormSubmit = useCallback((formName: string, metadata?: Record<string, unknown>) => {
    trackEvent('form_submit', {
      form_name: formName,
      ...metadata,
    });
  }, [trackEvent]);

  /**
   * Track form success
   */
  const trackFormSuccess = useCallback((formName: string, metadata?: Record<string, unknown>) => {
    trackEvent('form_success', {
      form_name: formName,
      ...metadata,
    });
  }, [trackEvent]);

  /**
   * Track form error
   */
  const trackFormError = useCallback((formName: string, error: Error, metadata?: Record<string, unknown>) => {
    trackEvent('form_error', {
      form_name: formName,
      error_message: error.message,
      error_name: error.name,
      ...metadata,
    });
    
    // Also track as an error
    trackError(error, {
      form_name: formName,
      ...metadata,
    });
  }, [trackEvent, trackError]);

  /**
   * Track validation error
   */
  const trackValidationError = useCallback((formName: string, field: string, error: string, metadata?: Record<string, unknown>) => {
    trackEvent('validation_error', {
      form_name: formName,
      field,
      error,
      ...metadata,
    });
  }, [trackEvent]);

  /**
   * Track reCAPTCHA load
   */
  const trackRecaptchaLoad = useCallback((formName: string, metadata?: Record<string, unknown>) => {
    trackEvent('recaptcha_load', {
      form_name: formName,
      ...metadata,
    });
  }, [trackEvent]);

  /**
   * Track reCAPTCHA error
   */
  const trackRecaptchaError = useCallback((formName: string, error: Error, metadata?: Record<string, unknown>) => {
    trackEvent('recaptcha_error', {
      form_name: formName,
      error_message: error.message,
      error_name: error.name,
      ...metadata,
    });
    
    // Also track as an error
    trackError(error, {
      form_name: formName,
      ...metadata,
    });
  }, [trackEvent, trackError]);

  /**
   * Track rate limit hit
   */
  const trackRateLimit = useCallback((formName: string, metadata?: Record<string, unknown>) => {
    trackEvent('rate_limit', {
      form_name: formName,
      ...metadata,
    });
  }, [trackEvent]);

  return {
    trackEvent,
    trackError,
    trackMetric,
    trackFormLoad,
    trackFormSubmit,
    trackFormSuccess,
    trackFormError,
    trackValidationError,
    trackRecaptchaLoad,
    trackRecaptchaError,
    trackRateLimit,
  };
};
