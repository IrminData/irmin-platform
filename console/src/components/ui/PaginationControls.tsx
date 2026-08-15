import { Fragment, memo } from 'react';

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

import { useLocale } from '@/context/LocaleContext';

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
  const { dict } = useLocale();

  const handleClick = (page: number) => () => {
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
    <Pagination label={dict.common.paginationLabel}>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            accessibleLabel={dict.common.previousPage}
            label={previousLabel}
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
          />
        </PaginationItem>

        {pageNumbers.map((page, idx) => {
          const isGap = idx > 0 && pageNumbers[idx - 1] !== page - 1;
          return (
            <Fragment key={page}>
              {isGap && (
                <PaginationItem>
                  <PaginationEllipsis label={dict.common.morePages} />
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

        <PaginationItem>
          <PaginationNext
            accessibleLabel={dict.common.nextPage}
            label={nextLabel}
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

export default memo(PaginationControls);
