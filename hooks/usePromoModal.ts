import React, { useState, useEffect } from 'react';
import { useAppDialog } from '../context/DialogContext';
import { authService, User } from '../services/authService';

type PromoStep = 'confirm' | 'existing' | 'create' | 'created';

export type PromoModalState = {
    edicao: { id: string; titulo: string; evento_id?: string };
    step: PromoStep;
} | null;

export const usePromoModal = () => {
    const appDialog = useAppDialog();
    const [promoModal, setPromoModal] = useState<PromoModalState>(null);
    const [allVisitors, setAllVisitors] = useState<User[]>([]);
    const [promoExpiresAt, setPromoExpiresAt] = useState('');
    const [promoCreated, setPromoCreated] = useState<{ user: User; passwordRaw: string } | null>(null);
    const [promoLoading, setPromoLoading] = useState(false);

    useEffect(() => {
        authService.getAllUsers().then(users => {
            setAllVisitors(users.filter((u: User) =>
                u.isVisitor && u.isActive !== false &&
                (!u.expiresAt || new Date(u.expiresAt) >= new Date())
            ));
        }).catch(() => { });
    }, []);

    const handleOpenPromoModal = (e: React.MouseEvent, edicao: any) => {
        e.stopPropagation();
        setPromoExpiresAt('');
        setPromoCreated(null);
        setPromoModal({ edicao, step: 'confirm' });
    };

    const handlePromoConfirm = () => {
        if (!promoModal) return;
        const existing = allVisitors.find(u => u.edicaoId === promoModal.edicao.id) ?? null;
        if (existing) {
            setPromoModal({ ...promoModal, step: 'existing' });
        } else {
            setPromoModal({ ...promoModal, step: 'create' });
        }
    };

    const handlePromoCreate = async () => {
        if (!promoModal || !promoExpiresAt) return;
        setPromoLoading(true);
        try {
            const result = await authService.createTempUser(
                new Date(promoExpiresAt),
                promoModal.edicao.id,
                promoModal.edicao.titulo
            );
            setPromoCreated(result);
            setAllVisitors(prev => [...prev, result.user]);
            setPromoModal({ ...promoModal, step: 'created' });
        } catch (err: any) {
            await appDialog.alert({ title: 'Erro', message: 'Erro ao criar acesso: ' + err.message, type: 'danger' });
        } finally {
            setPromoLoading(false);
        }
    };

    const closePromoModal = () => {
        setPromoModal(null);
        setPromoExpiresAt('');
        setPromoCreated(null);
    };

    return {
        promoModal,
        allVisitors,
        promoExpiresAt,
        setPromoExpiresAt,
        promoCreated,
        promoLoading,
        handleOpenPromoModal,
        handlePromoConfirm,
        handlePromoCreate,
        closePromoModal,
    };
};
