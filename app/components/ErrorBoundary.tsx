'use client';

import React, { useState, useEffect } from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function ErrorBoundary({ 
  children, 
  fallback = <DefaultErrorFallback />
}: ErrorBoundaryProps) {
  const [hasError, setHasError] = useState(false);
  
  useEffect(() => {
    const errorHandler = (error: ErrorEvent) => {
      console.error('Error caught by ErrorBoundary:', error);
      setHasError(true);
      
      // Prevent the error from bubbling up
      error.preventDefault();
    };
    
    // Register error handler
    window.addEventListener('error', errorHandler);
    
    // Clean up
    return () => {
      window.removeEventListener('error', errorHandler);
    };
  }, []);
  
  if (hasError) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
}

function DefaultErrorFallback() {
  return (
    <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-md text-center">
      <h3 className="text-lg font-medium text-red-800 dark:text-red-200">
        Something went wrong
      </h3>
      <p className="mt-2 text-sm text-red-700 dark:text-red-300">
        We encountered an unexpected error. Please try refreshing the page.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="mt-3 px-4 py-2 bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-100 rounded-md hover:bg-red-200 dark:hover:bg-red-700 transition-colors"
      >
        Refresh page
      </button>
    </div>
  );
}