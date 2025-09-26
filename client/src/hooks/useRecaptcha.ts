import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import ReCaptchaUtility from '../utils/recaptcha';
import { 
  RecaptchaError, 
  RecaptchaErrorCode, 
  createRecaptchaError,
  isRecaptchaError 
} from '../utils/recaptchaErrors';
import { AnalyticsEvent } from '../components/ContactFormWithRecaptcha/types';

/**
 * Options for the useRecaptcha hook
 * @property {number} [maxRetries=2] - Maximum number of retry attempts for initialization
 * @property {number} [retryDelay=1000] - Base delay between retries in milliseconds
 * @property {string} [action='submit'] - Default action name for reCAPTCHA
 * @property {boolean} [autoLoad=true] - Whether to automatically load reCAPTCHA on mount
 * @property {boolean} [debug=false] - Enable debug logging
 * @property {Function} [onError] - Error handler for reCAPTCHA errors
 * @property {Function} [onLoad] - Callback when reCAPTCHA is successfully loaded
 * @property {Function} [onExecute] - Callback when reCAPTCHA is executed
 * @property {Function} [onRefresh] - Callback when reCAPTCHA token is refreshed
 * @property {Function} [onReset] - Callback when reCAPTCHA is reset
 */
export interface UseRecaptchaOptions {
  maxRetries?: number;
  retryDelay?: number;
  action?: string;
  autoLoad?: boolean;
  debug?: boolean;
  onError?: (error: RecaptchaError) => void;
  onLoad?: () => void;
  onExecute?: (action: string) => void;
  onRefresh?: (action: string) => void;
  onReset?: () => void;
  analyticsService?: {
    trackEvent: (event: AnalyticsEvent, payload: Record<string, unknown>) => void;
  };
}

/**
 * Return type of the useRecaptcha hook
 * @property {Function} execute - Execute reCAPTCHA with the given action
 * @property {Function} refresh - Refresh the reCAPTCHA token
 * @property {Function} reset - Reset the reCAPTCHA instance
 * @property {boolean} isLoading - Whether reCAPTCHA is currently loading
 * @property {boolean} isReady - Whether reCAPTCHA is ready to be used
 * @property {RecaptchaError | null} error - Any error that occurred
 * @property {string | null} token - The current reCAPTCHA token (if any)
 */
export interface UseRecaptchaReturn {
  execute: (action?: string) => Promise<string>;
  refresh: (action?: string) => Promise<string>;
  reset: () => Promise<void>;
  isLoading: boolean;
  isReady: boolean;
  error: RecaptchaError | null;
  token: string | null;
}

/**
 * Custom hook for managing reCAPTCHA v3
 * @param {string} siteKey - Your reCAPTCHA site key
 * @param {UseRecaptchaOptions} [options] - Configuration options
 * @returns {UseRecaptchaReturn} Methods and state for interacting with reCAPTCHA
 */
export const useRecaptcha = (
  siteKey: string,
  options: UseRecaptchaOptions = {}
): UseRecaptchaReturn => {
  const {
    maxRetries = 2,
    retryDelay = 1000,
    action: defaultAction = 'submit',
    autoLoad = true,
    debug = false,
    onError,
    onLoad,
    onExecute,
    onRefresh,
    onReset,
    analyticsService,
  } = options;
  
  const [recaptcha, setRecaptcha] = useState<ReCaptchaUtility | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(autoLoad);
  const [isReady, setIsReady] = useState<boolean>(false);
  const [error, setError] = useState<RecaptchaError | null>(null);
  const [token, setToken] = useState<string | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const retryCount = useRef<number>(0);
  const retryTimeout = useRef<number | null>(null);
  const mountedRef = useRef<boolean>(true);

  // Debug logging helper
  const log = useCallback((message: string, data?: unknown) => {
    if (debug) {
      console.log(`[useRecaptcha] ${message}`, data || '');
    }
  }, [debug]);

  // Track analytics event
  const trackEvent = useCallback((event: AnalyticsEvent, payload: Record<string, unknown> = {}) => {
    if (analyticsService) {
      try {
        analyticsService.trackEvent(event, {
          ...payload,
          siteKey: siteKey ? `${siteKey.substring(0, 8)}...` : undefined,
        });
      } catch (err) {
        console.error('Error tracking analytics event:', err);
      }
    }
  }, [analyticsService, siteKey]);

  // Handle errors consistently
  const handleError = useCallback((err: unknown, context: string, code: RecaptchaErrorCode = RecaptchaErrorCode.UNKNOWN_ERROR): RecaptchaError => {
    const error = isRecaptchaError(err) 
      ? err 
      : createRecaptchaError(
          code,
          `Error in ${context}: ${err instanceof Error ? err.message : String(err)}`,
          err
        );
    
    log(`Error: ${error.message}`, { code: error.code, context });
    
    if (mountedRef.current) {
      setError(error);
    }
    
    onError?.(error);
    trackEvent('recaptcha_error', { 
      error: error.message, 
      code: error.code,
      context
    });
    
    return error;
  }, [log, onError, trackEvent]);

  // Initialize reCAPTCHA with retry logic
  const initRecaptcha = useCallback(async (): Promise<ReCaptchaUtility | null> => {
    if (!siteKey) {
      const error = createRecaptchaError(
        RecaptchaErrorCode.INVALID_SITE_KEY,
        'reCAPTCHA site key is required'
      );
      handleError(error, 'initRecaptcha', RecaptchaErrorCode.INVALID_SITE_KEY);
      return null;
    }

    try {
      log('Initializing reCAPTCHA');
      
      if (mountedRef.current) {
        setIsLoading(true);
        setError(null);
      }
      
      // Get or create instance with the site key
      const instance = ReCaptchaUtility.getInstance(siteKey);
      
      try {
        // Load the reCAPTCHA script
        await instance.loadScript();
        
        if (!mountedRef.current) return null;
        
        // Reset retry counter on success
        retryCount.current = 0;
        setRecaptcha(instance);
        setIsReady(true);
        setError(null);
        
        log('reCAPTCHA initialized successfully');
        onLoad?.();
        trackEvent('recaptcha_load');
        
        return instance;
      } catch (err) {
        throw createRecaptchaError(
          RecaptchaErrorCode.SCRIPT_LOAD_FAILED,
          'Failed to load reCAPTCHA script',
          err
        );
      }
    } catch (err) {
      const error = handleError(err, 'initRecaptcha');
      
      // Handle retries
      if (retryCount.current < maxRetries) {
        retryCount.current++;
        const delay = retryDelay * retryCount.current; // Exponential backoff
        
        log(`Retrying initialization (${retryCount.current}/${maxRetries}) in ${delay}ms`);
        
        // Schedule retry
        retryTimeout.current = window.setTimeout(() => {
          if (mountedRef.current) {
            initRecaptcha();
          }
        }, delay);
        
        return null;
      }
      
      // Max retries reached or no retries configured
      log('Max retries reached for reCAPTCHA initialization');
      return null;
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [siteKey, maxRetries, retryDelay, onLoad, log, handleError, trackEvent]);

  // Execute reCAPTCHA with the given action
  const execute = useCallback(async (action: string = defaultAction): Promise<string> => {
    if (!recaptcha) {
      const error = createRecaptchaError(
        RecaptchaErrorCode.NOT_INITIALIZED,
        'reCAPTCHA is not initialized'
      );
      throw handleError(error, 'execute', RecaptchaErrorCode.NOT_INITIALIZED);
    }
    
    log(`Executing reCAPTCHA with action: ${action}`);
    
    try {
      // Create new AbortController for this execution attempt
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();
      
      // Add a timeout to the execution
      const timeoutId = setTimeout(
        () => abortControllerRef.current?.abort(),
        10000 // 10 second timeout
      );
      
      try {
        const token = await recaptcha.execute(action);
        
        if (!mountedRef.current) {
          throw new Error('Component unmounted during reCAPTCHA execution');
        }
        
        clearTimeout(timeoutId);
        setToken(token);
        
        log('reCAPTCHA executed successfully', { action });
        onExecute?.(action);
        trackEvent('recaptcha_execute', { action });
        
        return token;
      } catch (err) {
        clearTimeout(timeoutId);
        throw err;
      }
    } catch (err) {
      const error = handleError(err, 'execute', RecaptchaErrorCode.EXECUTION_FAILED);
      throw error;
    }
  }, [recaptcha, defaultAction, onExecute, log, handleError, trackEvent]);

  // Refresh the reCAPTCHA token
  const refresh = useCallback(async (action: string = defaultAction): Promise<string> => {
    if (!recaptcha) {
      const error = createRecaptchaError(
        RecaptchaErrorCode.NOT_INITIALIZED,
        'reCAPTCHA is not initialized'
      );
      throw handleError(error, 'refresh', RecaptchaErrorCode.NOT_INITIALIZED);
    }
    
    log(`Refreshing reCAPTCHA token for action: ${action}`);
    
    try {
      // Create new AbortController for this refresh attempt
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();
      
      // Add a timeout to the refresh
      const timeoutId = setTimeout(
        () => abortControllerRef.current?.abort(),
        10000 // 10 second timeout
      );
      
      try {
        const newToken = await recaptcha.refresh(action);
        
        if (!mountedRef.current) {
          throw new Error('Component unmounted during reCAPTCHA refresh');
        }
        
        clearTimeout(timeoutId);
        setToken(newToken);
        
        log('reCAPTCHA token refreshed successfully', { action });
        onRefresh?.(action);
        trackEvent('recaptcha_refresh', { action });
        
        return newToken;
      } catch (err) {
        clearTimeout(timeoutId);
        throw err;
      }
    } catch (err) {
      const error = handleError(err, 'refresh', RecaptchaErrorCode.TOKEN_EXPIRED);
      throw error;
    }
  }, [recaptcha, defaultAction, onRefresh, log, handleError, trackEvent]);

  // Reset reCAPTCHA (useful for error recovery)
  const reset = useCallback(async (): Promise<void> => {
    log('Resetting reCAPTCHA');
    
    // Abort any pending operations
    abortControllerRef.current?.abort();
    
    // Clear any pending timeouts
    if (retryTimeout.current !== null) {
      clearTimeout(retryTimeout.current);
      retryTimeout.current = null;
    }
    
    if (mountedRef.current) {
      // Reset state
      setRecaptcha(null);
      setToken(null);
      setError(null);
      setIsReady(false);
      retryCount.current = 0;
    }
    
    onReset?.();
    trackEvent('recaptcha_reset');
    
    // Reinitialize if autoLoad is enabled
    if (autoLoad && siteKey) {
      await initRecaptcha();
    }
  }, [autoLoad, siteKey, initRecaptcha, log, onReset, trackEvent]);
  
  // Initialize on mount if autoLoad is true
  useEffect(() => {
    if (autoLoad && siteKey) {
      initRecaptcha();
    }
    
    return () => {
      // Mark as unmounted to prevent state updates
      mountedRef.current = false;
      
      // Abort any pending operations
      abortControllerRef.current?.abort();
      
      // Clear any pending timeouts
      if (retryTimeout.current !== null) {
        clearTimeout(retryTimeout.current);
      }
    };
  }, [autoLoad, siteKey, initRecaptcha]);

  // Memoize the return value to prevent unnecessary re-renders
  const api = useMemo(() => ({
    execute,
    refresh,
    reset,
    isLoading,
    isReady,
    error,
    token,
  }), [execute, refresh, reset, isLoading, isReady, error, token]);

  return api;
};

export default useRecaptcha;
