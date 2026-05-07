import * as React from "react"
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline"

const Pagination = ({ className, ...props }) => (
  <nav
    role="navigation"
    aria-label="pagination"
    className={`mx-auto flex w-full justify-center ${className || ''}`}
    {...props}
  />
)
Pagination.displayName = "Pagination"

const PaginationContent = React.forwardRef(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    className={`flex flex-row items-center gap-1 ${className || ''}`}
    {...props}
  />
))
PaginationContent.displayName = "PaginationContent"

const PaginationItem = React.forwardRef(({ className, ...props }, ref) => (
  <li ref={ref} className={className || ''} {...props} />
))
PaginationItem.displayName = "PaginationItem"

const PaginationLink = ({
  className,
  isActive,
  size = "default",
  disabled,
  ...props
}) => (
  <button
    aria-current={isActive ? "page" : undefined}
    disabled={disabled}
    className={`
      inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium
      transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-950
      disabled:pointer-events-none disabled:opacity-50
      ${size === "default" ? "h-9 w-9" : "h-8 w-8 text-xs"}
      ${isActive 
        ? "bg-blue-600 text-white hover:bg-blue-700" 
        : "bg-white text-gray-900 hover:bg-gray-100 border border-gray-300"
      }
      ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
      ${className || ''}
    `}
    {...props}
  />
)
PaginationLink.displayName = "PaginationLink"

const PaginationPrevious = ({
  className,
  disabled,
  ...props
}) => (
  <button
    aria-label="Go to previous page"
    disabled={disabled}
    className={`
      inline-flex items-center gap-1 pl-2.5 pr-3 h-9
      rounded-md text-sm font-medium transition-colors
      focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-950
      ${disabled 
        ? "opacity-50 cursor-not-allowed bg-gray-100 text-gray-400" 
        : "bg-white text-gray-900 hover:bg-gray-100 border border-gray-300 cursor-pointer"
      }
      ${className || ''}
    `}
    {...props}
  >
    <ChevronLeftIcon className="h-4 w-4" />
    <span>Previous</span>
  </button>
)
PaginationPrevious.displayName = "PaginationPrevious"

const PaginationNext = ({
  className,
  disabled,
  ...props
}) => (
  <button
    aria-label="Go to next page"
    disabled={disabled}
    className={`
      inline-flex items-center gap-1 pr-2.5 pl-3 h-9
      rounded-md text-sm font-medium transition-colors
      focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-950
      ${disabled 
        ? "opacity-50 cursor-not-allowed bg-gray-100 text-gray-400" 
        : "bg-white text-gray-900 hover:bg-gray-100 border border-gray-300 cursor-pointer"
      }
      ${className || ''}
    `}
    {...props}
  >
    <span>Next</span>
    <ChevronRightIcon className="h-4 w-4" />
  </button>
)
PaginationNext.displayName = "PaginationNext"

const PaginationEllipsis = ({
  className,
  ...props
}) => (
  <span
    aria-hidden
    className={`flex h-9 w-9 items-center justify-center ${className || ''}`}
    {...props}
  >
    <span className="text-gray-400">...</span>
  </span>
)
PaginationEllipsis.displayName = "PaginationEllipsis"

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
}
