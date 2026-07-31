// Minimal API response types for internal use only
export type IrminAPIResponse<T = unknown> = {
  data?: T | null;
  message?: string;
  errors?: string[];
  metadata?: Record<string, unknown>;
  pagination?: {
    total?: number;
    page?: number;
    per_page?: number;
    total_pages?: number;
    has_more?: boolean;
    next?: string;
  };
};

export type IrminAPIBinaryResponse = Blob | unknown;
