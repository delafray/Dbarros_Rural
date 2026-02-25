import React from 'react';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message?: React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    type?: 'danger' | 'warning' | 'info' | 'success';
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    title,
    message,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    onConfirm,
    onCancel,
    type = 'danger'
}) => {
    if (!isOpen) return null;

    let iconBg = 'bg-red-100';
    let iconColor = 'text-red-500';
    let btnColor = 'bg-red-500 hover:bg-red-600';
    let iconSvg = (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    ); // Sair/Logout por padrão ou Danger

    if (type === 'warning') {
        iconBg = 'bg-orange-100';
        iconColor = 'text-orange-500';
        btnColor = 'bg-orange-500 hover:bg-orange-600';
        iconSvg = (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        );
    } else if (type === 'success') {
        iconBg = 'bg-green-100';
        iconColor = 'text-green-500';
        btnColor = 'bg-green-500 hover:bg-green-600';
        iconSvg = <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />;
    } else if (type === 'info') {
        iconBg = 'bg-blue-100';
        iconColor = 'text-blue-500';
        btnColor = 'bg-blue-500 hover:bg-blue-600';
        iconSvg = <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />;
    }

    // Se for 'danger' mas não for 'Sair', usa o ícone de Warning/Trash
    if (type === 'danger' && confirmText.toLowerCase() !== 'sair e deslogar') {
        iconSvg = <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />;
    }

    return (
        <div className="fixed inset-0 z-[200] flex items-end justify-center md:items-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4 animate-in slide-in-from-bottom-4 duration-300">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full ${iconBg} flex items-center justify-center flex-shrink-0`}>
                        <svg className={`w-5 h-5 ${iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            {iconSvg}
                        </svg>
                    </div>
                    <div>
                        <h3 className="font-black text-slate-800 text-base">{title}</h3>
                        {message && (
                            <p className="text-xs text-slate-500 mt-0.5">
                                {message}
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex gap-2">
                    {cancelText && (
                        <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all">
                            {cancelText}
                        </button>
                    )}
                    <button onClick={onConfirm} className={`flex-1 py-2.5 rounded-xl text-white text-sm font-bold transition-all ${btnColor}`}>
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};
