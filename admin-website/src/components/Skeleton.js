import React from 'react';

const Skeleton = ({ 
  variant = 'text', 
  width, 
  height, 
  className = '',
  count = 1,
  circle = false,
  rounded = 'rounded-lg'
}) => {
  const baseClasses = `skeleton ${rounded} ${className}`;
  
  const variants = {
    text: 'h-4',
    heading: 'h-6',
    title: 'h-8',
    paragraph: 'h-3',
    card: 'h-full w-full',
    avatar: circle ? 'w-12 h-12 rounded-full' : 'w-12 h-12',
    button: 'h-10',
    image: 'w-full',
    table: 'h-12',
  };

  const defaultWidths = {
    text: 'w-full',
    heading: 'w-3/4',
    title: 'w-1/2',
    paragraph: 'w-full',
    card: 'w-full',
    avatar: '',
    button: 'w-24',
    image: 'w-full',
    table: 'w-full',
  };

  const style = {};
  if (width) style.width = width;
  if (height) style.height = height;

  const skeletonClass = `${baseClasses} ${variants[variant] || variants.text} ${!width ? defaultWidths[variant] || '' : ''}`;

  if (count > 1) {
    return (
      <div className="space-y-2">
        {Array.from({ length: count }).map((_, index) => (
          <div
            key={index}
            className={skeletonClass}
            style={style}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={skeletonClass}
      style={style}
    />
  );
};

// Pre-built skeleton components for common use cases
export const SkeletonCard = ({ className = '' }) => (
  <div className={`modern-card p-6 ${className}`}>
    <div className="flex items-center justify-between mb-4">
      <Skeleton variant="heading" width="40%" />
      <Skeleton variant="avatar" circle />
    </div>
    <Skeleton variant="title" width="60%" className="mb-2" />
    <Skeleton variant="text" count={3} />
  </div>
);

export const SkeletonMetricCard = ({ className = '' }) => (
  <div className={`modern-card p-6 ${className}`}>
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <Skeleton variant="text" width="50%" className="mb-3" />
        <Skeleton variant="title" width="30%" className="mb-3" />
        <Skeleton variant="button" width="80px" />
      </div>
      <Skeleton variant="avatar" width="56px" height="56px" className="rounded-xl" />
    </div>
  </div>
);

export const SkeletonTable = ({ rows = 5, cols = 4, className = '' }) => (
  <div className={`modern-card overflow-hidden ${className}`}>
    <div className="p-4 border-b border-gray-200">
      <Skeleton variant="heading" width="30%" />
    </div>
    <div className="p-4 space-y-3">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex items-center space-x-4">
          {Array.from({ length: cols }).map((_, colIndex) => (
            <Skeleton 
              key={colIndex} 
              variant="text" 
              width={colIndex === 0 ? '20%' : colIndex === cols - 1 ? '15%' : '25%'} 
            />
          ))}
        </div>
      ))}
    </div>
  </div>
);

export const SkeletonList = ({ items = 5, className = '' }) => (
  <div className={`space-y-3 ${className}`}>
    {Array.from({ length: items }).map((_, index) => (
      <div key={index} className="flex items-center space-x-4 p-4 bg-white rounded-lg border border-gray-200">
        <Skeleton variant="avatar" circle />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" width="60%" />
          <Skeleton variant="paragraph" width="40%" />
        </div>
        <Skeleton variant="button" width="80px" />
      </div>
    ))}
  </div>
);

export const SkeletonChart = ({ className = '' }) => (
  <div className={`modern-card p-6 ${className}`}>
    <div className="flex items-center justify-between mb-6">
      <Skeleton variant="heading" width="40%" />
      <Skeleton variant="button" width="100px" />
    </div>
    <div className="space-y-4">
      <Skeleton variant="text" width="100%" height="200px" />
      <div className="flex items-center justify-between">
        <Skeleton variant="text" width="20%" />
        <Skeleton variant="text" width="20%" />
        <Skeleton variant="text" width="20%" />
      </div>
    </div>
  </div>
);

export const SkeletonMap = ({ className = '' }) => (
  <div className={`modern-card overflow-hidden ${className}`}>
    <div className="p-4 border-b border-gray-200">
      <Skeleton variant="heading" width="30%" />
    </div>
    <Skeleton variant="image" height="400px" className="rounded-none" />
  </div>
);

export default Skeleton;

