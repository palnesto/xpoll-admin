import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

type ListingPaginationProps = {
  page: number;
  totalPages: number;
  onPageChange: (nextPage: number) => void;

  /**
   * Optional: keeps UI consistent but allows mild tuning per page
   */
  maxPagesToShow?: number; // default 9
  windowSize?: number; // default 2
  className?: string;
};

type PageToken = number | "...";

function buildPageTokens(params: {
  page: number;
  totalPages: number;
  maxPagesToShow: number;
  windowSize: number;
}): PageToken[] {
  const { page, totalPages, maxPagesToShow, windowSize } = params;

  if (totalPages <= 1) return [1];

  if (totalPages <= maxPagesToShow) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  // Always show: 1 ... window ... totalPages
  const start = Math.max(2, page - windowSize);
  const end = Math.min(totalPages - 1, page + windowSize);

  const tokens: PageToken[] = [1];

  if (start > 2) tokens.push("...");

  for (let i = start; i <= end; i++) tokens.push(i);

  if (end < totalPages - 1) tokens.push("...");

  tokens.push(totalPages);

  return tokens;
}

export default function ListingPagination({
  page,
  totalPages,
  onPageChange,
  maxPagesToShow = 9,
  windowSize = 2,
  className,
}: ListingPaginationProps) {
  const safeTotalPages = Math.max(1, totalPages || 1);
  const safePage = Math.min(Math.max(1, page || 1), safeTotalPages);

  const tokens = buildPageTokens({
    page: safePage,
    totalPages: safeTotalPages,
    maxPagesToShow,
    windowSize,
  });

  const canPrev = safePage > 1;
  const canNext = safePage < safeTotalPages;

  if (safeTotalPages <= 1) return null;

  return (
    <section
      className={
        className ??
        "sticky bottom-0 left-0 bg-background flex justify-center py-4 shadow-md w-fit mx-auto rounded-2xl"
      }
    >
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              aria-disabled={!canPrev}
              className={!canPrev ? "pointer-events-none opacity-50" : ""}
              onClick={(e) => {
                e.preventDefault();
                if (canPrev) onPageChange(safePage - 1);
              }}
            />
          </PaginationItem>

          {tokens.map((t, idx) =>
            t === "..." ? (
              <PaginationItem key={`ellipsis-${idx}`}>
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={t}>
                <PaginationLink
                  href="#"
                  isActive={t === safePage}
                  onClick={(e) => {
                    e.preventDefault();
                    if (t !== safePage) onPageChange(t);
                  }}
                >
                  {t}
                </PaginationLink>
              </PaginationItem>
            ),
          )}

          <PaginationItem>
            <PaginationNext
              href="#"
              aria-disabled={!canNext}
              className={!canNext ? "pointer-events-none opacity-50" : ""}
              onClick={(e) => {
                e.preventDefault();
                if (canNext) onPageChange(safePage + 1);
              }}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </section>
  );
}
