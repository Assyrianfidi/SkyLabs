import React from 'react';

export const Button = React.forwardRef(({ children, ...props }, ref) => {
  return (
    <button ref={ref} {...props} data-testid="mock-button">
      {children}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;
