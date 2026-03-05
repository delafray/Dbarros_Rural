import React from 'react';

type ColorKey = 'rose' | 'purple' | 'orange' | 'blue';

interface DashboardActionButtonProps {
    label?: string;
    icon: React.ReactNode;
    onClick: (e: React.MouseEvent) => void;
    color: ColorKey;
    title?: string;
}

const colorStyles: Record<ColorKey, { textHoverOpacity: string, bg: string, text: string, hoverBg: string, border: string }> = {
    rose: {
        textHoverOpacity: 'text-rose-400 group-hover:opacity-100',
        bg: 'bg-rose-50',
        text: 'text-rose-400 group-hover:text-white',
        hoverBg: 'group-hover:bg-rose-400',
        border: 'border-rose-100',
    },
    purple: {
        textHoverOpacity: 'text-purple-500 group-hover:opacity-100',
        bg: 'bg-purple-50',
        text: 'text-purple-500 group-hover:text-white',
        hoverBg: 'group-hover:bg-purple-600',
        border: 'border-purple-100',
    },
    orange: {
        textHoverOpacity: 'text-orange-500 group-hover:opacity-100',
        bg: 'bg-orange-50',
        text: 'text-orange-500 group-hover:text-white',
        hoverBg: 'group-hover:bg-orange-500',
        border: 'border-orange-100',
    },
    blue: {
        textHoverOpacity: 'text-blue-600 group-hover:opacity-100',
        bg: 'bg-blue-50',
        text: 'text-blue-600 group-hover:text-white',
        hoverBg: 'group-hover:bg-blue-600',
        border: 'border-blue-100',
    },
};

export const DashboardActionButton: React.FC<DashboardActionButtonProps> = ({
    label,
    icon,
    onClick,
    color,
    title,
}) => {
    const styles = colorStyles[color];

    return (
        <div
            className="flex items-center gap-2 group cursor-pointer"
            onClick={onClick}
            title={title}
        >
            {label && (
                <div className={`hidden sm:block text-[9px] font-bold uppercase tracking-tighter opacity-70 transition-opacity ${styles.textHoverOpacity}`}>
                    {label}
                </div>
            )}
            <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all shadow-sm border ${styles.bg} ${styles.text} ${styles.hoverBg} ${styles.border}`}>
                {icon}
            </div>
        </div>
    );
};
