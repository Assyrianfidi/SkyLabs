// Mock react-hot-toast
export const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
};

const toast = mockToast;

export default {
  toast,
  __esModule: true,
};
