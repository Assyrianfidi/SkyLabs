// Type for aria-invalid attribute
export type AriaInvalid = boolean | 'true' | 'false' | 'grammar' | 'spelling';

// Helper function to convert boolean to aria-invalid string
export const toAriaInvalid = (isInvalid: boolean): AriaInvalid => 
  isInvalid ? 'true' : 'false';
