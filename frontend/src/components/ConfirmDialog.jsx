import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';

/**
 * Reusable Confirm Dialog Component
 * 
 * Usage:
 * <ConfirmDialog
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 *   title="Are you sure?"
 *   description="This action cannot be undone."
 *   onConfirm={handleConfirm}
 *   confirmText="Delete"
 *   cancelText="Cancel"
 *   variant="destructive" // or "default"
 *   showNoteInput={true}
 *   noteValue={note}
 *   onNoteChange={setNote}
 *   notePlaceholder="Enter reason..."
 * />
 */
const ConfirmDialog = ({
  open,
  onOpenChange,
  title = "Are you sure?",
  description = "This action cannot be undone.",
  onConfirm,
  onCancel,
  confirmText = "Continue",
  cancelText = "Cancel",
  variant = "default", // "default" or "destructive"
  showNoteInput = false,
  noteValue = "",
  onNoteChange,
  notePlaceholder = "Enter reason...",
}) => {
  const handleConfirm = () => {
    onConfirm?.();
    // Don't auto-close - let the parent control the dialog state
  };

  const handleCancel = () => {
    onCancel?.();
    // Don't auto-close - let the parent control the dialog state
  };

  const confirmButtonClass = variant === "destructive"
    ? "bg-red-600 hover:bg-red-700 focus-visible:ring-red-600"
    : "bg-gray-900 hover:bg-gray-900/90 focus-visible:ring-gray-950";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        
        {showNoteInput && (
          <div className="my-4">
            <label htmlFor="termination-note" className="block text-sm font-medium text-gray-700 mb-2">
              Termination Reason (Optional)
            </label>
            <textarea
              id="termination-note"
              value={noteValue}
              onChange={(e) => onNoteChange?.(e.target.value)}
              placeholder={notePlaceholder}
              className="w-full min-h-[100px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              maxLength={500}
            />
            <p className="text-xs text-gray-500 mt-1">
              {noteValue.length}/500 characters
            </p>
          </div>
        )}
        
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleConfirm}
            className={confirmButtonClass}
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ConfirmDialog;
