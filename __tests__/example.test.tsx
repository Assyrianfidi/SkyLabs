import { describe, it, expect, beforeAll, afterEach, afterAll } from '@jest/globals';
import { render, screen, fireEvent } from './test-utils';

// Simple component for testing
const Button = ({ onClick, children }: { onClick: () => void; children: React.ReactNode }) => (
  <button onClick={onClick}>{children}</button>
);

describe('Example Test Suite', () => {
  beforeAll(() => {
    // Setup code before any tests run
    console.log('Running example tests...');
  });

  afterEach(() => {
    // Cleanup after each test
    jest.clearAllMocks();
  });

  afterAll(() => {
    // Cleanup after all tests
    console.log('Finished example tests');
  });

  it('should pass a basic test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should render a button and handle click', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toBeInTheDocument();
    
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should work with async/await', async () => {
    const fetchData = () => Promise.resolve('data');
    const data = await fetchData();
    expect(data).toBe('data');
  });
});
