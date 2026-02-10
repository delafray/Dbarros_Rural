
import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Customer, Plan, Subscription, DashboardStats } from '../types';
import { Card, LoadingSpinner, Badge } from '../components/UI';
import Layout from '../components/Layout';

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalCustomers: 0,
    activeSubscriptions: 0,
    overdueSubscriptions: 0,
    mrr: 0
  });
  const [overdueList, setOverdueList] = useState<{ sub: Subscription; customerName: string; planName: string }[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [customers, plans, subscriptions] = await Promise.all([
          api.getCustomers(),
          api.getPlans(),
          api.getSubscriptions()
        ]);

        const activeSubs = subscriptions.filter(s => s.status === 'ativa');
        const overdueSubs = subscriptions.filter(s => s.status === 'vencida');

        // Calculate MRR
        let mrrValue = 0;
        activeSubs.forEach(s => {
          const plan = plans.find(p => p.id === s.planId);
          if (plan) mrrValue += plan.price;
        });

        setStats({
          totalCustomers: customers.length,
          activeSubscriptions: activeSubs.length,
          overdueSubscriptions: overdueSubs.length,
          mrr: mrrValue
        });

        // Get info for overdue list
        const list = overdueSubs.map(sub => {
          const customer = customers.find(c => c.id === sub.customerId);
          const plan = plans.find(p => p.id === sub.planId);
          return {
            sub,
            customerName: customer?.name || 'Unknown',
            planName: plan?.name || 'Unknown'
          };
        });
        setOverdueList(list);

      } catch (error) {
        console.error('Failed to load dashboard data', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <Layout title="Dashboard"><LoadingSpinner /></Layout>;

  return (
    <Layout title="Visão Geral">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <StatCard title="Clientes Totais" value={stats.totalCustomers} icon={UsersIcon} color="blue" />
        <StatCard title="Assinaturas Ativas" value={stats.activeSubscriptions} icon={CheckIcon} color="green" />
        <StatCard title="Assinaturas Vencidas" value={stats.overdueSubscriptions} icon={AlertIcon} color="red" />
        <StatCard title="MRR Mensal" value={`R$ ${stats.mrr.toFixed(2)}`} icon={CurrencyIcon} color="indigo" />
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <h3 className="text-lg font-bold text-slate-800">Atenção Necessária</h3>
            <span className="text-sm text-slate-500">{overdueList.length} assinaturas vencidas</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                  <th className="px-6 py-4">Cliente</th>
                  <th className="px-6 py-4">Plano</th>
                  <th className="px-6 py-4">Vencimento</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {overdueList.length > 0 ? overdueList.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-700">{item.customerName}</td>
                    <td className="px-6 py-4 text-slate-600">{item.planName}</td>
                    <td className="px-6 py-4 text-red-500 font-medium">{new Date(item.sub.nextRenewal).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <Badge color="red">Vencida</Badge>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400">Tudo em dia! Nenhuma assinatura vencida.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </Layout>
  );
};

const StatCard = ({ title, value, icon: Icon, color }: any) => {
  const colors: any = {
    blue: 'text-blue-600 bg-blue-50',
    green: 'text-green-600 bg-green-50',
    red: 'text-red-600 bg-red-50',
    indigo: 'text-indigo-600 bg-indigo-50',
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
          <h4 className="text-2xl font-bold text-slate-800 tracking-tight">{value}</h4>
        </div>
        <div className={`p-3 rounded-lg ${colors[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </Card>
  );
};

const UsersIcon = (props: any) => <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>;
const CheckIcon = (props: any) => <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const AlertIcon = (props: any) => <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const CurrencyIcon = (props: any) => <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;

export default Dashboard;
