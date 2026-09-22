export type PaginationInput = {
  limit: number;
  offset: number;
};

export type Page<T> = PaginationInput & {
  items: T[];
  total: number;
};

export const defaultPagination: PaginationInput = { limit: 50, offset: 0 };

export function paginateArray<T>(items: T[], pagination: PaginationInput): Page<T>
{
  return {
    items: items.slice(pagination.offset, pagination.offset + pagination.limit),
    total: items.length,
    ...pagination
  };
}

export function paginationMetadata<T>(page: Page<T>)
{
  return {
    limit: page.limit,
    offset: page.offset,
    total: page.total,
    hasMore: page.offset + page.items.length < page.total
  };
}
