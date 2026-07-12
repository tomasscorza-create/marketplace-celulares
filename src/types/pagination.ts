export type PaginationParams = {
  limit: number;
  page: number;
  search?: string;
};

export type PaginatedResult<T> = {
  count: number;
  items: T[];
  page: number;
  pageSize: number;
};

