import React, { createContext, useContext, useState, ReactNode } from 'react';
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
    const [resolveFn, setResolveFn] = useState<(value: boolean) => void>(() => () => { });
    const [isAlert, setIsAlert] = useState(false);

    const confirm = (opts: ConfirmDialogOptions) => {
        setOptions(opts);
        setIsOpen(true);
        setIsAlert(false);
        return new Promise<boolean>((resolve) => {
            setResolveFn(() => resolve);
        });
    };

    const alert = (opts: Omit<ConfirmDialogOptions, 'cancelText'>) => {
        setOptions(opts);
        setIsOpen(true);
        setIsAlert(true);

        // Auto-dismiss for success alerts after 3 seconds
        if (opts.type === 'success') {
            setTimeout(() => {
                setIsOpen(false);
            }, 3000);
        }

        return new Promise<void>((resolve) => {
            setResolveFn(() => resolve as unknown as (value: boolean) => void);
        });
    };

    const handleConfirm = () => {
        setIsOpen(false);
        resolveFn(true);
    };

    const handleCancel = () => {
        setIsOpen(false);
        resolveFn(false);
    };

    return (
        <DialogContext.Provider value={{ confirm, alert }}>
            {children}
            {options && (
                <ConfirmModal
                    isOpen={isOpen}
                    title={options.title}
                    message={options.message}
                    confirmText={options.confirmText || 'OK'}
                    cancelText={isAlert ? '' : (options.cancelText || 'Cancelar')}
                    type={options.type || (isAlert ? 'info' : 'danger')}
                    onConfirm={handleConfirm}
                    onCancel={handleCancel}
                />
            )}
        </DialogContext.Provider>
    );
};

export const useAppDialog = () => useContext(DialogContext);
