import { Fragment, memo, type MouseEvent } from 'react';

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

interface PaginationControlsProps {
  /** current active page (1-indexed) */
  currentPage: number;
  /** total number of pages */
  totalPages: number;
  /** callback when the page should change */
  onPageChange: (page: number) => void;
  /** label for the “previous” button */
  previousLabel: string;
  /** label for the “next” button */
  nextLabel: string;
}

/**
 * Renders pagination controls with previous, page numbers and ellipses, and next buttons.
 */
function PaginationControls({
  currentPage,
  totalPages,
  onPageChange,
  previousLabel,
  nextLabel,
}: PaginationControlsProps) {
  // prevent default link behaviour and trigger the page change callback
  const handleClick = (page: number) => (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (page !== currentPage && page >= 1 && page <= totalPages) {
      onPageChange(page);
    }
  };

  // build visible page numbers: always show first, last, and one either side of current
  const pageNumbers = Array.from(
    { length: totalPages },
    (_, i) => i + 1
  ).filter(
    (p) =>
      p === 1 ||
      p === totalPages ||
      (p >= currentPage - 1 && p <= currentPage + 1)
  );

  return (
    <Pagination>
      <PaginationContent>
        {currentPage > 1 && (
          <PaginationItem>
            <PaginationPrevious
              label={previousLabel}
              onClick={() => onPageChange(currentPage - 1)}
            />
          </PaginationItem>
        )}

        {pageNumbers.map((page, idx) => {
          const isGap = idx > 0 && pageNumbers[idx - 1] !== page - 1;
          return (
            <Fragment key={page}>
              {isGap && (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              )}
              <PaginationItem>
                <PaginationLink
                  isActive={page === currentPage}
                  onClick={handleClick(page)}
                >
                  {page}
                </PaginationLink>
              </PaginationItem>
            </Fragment>
          );
        })}

        {currentPage < totalPages && (
          <PaginationItem>
            <PaginationNext
              label={nextLabel}
              onClick={() => onPageChange(currentPage + 1)}
            />
          </PaginationItem>
        )}
      </PaginationContent>
    </Pagination>
  );
}

export default memo(PaginationControls);
