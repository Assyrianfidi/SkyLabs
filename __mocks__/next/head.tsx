import * as React from 'react';

interface HeadProps {
  children?: React.ReactNode;
  'data-testid'?: string;
}

const Head: React.FC<HeadProps> = (props) => {
  const { children, 'data-testid': testId = 'mock-next-head' } = props;
  
  return React.createElement('div', {
    'data-testid': testId,
    children
  });
};

export default Head;
