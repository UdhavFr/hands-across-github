import { User } from 'lucide-react';
import { cn } from '../lib/utils';

interface AvatarProps {
  src?: string | null;
  alt?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'h-8 w-8',
  md: 'h-12 w-12', 
  lg: 'h-16 w-16',
  xl: 'h-24 w-24'
};

const iconSizes = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8', 
  xl: 'h-12 w-12'
};

export function Avatar({ src, alt = 'User avatar', size = 'md', className }: AvatarProps) {
  return (
    <div className={cn(
      'relative overflow-hidden rounded-full bg-muted flex items-center justify-center',
      sizeClasses[size],
      className
    )}>
      {src ? (
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-cover"
          onError={(e) => {
            // Hide broken image and show fallback
            e.currentTarget.style.display = 'none';
            const parent = e.currentTarget.parentElement;
            if (parent) {
              const fallback = parent.querySelector('.avatar-fallback');
              if (fallback) {
                (fallback as HTMLElement).style.display = 'flex';
              }
            }
          }}
        />
      ) : null}
      <div className={cn(
        'avatar-fallback absolute inset-0 flex items-center justify-center',
        src ? 'hidden' : 'flex'
      )}>
        <User className={cn('text-muted-foreground', iconSizes[size])} />
      </div>
    </div>
  );
}