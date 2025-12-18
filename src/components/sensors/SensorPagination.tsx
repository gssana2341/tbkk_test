import React from "react";
import Image from "next/image";

interface SensorPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  maxVisiblePages?: number;
}

export default function SensorPagination({
  currentPage,
  totalPages,
  onPageChange,
  maxVisiblePages = 5,
}: SensorPaginationProps) {
  // Calculate which pages to show
  const getVisiblePages = () => {
    const pages: number[] = [];

    if (totalPages <= maxVisiblePages) {
      // Show all pages if total is less than max
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= maxVisiblePages; i++) {
          pages.push(i);
        }
      } else if (currentPage >= totalPages - 2) {
        for (let i = totalPages - maxVisiblePages + 1; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        for (let i = currentPage - 2; i <= currentPage + 2; i++) {
          pages.push(i);
        }
      }
    }

    return pages;
  };

  const visiblePages = getVisiblePages();

  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  return (
    <div className="flex items-center justify-center mt-6">
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 border-2 border-gray-700 rounded-full bg-[#232e3c] shadow">
        {/* Previous Button */}
        <button
          onClick={handlePrevious}
          disabled={currentPage === 1}
          className="w-8 h-8 rounded-full border border-gray-700 bg-[#1F2937] flex items-center justify-center text-gray-400 hover:bg-[#3758F9] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Previous page"
        >
          <Image src="/arrow-left.png" alt="Previous" width={12} height={12} />
        </button>

        {/* Page Numbers */}
        {visiblePages.map((page) => {
          const isActive = page === currentPage;
          return (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                isActive
                  ? "bg-[#3758F9] text-white shadow"
                  : "border border-gray-700 bg-[#1F2937] text-white hover:bg-[#232e3c]"
              }`}
              aria-label={`Page ${page}`}
              aria-current={isActive ? "page" : undefined}
            >
              {page}
            </button>
          );
        })}

        {/* Next Button */}
        <button
          onClick={handleNext}
          disabled={currentPage === totalPages}
          className="w-8 h-8 rounded-full border border-gray-700 bg-[#1F2937] flex items-center justify-center text-gray-400 hover:bg-[#3758F9] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Next page"
        >
          <Image
            src="/arrow-left.png"
            alt="Next"
            width={12}
            height={12}
            className="rotate-180"
          />
        </button>
      </div>
    </div>
  );
}
