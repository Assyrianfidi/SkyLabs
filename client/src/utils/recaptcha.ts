/**
 * ReCaptchaUtility - A robust wrapper for Google reCAPTCHA v3
 */
class ReCaptchaUtility {
    private siteKey: string;
    private recaptchaResponse: string | null = null;
    private scriptLoaded: boolean = false;
    private static instance: ReCaptchaUtility | null = null;
    private loadPromise: Promise<void> | null = null;
    private eventListeners: Map<string, Set<Function>> = new Map();

    private constructor(siteKey: string) {
        if (!siteKey) throw new Error('Site key is required for ReCaptchaUtility');
        this.siteKey = siteKey;
    }

    /**
     * Get singleton instance of ReCaptchaUtility
     */
    public static getInstance(siteKey: string): ReCaptchaUtility {
        if (!ReCaptchaUtility.instance) {
            ReCaptchaUtility.instance = new ReCaptchaUtility(siteKey);
        } else if (ReCaptchaUtility.instance.siteKey !== siteKey) {
            console.warn('ReCaptchaUtility already initialized with a different site key');
        }
        return ReCaptchaUtility.instance;
    }

    /**
     * Reset the singleton instance (useful for testing)
     */
    public static resetInstance(): void {
        ReCaptchaUtility.instance = null;
    }

    /**
     * Add an event listener
     */
    public on(event: 'load' | 'error' | 'execute' | 'refresh', callback: (data?: any) => void): () => void {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, new Set());
        }
        const listeners = this.eventListeners.get(event)!;
        listeners.add(callback);

        return () => {
            listeners.delete(callback);
        };
    }

    private emit(event: 'load' | 'error' | 'execute' | 'refresh', data?: any): void {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event)!.forEach(callback => {
                try {
                    callback(data);
                } catch (err) {
                    console.error(`Error in ${event} event handler:`, err);
                }
            });
        }
    }

    /**
     * Load the Google reCAPTCHA script if not already loaded
     */
    public loadScript(): Promise<void> {
        if (this.scriptLoaded) return Promise.resolve();
        if (this.loadPromise) return this.loadPromise;

        // Check if script is already in the DOM
        if (document.getElementById('recaptcha-script')) {
            this.scriptLoaded = true;
            return Promise.resolve();
        }

        this.loadPromise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = `https://www.google.com/recaptcha/api.js?render=${this.siteKey}`;
            script.id = 'recaptcha-script';
            script.async = true;
            script.defer = true;
            
            const onLoad = () => {
                script.removeEventListener('load', onLoad);
                script.removeEventListener('error', onError);
                
                // Double check grecaptcha is available
                if (typeof window.grecaptcha === 'undefined') {
                    const error = new Error('grecaptcha not available after script load');
                    this.emit('error', { type: 'load', error });
                    reject(error);
                    return;
                }
                
                this.scriptLoaded = true;
                this.emit('load');
                resolve();
            };
            
            const onError = (event: Event | string) => {
                script.removeEventListener('load', onLoad);
                script.removeEventListener('error', onError);
                
                const error = new Error('Failed to load reCAPTCHA script');
                console.error('reCAPTCHA script error:', event);
                this.emit('error', { type: 'load', error, event });
                reject(error);
            };
            
            script.addEventListener('load', onLoad);
            script.addEventListener('error', onError);
            
            // Add script to document
            document.head.appendChild(script);
            
            // Set a timeout to handle cases where the script loads but grecaptcha is not available
            setTimeout(() => {
                if (!this.scriptLoaded) {
                    onError('Load timeout');
                }
            }, 10000); // 10 second timeout
        });

        return this.loadPromise;
    }

    /**
     * Execute reCAPTCHA and return a token
     * @param action - The action name for reCAPTCHA v3
     * @returns Promise with the reCAPTCHA token
     */
    public async execute(action: string = 'submit'): Promise<string> {
        if (!this.scriptLoaded) {
            try {
                await this.loadScript();
            } catch (error) {
                const err = new Error(`Failed to load reCAPTCHA: ${error instanceof Error ? error.message : String(error)}`);
                this.emit('error', { type: 'execute', error: err, action });
                throw err;
            }
        }

        if (typeof window.grecaptcha === 'undefined') {
            const error = new Error('grecaptcha is not loaded');
            this.emit('error', { type: 'execute', error, action });
            throw error;
        }

        try {
            const token = await window.grecaptcha.execute(this.siteKey, { action });
            if (!token) {
                throw new Error('Empty token received from reCAPTCHA');
            }
            
            this.recaptchaResponse = token;
            this.emit('execute', { action, token });
            return token;
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            console.error('reCAPTCHA execution failed:', error);
            this.emit('error', { type: 'execute', error: err, action });
            throw new Error(`Failed to execute reCAPTCHA: ${err.message}`);
        }
    }

    /**
     * Get the last generated reCAPTCHA token
     */
    public getResponse(): string | null {
        return this.recaptchaResponse;
    }

    /**
     * Refresh the reCAPTCHA token
     * @param action - The action name for reCAPTCHA v3
     * @returns Promise with the new reCAPTCHA token
     */
    public async refresh(action: string = 'submit'): Promise<string> {
        try {
            const token = await this.execute(action);
            this.emit('refresh', { action, token });
            return token;
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            this.emit('error', { type: 'refresh', error: err, action });
            throw err;
        }
    }

    /**
     * Get the current reCAPTCHA badge element
     */
    public getBadge(): HTMLElement | null {
        return document.querySelector('.grecaptcha-badge') as HTMLElement | null;
    }

    /**
     * Hide the reCAPTCHA badge
     * Note: This may violate Google's Terms of Service
     */
    public hideBadge(): void {
        const badge = this.getBadge();
        if (badge) {
            badge.style.visibility = 'hidden';
        }
    }

    /**
     * Show the reCAPTCHA badge
     */
    public showBadge(): void {
        const badge = this.getBadge();
        if (badge) {
            badge.style.visibility = 'visible';
        }
    }
}

export default ReCaptchaUtility;
