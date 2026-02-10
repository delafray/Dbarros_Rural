
import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Payment, Subscription, Customer, Plan } from '../types';
import { Card, LoadingSpinner, Badge } from '../components/UI';
import Layout from '../components/Layout';

const Payments: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [filterSub, setFilterSub] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [pay, sub, cust, pl] = await Promise.all([
        api.getPayments(),
        api.getSubscriptions(),
        api.getCustomers(),
        api.getPlans()
      ]);
      setPayments(pay.sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime()));
      setSubscriptions(sub);
      setCustomers(cust);
      setPlans(pl);
      setLoading(false);
    };
    load();
  }, []);

  const filteredPayments = filterSub 
    ? payments.filter(p => p.subscriptionId === filterSub)
    : payments;

  return (
    <Layout title="Histórico de Pagamentos">
      <Card className="mb-6 p-4">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-slate-700">Filtrar por Assinatura:</label>
          <select 
            className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
            value={filterSub}
            onChange={e => setFilterSub(e.target.value)}
          >
            <option value="">Todos os pagamentos</option>
            {subscriptions.map(s => {
              const customer = customers.find(c => c.id === s.customerId);
              return <option key={s.id} value={s.id}>{customer?.name} (Sub ID: {s.id.slice(0, 4)})</option>
            })}
          </select>
        </div>
      </Card>

      {loading ? <LoadingSpinner /> : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4">Cliente / Plano</th>
                  <th className="px-6 py-4">Valor</th>
                  <th className="px-6 py-4">Data Pagamento</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPayments.map(p => {
                  const sub = subscriptions.find(s => s.id === p.subscriptionId);
                  const customer = customers.find(c => c?.id === sub?.customerId);
                  const plan = plans.find(pl => pl.id === sub?.planId);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-xs font-mono text-slate-400">#{p.id.slice(0, 6)}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-700">{customer?.name}</span>
                          <span className="text-xs text-slate-500">{plan?.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-800">R$ {p.amount.toFixed(2)}</td>
                      <td className="px-6 py-4 text-slate-600">{new Date(p.paidAt).toLocaleString()}</td>
                      <td className="px-6 py-4"><Badge color="green">Pago</Badge></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </Layout>
  );
};

export default Payments;
