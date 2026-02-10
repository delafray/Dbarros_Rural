
import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Plan } from '../types';
import { Card, LoadingSpinner, Badge, Button, Input, Modal } from '../components/UI';
import Layout from '../components/Layout';

const Plans: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    price: 0,
    active: true
  });

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const data = await api.getPlans();
      setPlans(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleOpenModal = (plan?: Plan) => {
    if (plan) {
      setEditingPlan(plan);
      setFormData({ name: plan.name, price: plan.price, active: plan.active });
    } else {
      setEditingPlan(null);
      setFormData({ name: '', price: 0, active: true });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingPlan) {
        await api.updatePlan(editingPlan.id, formData);
      } else {
        await api.createPlan(formData);
      }
      await fetchPlans();
      setIsModalOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Excluir este plano?')) return;
    await api.deletePlan(id);
    fetchPlans();
  };

  return (
    <Layout title="Planos">
      <div className="flex justify-end mb-6">
        <Button onClick={() => handleOpenModal()}>+ Novo Plano</Button>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map(plan => (
            <Card key={plan.id} className="p-6 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold text-slate-800">{plan.name}</h3>
                  <Badge color={plan.active ? 'green' : 'slate'}>{plan.active ? 'Ativo' : 'Inativo'}</Badge>
                </div>
                <div className="mb-6">
                  <span className="text-4xl font-extrabold text-slate-900">R$ {plan.price.toFixed(2)}</span>
                  <span className="text-slate-500 ml-1">/mês</span>
                </div>
              </div>
              <div className="flex gap-2 pt-4 border-t border-slate-100">
                <Button variant="outline" className="flex-1" onClick={() => handleOpenModal(plan)}>Editar</Button>
                <Button variant="danger" onClick={() => handleDelete(plan.id)}>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingPlan ? 'Editar Plano' : 'Novo Plano'}>
        <form onSubmit={handleSave} className="space-y-4">
          <Input label="Nome do Plano" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
          <Input label="Preço Mensal (R$)" type="number" step="0.01" value={formData.price} onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})} required />
          <div className="flex items-center gap-2">
            <input type="checkbox" id="active" checked={formData.active} onChange={e => setFormData({...formData, active: e.target.checked})} className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500" />
            <label htmlFor="active" className="text-sm font-medium text-slate-700">Plano Ativo</label>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
};

export default Plans;
