import React, { useState } from 'react';
import { Campaign, DashboardMetrics } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, Line, ComposedChart, ReferenceLine
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Activity, Users, Megaphone, ArrowUpDown } from 'lucide-react';
import { cn } from '../lib/utils';

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
  ];

  const COLORS = ['#10b981', '#3b82f6']; // Emerald and Blue

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-3xl font-bold text-white tracking-tight">Dashboard Financeiro</h2>
        <p className="text-neutral-400 mt-1">Visão geral das suas operações de tráfego e influência.</p>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart: Revenue vs Spent + Daily Cost */}
        <div className="lg:col-span-2 bg-neutral-950 border border-neutral-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Top Campanhas (Receita vs Custo vs Custo Diário)</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={mainChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                <XAxis dataKey="name" stroke="#888" tick={{fill: '#888', fontSize: 12}} />
                <YAxis yAxisId="left" stroke="#888" tick={{fill: '#888', fontSize: 12}} tickFormatter={(value) => `R$${value/1000}k`} />
                <YAxis yAxisId="right" orientation="right" stroke="#888" tick={{fill: '#888', fontSize: 12}} tickFormatter={(value) => `R$${value}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#171717', borderColor: '#333', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                  formatter={(value: number, name: string) => [formatCurrency(value), name]}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="revenue" name="Receita" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="left" dataKey="spent" name="Custo Total" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="dailyCost" name="Custo Diário" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart: Revenue by Type */}
        <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-6 flex flex-col">
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
                >
                  {typeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ backgroundColor: '#171717', borderColor: '#333', color: '#fff' }}
                />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Profitability Chart */}
      <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-6">
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
                contentStyle={{ backgroundColor: '#171717', borderColor: '#333', color: '#fff' }}
                itemStyle={{ color: '#fff' }}
                formatter={(value: number) => formatCurrency(value)}
                cursor={{fill: '#262626'}}
              />
              <ReferenceLine y={0} stroke="#555" />
              <Bar dataKey="profit" name="Lucro Líquido" radius={[4, 4, 0, 0]}>
                {profitabilityData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.profit >= 0 ? '#10b981' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quick Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Megaphone className="text-emerald-500" size={20} />
            Melhor Influenciador
          </h3>
          {(() => {
            const influencers = campaigns.filter(c => c.type === 'Influencer' && c.influencerName);
            if (influencers.length === 0) return <p className="text-neutral-500">Nenhum dado disponível.</p>;
            
            const best = influencers.reduce((prev, current) => 
              ((current.revenue - current.totalSpent) > (prev.revenue - prev.totalSpent)) ? current : prev
            );
            const profit = best.revenue - best.totalSpent;
            
            return (
              <div>
                <p className="text-2xl font-bold text-white">{best.influencerName}</p>
                <p className="text-sm text-neutral-400 mt-1">Campanha: {best.name}</p>
                <p className={cn("text-lg font-medium mt-2", profit > 0 ? "text-emerald-500" : "text-red-500")}>
                  Lucro: {formatCurrency(profit)}
                </p>
              </div>
            );
          })()}
        </div>

        <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Users className="text-blue-500" size={20} />
            Melhor Campanha de Tráfego
          </h3>
          {(() => {
            const traffic = campaigns.filter(c => c.type === 'Traffic');
            if (traffic.length === 0) return <p className="text-neutral-500">Nenhum dado disponível.</p>;
            
            const best = traffic.reduce((prev, current) => 
              ((current.revenue - current.totalSpent) > (prev.revenue - prev.totalSpent)) ? current : prev
            );
            const profit = best.revenue - best.totalSpent;
            
            return (
              <div>
                <p className="text-2xl font-bold text-white">{best.name}</p>
                <p className="text-sm text-neutral-400 mt-1">Plataforma: {best.platform}</p>
                <p className={cn("text-lg font-medium mt-2", profit > 0 ? "text-emerald-500" : "text-red-500")}>
                  Lucro: {formatCurrency(profit)}
                </p>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, trend, valueColor = "text-white" }: any) {
  return (
    <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-6 flex flex-col">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-sm font-medium text-neutral-400">{title}</h3>
        <div className={cn(
          "p-2 rounded-lg",
          trend === 'positive' ? "bg-emerald-500/10 text-emerald-500" : 
          trend === 'negative' ? "bg-red-500/10 text-red-500" : 
          "bg-blue-500/10 text-blue-500"
        )}>
          <Icon size={20} />
        </div>
      </div>
      <div className="mt-auto">
        <p className={cn("text-3xl font-bold tracking-tight", valueColor)}>{value}</p>
      </div>
    </div>
  );
}

