import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import ContactForm from "../ContactForm";
import { toast } from "react-hot-toast";

// Mock react-hot-toast
vi.mock("react-hot-toast", () => ({
  __esModule: true,
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock lucide-react
vi.mock("lucide-react", async () => {
  const actual = await vi.importActual("lucide-react");
  return {
    ...actual,
    MapPin: () => <div data-testid="map-pin" />,
    Loader2: () => <div data-testid="loader" />,
    Send: () => <div data-testid="send" />,
  };
});

describe("ContactForm", () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all form fields", () => {
    render(<ContactForm />);
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/message/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/\(123\) 456-7890/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send message/i })).toBeDisabled();
  });

  it("shows validation errors on blur", async () => {
    render(<ContactForm />);
    const nameInput = screen.getByLabelText(/name/i);
    const emailInput = screen.getByLabelText(/email/i);

    // Focus and blur name to trigger validation
    await user.click(nameInput);
    await user.tab(); // Move to next field (email)

    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    });

    // Type invalid email and blur to trigger validation
    await user.type(emailInput, "invalid-email");
    await user.tab(); // Move to next field to trigger blur

    // Wait for the error message to appear
    await waitFor(() => {
      const errorMessage = screen.getByText(/please enter a valid email/i);
      expect(errorMessage).toBeInTheDocument();
      
      // Also verify the input has error styling
      expect(emailInput).toHaveAttribute('aria-invalid', 'true');
    });
  });

  it("enables submit button when form is valid", async () => {
    render(<ContactForm />);
    const nameInput = screen.getByLabelText(/name/i);
    const emailInput = screen.getByLabelText(/email/i);
    const messageInput = screen.getByLabelText(/message/i);
    const submitButton = screen.getByRole("button", { name: /send message/i });

    await user.type(nameInput, "John Doe");
    await user.type(emailInput, "john@example.com");
    await user.type(messageInput, "This is a valid test message");

    await waitFor(() => expect(submitButton).not.toBeDisabled());
  });

  it("shows success toast on submission", async () => {
    render(<ContactForm />);
    await user.type(screen.getByLabelText(/name/i), "John Doe");
    await user.type(screen.getByLabelText(/email/i), "john@example.com");
    await user.type(
      screen.getByLabelText(/message/i),
      "This is a valid message with more than 10 chars"
    );
    await user.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(
        "Thank you! Your message has been sent successfully"
      )
    );
  });

  it("blocks submission when honeypot is filled", async () => {
    render(<ContactForm />);
    const honeypot = screen.getByRole("textbox", { name: /website/i });
    await user.type(honeypot, "spam-bot");

    await user.type(screen.getByLabelText(/name/i), "John Doe");
    await user.type(screen.getByLabelText(/email/i), "john@example.com");
    await user.type(
      screen.getByLabelText(/message/i),
      "This is a valid test message"
    );

    await user.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() => expect(toast.success).not.toHaveBeenCalled());
  });

  it("shows loading state during submission", async () => {
    render(<ContactForm />);
    await user.type(screen.getByLabelText(/name/i), "John Doe");
    await user.type(screen.getByLabelText(/email/i), "john@example.com");
    await user.type(
      screen.getByLabelText(/message/i),
      "This is a valid test message"
    );

    const submitButton = screen.getByRole("button", { name: /send message/i });
    await user.click(submitButton);

    expect(screen.getByTestId("loader")).toBeInTheDocument();
    expect(submitButton).toHaveTextContent(/sending/i);

    await waitFor(() => expect(toast.success).toHaveBeenCalled());
  });

  it("keeps button disabled with invalid email", async () => {
    render(<ContactForm />);
    const nameInput = screen.getByLabelText(/name/i);
    const emailInput = screen.getByLabelText(/email/i);
    const messageInput = screen.getByLabelText(/message/i);
    const submitButton = screen.getByRole("button", { name: /send message/i });

    await user.type(nameInput, "John Doe");
    await user.type(messageInput, "This is a valid test message");
    await user.type(emailInput, "invalid-email");

    expect(submitButton).toBeDisabled();

    await user.clear(emailInput);
    await user.type(emailInput, "valid@example.com");

    await waitFor(() => expect(submitButton).not.toBeDisabled());
  });
});
