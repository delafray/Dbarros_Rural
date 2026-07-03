import React, { createContext, useContext, useState, useRef, useCallback, useMemo, ReactNode } from 'react';
import { ConfirmModal } from '../components/ConfirmModal';

export interface ConfirmDialogOptions {
    title: string;
    message?: ReactNode;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info' | 'success';
}

interface DialogContextData {
    confirm: (options: ConfirmDialogOptions) => Promise<boolean>;
    alert: (options: Omit<ConfirmDialogOptions, 'cancelText'>) => Promise<void>;
}

const DialogContext = createContext<DialogContextData>({} as DialogContextData);

export const DialogProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [options, setOptions] = useState<ConfirmDialogOptions | null>(null);
    const [isAlert, setIsAlert] = useState(false);
    // Refs (não state): a Promise pendente e o timer de auto-dismiss não devem
    // causar re-render, e o timer PRECISA ser cancelado ao abrir novo diálogo —
    // antes, o timer de um alerta antigo fechava o diálogo seguinte sozinho.
    const resolveRef = useRef<(value: boolean) => void>(() => { });
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearTimer = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    };

    const settle = useCallback((value: boolean) => {
        clearTimer();
        setIsOpen(false);
        resolveRef.current(value);
        resolveRef.current = () => { };
    }, []);

    const confirm = useCallback((opts: ConfirmDialogOptions) => {
        clearTimer();
        resolveRef.current(false); // resolve diálogo anterior eventualmente abandonado
        setOptions(opts);
        setIsOpen(true);
        setIsAlert(false);
        return new Promise<boolean>((resolve) => {
            resolveRef.current = resolve;
        });
    }, []);

    const alert = useCallback((opts: Omit<ConfirmDialogOptions, 'cancelText'>) => {
        clearTimer();
        resolveRef.current(false);
        setOptions(opts);
        setIsOpen(true);
        setIsAlert(true);
        return new Promise<void>((resolve) => {
            resolveRef.current = resolve as unknown as (value: boolean) => void;
            // Auto-dismiss de alertas de sucesso: RESOLVE a promise (antes só
            // fechava o modal e o `await alert(...)` do chamador travava para sempre)
            if (opts.type === 'success') {
                timerRef.current = setTimeout(() => settle(true), 3000);
            }
        });
    }, [settle]);

    // Memoizado: evita re-render dos 19+ consumidores a cada render do provider
    const value = useMemo(() => ({ confirm, alert }), [confirm, alert]);

    return (
        <DialogContext.Provider value={value}>
            {children}
            {options && (
                <ConfirmModal
                    isOpen={isOpen}
                    title={options.title}
                    message={options.message}
                    confirmText={options.confirmText || 'OK'}
                    cancelText={isAlert ? '' : (options.cancelText || 'Cancelar')}
                    type={options.type || (isAlert ? 'info' : 'danger')}
                    onConfirm={() => settle(true)}
                    onCancel={() => settle(false)}
                />
            )}
        </DialogContext.Provider>
    );
};

export const useAppDialog = () => useContext(DialogContext);
