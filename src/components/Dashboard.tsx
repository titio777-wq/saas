import React, { useState } from 'react';
import { Campaign, DashboardMetrics } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, Line, ComposedChart, ReferenceLine
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Activity, Users, Megaphone, ArrowUpDown } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'framer-motion';

interface DashboardProps {
  campaigns: Campaign[];
  metrics: DashboardMetrics;
}

export function Dashboard({ campaigns, metrics }: DashboardProps) {
  const [profitSortOrder, setProfitSortOrder] = useState<'desc' | 'asc'>('desc');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatPercent = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'percent', minimumFractionDigits: 2 }).format(value / 100);
  };

  // Data for Main Chart
  const mainChartData = campaigns.map(c => {
    const start = new Date(c.startDate).getTime();
    const end = new Date(c.endDate).getTime();
    const days = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
    const dailyCost = c.totalSpent / days;

    return {
      name: c.name,
      profit: c.revenue - c.totalSpent,
      spent: c.totalSpent,
      revenue: c.revenue,
      dailyCost: dailyCost,
      isActive: c.status === 'Active'
    };
  }).sort((a, b) => b.profit - a.profit).slice(0, 5); // Top 5

  // Data for Profitability Chart
  const profitabilityData = [...campaigns].map(c => ({
    name: c.name,
    profit: c.revenue - c.totalSpent,
  })).sort((a, b) => profitSortOrder === 'desc' ? b.profit - a.profit : a.profit - b.profit);

  const typeData = [
    { name: 'Influenciadores', value: campaigns.filter(c => c.type === 'Influencer').reduce((acc, c) => acc + c.revenue, 0) },
    { name: 'Tráfego Pago', value: campaigns.filter(c => c.type === 'Traffic').reduce((acc, c) => acc + c.revenue, 0) },
    { name: 'Orgânico', value: campaigns.filter(c => c.type === 'Organic').reduce((acc, c) => acc + c.revenue, 0) },
  ];

  const COLORS = ['#10b981', '#3b82f6', '#8b5cf6']; // Emerald, Blue, Purple

  // Detailed Summary Calculations
  const calcROI = (spent: number, profit: number) => spent > 0 ? (profit / spent) * 100 : 0;

  const influencerMap = new Map<string, { spent: number, revenue: number, profit: number }>();
  campaigns.filter(c => c.type === 'Influencer').forEach(c => {
    const name = c.influencerName || 'Desconhecido';
    const existing = influencerMap.get(name) || { spent: 0, revenue: 0, profit: 0 };
    influencerMap.set(name, {
      spent: existing.spent + c.totalSpent,
      revenue: existing.revenue + c.revenue,
      profit: existing.profit + (c.revenue - c.totalSpent)
    });
  });
  const influencerSummary = Array.from(influencerMap.entries()).map(([name, data]) => ({
    name,
    ...data,
    roi: calcROI(data.spent, data.profit)
  })).sort((a, b) => b.profit - a.profit);

  const trafficSummary = campaigns.filter(c => c.type === 'Traffic').map(c => ({
    name: c.name,
    spent: c.totalSpent,
    revenue: c.revenue,
    profit: c.revenue - c.totalSpent,
    roi: calcROI(c.totalSpent, c.revenue - c.totalSpent)
  })).sort((a, b) => b.profit - a.profit);

  const organicSummary = campaigns.filter(c => c.type === 'Organic').map(c => ({
    name: c.name,
    spent: c.totalSpent,
    revenue: c.revenue,
    profit: c.revenue - c.totalSpent,
    roi: calcROI(c.totalSpent, c.revenue - c.totalSpent)
  })).sort((a, b) => b.profit - a.profit);

  const sumSegment = (summary: any[]) => summary.reduce((acc, curr) => ({
    spent: acc.spent + curr.spent,
    revenue: acc.revenue + curr.revenue,
    profit: acc.profit + curr.profit
  }), { spent: 0, revenue: 0, profit: 0 });

  const infTotal = sumSegment(influencerSummary);
  const trafTotal = sumSegment(trafficSummary);
  const orgTotal = sumSegment(organicSummary);

  const overallTotal = {
    spent: infTotal.spent + trafTotal.spent + orgTotal.spent,
    revenue: infTotal.revenue + trafTotal.revenue + orgTotal.revenue,
    profit: infTotal.profit + trafTotal.profit + orgTotal.profit,
  };

  const SummaryTable = ({ title, data, total }: { title: string, data: any[], total: any }) => (
    <div className="space-y-4">
      <h4 className="text-lg font-semibold text-neutral-200">{title}</h4>
      <div className="overflow-x-auto rounded-lg border border-neutral-800">
        <table className="w-full text-sm text-left text-neutral-400">
          <thead className="text-xs text-neutral-500 uppercase bg-neutral-900/80 border-b border-neutral-800">
            <tr>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium text-right">Investido</th>
              <th className="px-4 py-3 font-medium text-right">Receita</th>
              <th className="px-4 py-3 font-medium text-right">Lucro</th>
              <th className="px-4 py-3 font-medium text-right">ROI</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, i) => (
              <tr key={i} className="border-b border-neutral-800/50 hover:bg-neutral-900/40 transition-colors">
                <td className="px-4 py-3 font-medium text-neutral-300">{item.name}</td>
                <td className="px-4 py-3 text-right">{formatCurrency(item.spent)}</td>
                <td className="px-4 py-3 text-right text-emerald-400">{formatCurrency(item.revenue)}</td>
                <td className={`px-4 py-3 text-right font-medium ${item.profit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {formatCurrency(item.profit)}
                </td>
                <td className={`px-4 py-3 text-right ${item.roi >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {formatPercent(item.roi)}
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-4 text-center text-neutral-500">Nenhum dado disponível.</td>
              </tr>
            )}
          </tbody>
          {data.length > 0 && (
            <tfoot className="bg-neutral-900/90 font-semibold text-neutral-300 border-t border-neutral-700">
              <tr>
                <td className="px-4 py-3">Total {title}</td>
                <td className="px-4 py-3 text-right">{formatCurrency(total.spent)}</td>
                <td className="px-4 py-3 text-right text-emerald-400">{formatCurrency(total.revenue)}</td>
                <td className={`px-4 py-3 text-right ${total.profit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {formatCurrency(total.profit)}
                </td>
                <td className={`px-4 py-3 text-right ${calcROI(total.spent, total.profit) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {formatPercent(calcROI(total.spent, total.profit))}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <motion.header variants={itemVariants}>
        <h2 className="text-3xl font-bold text-white tracking-tight">Dashboard Financeiro</h2>
        <p className="text-neutral-400 mt-1">Visão geral das suas operações de tráfego e influência.</p>
      </motion.header>

      {/* KPI Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          title="Total Investido" 
          value={formatCurrency(metrics.totalSpent)} 
          icon={DollarSign} 
          trend="neutral"
        />
        <MetricCard 
          title="Receita Total" 
          value={formatCurrency(metrics.totalRevenue)} 
          icon={Activity} 
          trend="positive"
        />
        <MetricCard 
          title="Lucro Líquido" 
          value={formatCurrency(metrics.totalProfit)} 
          icon={TrendingUp} 
          trend={metrics.totalProfit >= 0 ? 'positive' : 'negative'}
          valueColor={metrics.totalProfit > 0 ? 'text-emerald-500' : metrics.totalProfit < 0 ? 'text-red-500' : 'text-yellow-500'}
        />
        <MetricCard 
          title="ROI Geral" 
          value={formatPercent(metrics.overallROI)} 
          icon={metrics.overallROI >= 0 ? TrendingUp : TrendingDown} 
          trend={metrics.overallROI >= 0 ? 'positive' : 'negative'}
          valueColor={metrics.overallROI > 0 ? 'text-emerald-500' : metrics.overallROI < 0 ? 'text-red-500' : 'text-yellow-500'}
        />
      </motion.div>

      {/* Charts Section */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart: Revenue vs Spent + Daily Cost */}
        <div className="lg:col-span-2 bg-neutral-950 border border-neutral-800 rounded-xl p-6 shadow-xl">
          <h3 className="text-lg font-semibold text-white mb-4">Top Campanhas (Receita vs Custo vs Custo Diário)</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={mainChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                <XAxis dataKey="name" stroke="#888" tick={{fill: '#888', fontSize: 12}} />
                <YAxis yAxisId="left" stroke="#888" tick={{fill: '#888', fontSize: 12}} tickFormatter={(value) => `R$${value/1000}k`} />
                <YAxis yAxisId="right" orientation="right" stroke="#888" tick={{fill: '#888', fontSize: 12}} tickFormatter={(value) => `R$${value}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#171717', borderColor: '#333', color: '#fff', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                  formatter={(value: number, name: string) => [formatCurrency(value), name]}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="revenue" name="Receita" fill="#10b981" radius={[4, 4, 0, 0]} animationDuration={1500} />
                <Bar yAxisId="left" dataKey="spent" name="Custo Total" fill="#ef4444" radius={[4, 4, 0, 0]} animationDuration={1500} />
                <Line yAxisId="right" type="monotone" dataKey="dailyCost" name="Custo Diário" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} animationDuration={1500} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart: Revenue by Type */}
        <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-6 flex flex-col shadow-xl">
          <h3 className="text-lg font-semibold text-white mb-4">Receita por Canal</h3>
          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={typeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  animationDuration={1500}
                >
                  {typeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ backgroundColor: '#171717', borderColor: '#333', color: '#fff', borderRadius: '8px' }}
                />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </motion.div>

      {/* Profitability Chart */}
      <motion.div variants={itemVariants} className="bg-neutral-950 border border-neutral-800 rounded-xl p-6 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">Lucratividade por Campanha</h3>
          <button 
            onClick={() => setProfitSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
            className="flex items-center gap-2 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-300 transition-colors"
          >
            <ArrowUpDown size={16} />
            {profitSortOrder === 'desc' ? 'Maior Lucro' : 'Menor Lucro'}
          </button>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={profitabilityData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis dataKey="name" stroke="#888" tick={{fill: '#888', fontSize: 12}} />
              <YAxis stroke="#888" tick={{fill: '#888', fontSize: 12}} tickFormatter={(value) => `R$${value/1000}k`} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#171717', borderColor: '#333', color: '#fff', borderRadius: '8px' }}
                itemStyle={{ color: '#fff' }}
                formatter={(value: number) => formatCurrency(value)}
                cursor={{fill: '#262626'}}
              />
              <ReferenceLine y={0} stroke="#555" />
              <Bar dataKey="profit" name="Lucro Líquido" radius={[4, 4, 0, 0]} animationDuration={1500}>
                {profitabilityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.profit >= 0 ? '#10b981' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Quick Insights */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="relative overflow-hidden bg-neutral-950 border border-neutral-800 rounded-xl p-6 shadow-xl hover:border-emerald-500/30 transition-all duration-500 group">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2 relative z-10">
            <Megaphone className="text-emerald-500" size={20} />
            Melhor Influenciador
          </h3>
          <div className="relative z-10">
            {(() => {
              if (influencerSummary.length === 0) return <p className="text-neutral-500">Nenhum dado disponível.</p>;
              const best = influencerSummary[0]; // Already sorted by profit desc
              return (
                <div>
                  <p className="text-2xl font-bold text-white">{best.name}</p>
                  <p className={cn("text-lg font-medium mt-2", best.profit > 0 ? "text-emerald-500" : "text-red-500")}>
                    Lucro: {formatCurrency(best.profit)}
                  </p>
                </div>
              );
            })()}
          </div>
        </div>

        <div className="relative overflow-hidden bg-neutral-950 border border-neutral-800 rounded-xl p-6 shadow-xl hover:border-blue-500/30 transition-all duration-500 group">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2 relative z-10">
            <Users className="text-blue-500" size={20} />
            Melhor Campanha de Tráfego
          </h3>
          <div className="relative z-10">
            {(() => {
              if (trafficSummary.length === 0) return <p className="text-neutral-500">Nenhum dado disponível.</p>;
              const best = trafficSummary[0]; // Already sorted by profit desc
              return (
                <div>
                  <p className="text-2xl font-bold text-white">{best.name}</p>
                  <p className={cn("text-lg font-medium mt-2", best.profit > 0 ? "text-emerald-500" : "text-red-500")}>
                    Lucro: {formatCurrency(best.profit)}
                  </p>
                </div>
              );
            })()}
          </div>
        </div>

        <div className="relative overflow-hidden bg-neutral-950 border border-neutral-800 rounded-xl p-6 shadow-xl hover:border-purple-500/30 transition-all duration-500 group">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2 relative z-10">
            <Activity className="text-purple-500" size={20} />
            Melhor Campanha Orgânica
          </h3>
          <div className="relative z-10">
            {(() => {
              if (organicSummary.length === 0) return <p className="text-neutral-500">Nenhum dado disponível.</p>;
              const best = organicSummary[0]; // Already sorted by profit desc
              return (
                <div>
                  <p className="text-2xl font-bold text-white">{best.name}</p>
                  <p className={cn("text-lg font-medium mt-2", best.profit > 0 ? "text-emerald-500" : "text-red-500")}>
                    Lucro: {formatCurrency(best.profit)}
                  </p>
                </div>
              );
            })()}
          </div>
        </div>
      </motion.div>

      {/* Detailed Segment Summary */}
      <motion.div variants={itemVariants} className="bg-neutral-950 border border-neutral-800 rounded-xl p-6 shadow-xl space-y-8">
        <div>
          <h3 className="text-xl font-bold text-white mb-2">Resumo Detalhado por Segmento</h3>
          <p className="text-sm text-neutral-400 mb-6">Desempenho individual e soma geral dos 3 segmentos operacionais.</p>
          
          {/* Overall Totals */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-4">
              <p className="text-sm text-neutral-500 mb-1">Total Investido (Geral)</p>
              <p className="text-xl font-bold text-white">{formatCurrency(overallTotal.spent)}</p>
            </div>
            <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-4">
              <p className="text-sm text-neutral-500 mb-1">Receita Gerada (Geral)</p>
              <p className="text-xl font-bold text-emerald-400">{formatCurrency(overallTotal.revenue)}</p>
            </div>
            <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-4">
              <p className="text-sm text-neutral-500 mb-1">Lucro Total (Geral)</p>
              <p className={`text-xl font-bold ${overallTotal.profit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {formatCurrency(overallTotal.profit)}
              </p>
            </div>
            <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-4">
              <p className="text-sm text-neutral-500 mb-1">ROI Médio (Geral)</p>
              <p className={`text-xl font-bold ${calcROI(overallTotal.spent, overallTotal.profit) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {formatPercent(calcROI(overallTotal.spent, overallTotal.profit))}
              </p>
            </div>
          </div>

          <div className="space-y-8">
            <SummaryTable title="Influenciadores" data={influencerSummary} total={infTotal} />
            <SummaryTable title="Tráfego Pago" data={trafficSummary} total={trafTotal} />
            <SummaryTable title="Orgânico" data={organicSummary} total={orgTotal} />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function MetricCard({ title, value, icon: Icon, trend, valueColor = "text-white" }: any) {
  return (
    <motion.div 
      whileHover={{ y: -5, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      className="relative overflow-hidden bg-neutral-950 border border-neutral-800 rounded-xl p-6 flex flex-col shadow-xl cursor-default group"
    >
      {/* Subtle gradient background on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="flex justify-between items-start mb-4 relative z-10">
        <h3 className="text-sm font-medium text-neutral-400">{title}</h3>
        <div className={cn(
          "p-2 rounded-lg transition-colors duration-300",
          trend === 'positive' ? "bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500/20" : 
          trend === 'negative' ? "bg-red-500/10 text-red-500 group-hover:bg-red-500/20" : 
          "bg-blue-500/10 text-blue-500 group-hover:bg-blue-500/20"
        )}>
          <Icon size={20} />
        </div>
      </div>
      <div className="mt-auto relative z-10">
        <p className={cn("text-3xl font-bold tracking-tight", valueColor)}>{value}</p>
      </div>
    </motion.div>
  );
}

