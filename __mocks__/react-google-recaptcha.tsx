import * as React from 'react';

interface ReCAPTCHAProps {
  sitekey?: string;
  onChange?: (token: string | null) => void;
  onErrored?: () => void;
  onExpired?: () => void;
  onError?: (error: any) => void;
  'data-testid'?: string;
  style?: React.CSSProperties;
  className?: string;
}

const ReCAPTCHA = React.forwardRef<HTMLDivElement, ReCAPTCHAProps>(
  (props, ref) => {
    const { 
      sitekey, 
      onChange, 
      onErrored, 
      onExpired, 
      onError, 
      'data-testid': testId = 'mock-recaptcha',
      ...rest 
    } = props;
    
    return React.createElement('div', {
      ref,
      'data-testid': testId,
      ...rest,
      children: 'Mock ReCAPTCHA'
    });
  }
);

ReCAPTCHA.displayName = 'ReCAPTCHA';

export default ReCAPTCHA;
