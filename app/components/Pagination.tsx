import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import clsx from 'clsx';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ currentPage, totalPages, totalItems, onPageChange }: PaginationProps) {
  return (
    <div className="flex items-center justify-between mt-4 text-sm">
      <div className="text-[hsl(var(--muted-foreground))]">
        Total {totalItems}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={clsx(
            "btn btn-secondary p-2",
            currentPage === 1 && "opacity-50 cursor-not-allowed"
          )}
        >
          <FaChevronLeft className="w-4 h-4" />
        </button>
        
        <div className="flex items-center gap-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={clsx(
                "btn w-8 h-8 p-0",
                currentPage === page
                  ? "btn-primary"
                  : "btn-secondary"
              )}
            >
              {page}
            </button>
          ))}
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={clsx(
            "btn btn-secondary p-2",
            currentPage === totalPages && "opacity-50 cursor-not-allowed"
          )}
        >
          <FaChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}