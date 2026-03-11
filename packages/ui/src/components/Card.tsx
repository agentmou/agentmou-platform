import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Render a simple card container for shared UI compositions.
 */
export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      {children}
    </div>
  );
}

/**
 * Render the header region of a shared card.
 */
export function CardHeader({ children }: { children: React.ReactNode }) {
  return <div className="mb-4">{children}</div>;
}

/**
 * Render the main content region of a shared card.
 */
export function CardContent({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}
