
import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Subscription, Customer, Plan, SubscriptionStatus } from '../types';
import { Card, LoadingSpinner, Badge, Button, Input, Modal } from '../components/UI';
import Layout from '../components/Layout';

const Subscriptions: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedSub, setSelectedSub] = useState<Subscription | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    customerId: '',
    planId: '',
    startDate: new Date().toISOString().split('T')[0],
    nextRenewal: '',
    status: 'ativa' as SubscriptionStatus
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [s, c, p] = await Promise.all([
        api.getSubscriptions(),
        api.getCustomers(),
        api.getPlans()
      ]);
      setSubscriptions(s);
      setCustomers(c);
      setPlans(p);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenModal = () => {
    setFormData({
      customerId: customers[0]?.id || '',
      planId: plans[0]?.id || '',
      startDate: new Date().toISOString().split('T')[0],
      nextRenewal: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'ativa'
    });
    setIsModalOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.createSubscription({
        ...formData,
        startDate: new Date(formData.startDate).toISOString(),
        nextRenewal: new Date(formData.nextRenewal).toISOString(),
      });
      fetchData();
      setIsModalOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleRegisterPayment = async (sub: Subscription) => {
    const plan = plans.find(p => p.id === sub.planId);
    if (!plan) return;

    if (window.confirm(`Registrar pagamento de R$ ${plan.price.toFixed(2)} para esta assinatura? Isso renovará o status para Ativa e adicionará 30 dias.`)) {
      setSaving(true);
      try {
        await api.createPayment({
          subscriptionId: sub.id,
          amount: plan.price,
          paidAt: new Date().toISOString()
        });
        alert('Pagamento registrado com sucesso!');
        fetchData();
      } finally {
        setSaving(false);
      }
    }
  };

  const getStatusColor = (status: SubscriptionStatus) => {
    switch (status) {
      case 'ativa': return 'green';
      case 'vencida': return 'red';
      case 'cancelada': return 'slate';
      default: return 'slate';
    }
  };

  return (
    <Layout title="Assinaturas">
      <div className="flex justify-end mb-6">
        <Button onClick={handleOpenModal}>+ Nova Assinatura</Button>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                  <th className="px-6 py-4">Cliente</th>
                  <th className="px-6 py-4">Plano</th>
                  <th className="px-6 py-4">Próximo Vencimento</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subscriptions.map((sub) => {
                  const customer = customers.find(c => c.id === sub.customerId);
                  const plan = plans.find(p => p.id === sub.planId);
                  return (
                    <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-700">{customer?.name}</td>
                      <td className="px-6 py-4 text-slate-600">{plan?.name}</td>
                      <td className="px-6 py-4">{new Date(sub.nextRenewal).toLocaleDateString()}</td>
                      <td className="px-6 py-4"><Badge color={getStatusColor(sub.status)}>{sub.status}</Badge></td>
                      <td className="px-6 py-4 text-right">
                        {/* Fix: removed unsupported 'size' prop from Button to resolve TS error */}
                        <Button 
                          variant="outline" 
                          onClick={() => handleRegisterPayment(sub)}
                          disabled={saving}
                        >
                          💸 Pagar
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nova Assinatura">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">Cliente</label>
            <select 
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"
              value={formData.customerId}
              onChange={e => setFormData({...formData, customerId: e.target.value})}
              required
            >
              <option value="">Selecione um cliente</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">Plano</label>
            <select 
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"
              value={formData.planId}
              onChange={e => setFormData({...formData, planId: e.target.value})}
              required
            >
              <option value="">Selecione um plano</option>
              {plans.filter(p => p.active).map(p => <option key={p.id} value={p.id}>{p.name} - R${p.price.toFixed(2)}</option>)}
            </select>
          </div>
          <Input 
            label="Data de Início" 
            type="date" 
            value={formData.startDate} 
            onChange={e => setFormData({...formData, startDate: e.target.value})} 
            required 
          />
          <Input 
            label="Próxima Renovação" 
            type="date" 
            value={formData.nextRenewal} 
            onChange={e => setFormData({...formData, nextRenewal: e.target.value})} 
            required 
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>Confirmar Assinatura</Button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
};

export default Subscriptions;
