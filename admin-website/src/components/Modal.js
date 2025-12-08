import React, { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Shared modal component for the admin dashboard.
 * - Handles overlay, centering, and scroll locking
 * - Provides fade + scale open/close transitions
 * - Accessible (role="dialog", Escape to close)
 * - Uses Metro NaviGo design tokens (radius, shadows, colors)
 *
 * Usage:
 * <Modal onClose={...} size="lg">
 *   {({ close }) => ( ...content... )}
 * </Modal>
 */
const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

const Modal = ({
  isOpen = true,
  onClose,
  children,
  closeOnBackdrop = true,
  size = 'md',
  ariaLabelledby,
  ariaDescribedby,
}) => {
  const [isVisible, setIsVisible] = useState(isOpen);
  const panelRef = useRef(null);

  // Play fade + scale-in on mount
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setIsVisible(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const handleClose = useCallback(() => {
    if (!onClose) return;
    // Play fade + scale-out, then call parent onClose
    setIsVisible(false);
    const timeout = setTimeout(() => {
      onClose();
    }, 220);
    return () => clearTimeout(timeout);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [handleClose]);

  // Focus modal panel on mount for accessibility
  useEffect(() => {
    if (panelRef.current) {
      panelRef.current.focus();
    }
  }, []);

  // Prevent background scroll while modal is open
  useEffect(() => {
    const { classList } = document.body;
    classList.add('overflow-hidden');
    return () => {
      classList.remove('overflow-hidden');
    };
  }, []);

  const sizeClass = sizeClasses[size] || sizeClasses.md;

  const backdropClasses = `fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-200 ease-smooth ${
    isVisible ? 'opacity-100' : 'opacity-0'
  }`;

  const panelClasses = [
    'pointer-events-auto bg-white rounded-[24px] border border-gray-100',
    'shadow-elevation-3',
    'max-h-[90vh] w-full flex flex-col overflow-hidden',
    'transform transition-all duration-200 ease-smooth',
    isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-2 scale-95',
    sizeClass,
  ].join(' ');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div
        className={backdropClasses}
        aria-hidden="true"
        onClick={closeOnBackdrop ? handleClose : undefined}
      />

      <div className="relative flex w-full items-center justify-center pointer-events-none">
        <div
          ref={panelRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby={ariaLabelledby}
          aria-describedby={ariaDescribedby}
          className={panelClasses}
        >
          {typeof children === 'function' ? children({ close: handleClose }) : children}
        </div>
      </div>
    </div>
  );
};

export default Modal;


