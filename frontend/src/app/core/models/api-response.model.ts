export interface PaginationMeta {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string | null;
  errors?: Record<string, string[]>;
}

export interface PaginatedApiResponse<T> extends ApiResponse<T[]> {
  meta: PaginationMeta;
}
