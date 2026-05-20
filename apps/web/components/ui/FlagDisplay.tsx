'use client';

// CSS imported globally via app/globals.css
interface FlagDisplayProps {
    countryCode: string;
    countryName: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
}

const SIZE_CLASSES = {
    sm: 'w-8 h-6',
    md: 'w-16 h-12',
    lg: 'w-24 h-16',
    xl: 'w-40 h-28',
};

export function FlagDisplay({ countryCode, countryName, size = 'lg', className = '' }: FlagDisplayProps) {
    return (
        <span
            role='img'
            aria-label={`Bendera ${countryName}`}
            className={`fi fi-${countryCode.toLowerCase()} inline-block rounded shadow-sm ${SIZE_CLASSES[size]} ${className}`}
            style={{ backgroundSize: 'cover', backgroundPosition: 'center' }}
        />
    );
}
