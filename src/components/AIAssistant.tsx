import React, { useState, useMemo } from 'react';
import { Campaign, DashboardMetrics } from '../types';
import { Bot, Sparkles, AlertCircle, Loader2, Calendar, BarChart2, CalendarDays } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import ReactMarkdown from 'react-markdown';
import { motion } from 'motion/react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer 
} from 'recharts';

interface AIAssistantProps {
  campaigns: Campaign[];
  metrics: DashboardMetrics;
}

export function AIAssistant({ campaigns, metrics }: AIAssistantProps) {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [periodType, setPeriodType] = useState<'monthly' | 'annual'>('monthly');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedYear, setSelectedYear] = useState<string>(() => {
    return new Date().getFullYear().toString();
  });

  const { filteredCampaigns, prevCampaigns, prevPeriodStr, currentPeriodStr } = useMemo(() => {
    let currentStr = '';
    let prevStr = '';
    let filtered = [] as Campaign[];
    let prev = [] as Campaign[];

    if (periodType === 'monthly') {
      currentStr = selectedMonth;
      filtered = campaigns.filter(c => {
        if (!selectedMonth) return true;
        return c.startDate.substring(0, 7) === selectedMonth;
      });

      if (selectedMonth) {
        const [year, month] = selectedMonth.split('-');
        let prevYear = parseInt(year);
        let prevMonth = parseInt(month) - 1;
        if (prevMonth === 0) {
          prevMonth = 12;
          prevYear -= 1;
        }
        prevStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
        prev = campaigns.filter(c => c.startDate.substring(0, 7) === prevStr);
      }
    } else {
      currentStr = selectedYear;
      filtered = campaigns.filter(c => {
        if (!selectedYear) return true;
        return c.startDate.substring(0, 4) === selectedYear;
      });

      if (selectedYear) {
        const prevYear = parseInt(selectedYear) - 1;
        prevStr = prevYear.toString();
        prev = campaigns.filter(c => c.startDate.substring(0, 4) === prevStr);
      }
    }

    return { filteredCampaigns: filtered, prevCampaigns: prev, prevPeriodStr: prevStr, currentPeriodStr: currentStr };
  }, [campaigns, selectedMonth, selectedYear, periodType]);

  const analyzeData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("Chave da API do Gemini não configurada.");
      }

      const ai = new GoogleGenAI({ apiKey });

      const platformSummary = filteredCampaigns.reduce((acc, camp) => {
        if (!acc[camp.platform]) {
          acc[camp.platform] = { spent: 0, revenue: 0, profit: 0, budget: 0, conversions: 0, cpa: 0 };
        }
        acc[camp.platform].spent += camp.totalSpent;
        acc[camp.platform].revenue += camp.revenue;
        acc[camp.platform].profit += (camp.revenue - camp.totalSpent);
        acc[camp.platform].budget += camp.budget;
        
        const campConversions = camp.dailyRecords?.reduce((sum, r) => sum + (r.salesCount || 0), 0) || 0;
        acc[camp.platform].conversions += campConversions;
        return acc;
      }, {} as Record<string, { spent: number, revenue: number, profit: number, budget: number, conversions: number, cpa: number }>);

      Object.keys(platformSummary).forEach(p => {
        const data = platformSummary[p];
        data.cpa = data.conversions > 0 ? data.spent / data.conversions : 0;
      });

      const influencerSummary = filteredCampaigns.filter(c => c.type === 'Influencer').reduce((acc, camp) => {
        const name = camp.influencerName || 'Desconhecido';
        if (!acc[name]) {
          acc[name] = { spent: 0, revenue: 0, profit: 0, budget: 0, conversions: 0, cpa: 0 };
        }
        acc[name].spent += camp.totalSpent;
        acc[name].revenue += camp.revenue;
        acc[name].profit += (camp.revenue - camp.totalSpent);
        acc[name].budget += camp.budget;
        
        const campConversions = camp.dailyRecords?.reduce((sum, r) => sum + (r.salesCount || 0), 0) || 0;
        acc[name].conversions += campConversions;
        return acc;
      }, {} as Record<string, { spent: number, revenue: number, profit: number, budget: number, conversions: number, cpa: number }>);

      Object.keys(influencerSummary).forEach(p => {
        const data = influencerSummary[p];
        data.cpa = data.conversions > 0 ? data.spent / data.conversions : 0;
      });

      const prevPlatformSummary = prevCampaigns.reduce((acc, camp) => {
        if (!acc[camp.platform]) {
          acc[camp.platform] = { spent: 0, revenue: 0, profit: 0 };
        }
        acc[camp.platform].spent += camp.totalSpent;
        acc[camp.platform].revenue += camp.revenue;
        acc[camp.platform].profit += (camp.revenue - camp.totalSpent);
        return acc;
      }, {} as Record<string, { spent: number, revenue: number, profit: number }>);

      const currentSpent = filteredCampaigns.reduce((a, c) => a + c.totalSpent, 0);
      const currentRevenue = filteredCampaigns.reduce((a, c) => a + c.revenue, 0);
      const currentProfit = currentRevenue - currentSpent;
      const currentConversions = filteredCampaigns.reduce((a, c) => a + (c.dailyRecords?.reduce((sum, r) => sum + (r.salesCount || 0), 0) || 0), 0);
      const currentOverallCPA = currentConversions > 0 ? currentSpent / currentConversions : 0;

      const prevSpent = prevCampaigns.reduce((a, c) => a + c.totalSpent, 0);
      const prevRevenue = prevCampaigns.reduce((a, c) => a + c.revenue, 0);
      const prevProfit = prevRevenue - prevSpent;

      const campaignsForAI = filteredCampaigns.map(c => {
        const conversions = c.dailyRecords?.reduce((sum, r) => sum + (r.salesCount || 0), 0) || 0;
        const cpa = conversions > 0 ? c.totalSpent / conversions : 0;
        const budgetUtilization = c.budget > 0 ? (c.totalSpent / c.budget) * 100 : 0;
        return {
          id: c.id,
          name: c.name,
          type: c.type,
          platform: c.platform,
          influencerName: c.influencerName,
          budget: c.budget,
          totalSpent: c.totalSpent,
          budgetUtilization: `${budgetUtilization.toFixed(1)}%`,
          revenue: c.revenue,
          profit: c.revenue - c.totalSpent,
          conversions,
          cpa
        };
      });

      const campaignsWithCPA = campaignsForAI.filter(c => c.conversions > 0).sort((a, b) => a.cpa - b.cpa);
      const top5LowestCPA = campaignsWithCPA.slice(0, 5);
      const top5HighestCPA = campaignsWithCPA.slice(-5).reverse();

      const platforms = Array.from(new Set([...Object.keys(platformSummary), ...Object.keys(prevPlatformSummary)]));
      const newChartData = platforms.map(p => ({
        platform: p,
        currentSpent: platformSummary[p]?.spent || 0,
        currentRevenue: platformSummary[p]?.revenue || 0,
        currentProfit: platformSummary[p]?.profit || 0,
        prevSpent: prevPlatformSummary[p]?.spent || 0,
        prevRevenue: prevPlatformSummary[p]?.revenue || 0,
        prevProfit: prevPlatformSummary[p]?.profit || 0,
      }));
      setChartData(newChartData);

      const prompt = `
        Você é um Cientista de Dados Sênior e Estrategista Chefe de Marketing Digital (CMO) da plataforma Ad Fluence. 
        Sua especialidade é analisar profundamente dados de tráfego pago, influenciadores e tráfego orgânico para maximizar o ROI e escalar operações de vendas.
        
        Analise os seguintes dados operacionais do período selecionado (${currentPeriodStr || 'Todo o período'}) e forneça uma auditoria completa e um plano de ação estratégico.

        **DIRETRIZES OBRIGATÓRIAS:**
        1. **Visão Executiva:** Resumo do cenário atual (lucro, prejuízo, tendências).
        2. **Monitoramento de Orçamento:** Analise o orçamento alocado vs. gasto. Gere alertas proativos para campanhas/plataformas que estão próximas de exceder ou já excederam o orçamento.
        3. **Análise de CPA (Custo por Aquisição):** Avalie a eficiência do investimento. Compare os CPAs com a média geral (R$ ${currentOverallCPA.toFixed(2)}).
        4. **Top 5 CPAs (Obrigatório):** Crie uma seção detalhada listando as 5 campanhas com o CPA mais alto e as 5 com o CPA mais baixo. Compare-as com a média geral e destaque oportunidades de otimização.
        5. **Recomendações de Alocação de Orçamento Granulares:** Em vez de apenas "aumentar" ou "diminuir", sugira **porcentagens específicas de realocação** (ex: "Mover 15% do orçamento da campanha X para a Y") entre plataformas ou campanhas com base em dados históricos e projeções de ROI.
        6. **Sistema de Alertas Visuais (MUITO IMPORTANTE):** Use emojis e formatação para destacar visualmente o desempenho:
           - 🔴 **CRÍTICO:** Prejuízo, CPA muito alto, ou orçamento estourado.
           - 🟡 **ALERTA:** Próximo do limite de orçamento, ROI baixo, ou CPA subindo.
           - 🟢 **EXCELENTE:** ROI alto, CPA baixo, lucro consistente (oportunidade de escala).
           - 💡 **OPORTUNIDADE:** Insights acionáveis.
        7. **Análise de Influenciadores e Plataformas:** Avalie o desempenho individual, destacando os mais lucrativos e os que tiveram prejuízo.
        8. **Comparação de Período:** Compare os resultados do período atual (${currentPeriodStr || 'Atual'}) com o período anterior (${prevPeriodStr || 'N/A'}), identificando crescimento ou queda.

        Dados do Período Atual (${currentPeriodStr || 'Todo o período'}):
        - Custo Total: R$ ${currentSpent}
        - Receita Total: R$ ${currentRevenue}
        - Lucro Total: R$ ${currentProfit}
        - Conversões Totais: ${currentConversions}
        - CPA Médio Geral: R$ ${currentOverallCPA.toFixed(2)}

        Top 5 Campanhas com MENOR CPA (Mais Eficientes):
        ${JSON.stringify(top5LowestCPA, null, 2)}

        Top 5 Campanhas com MAIOR CPA (Menos Eficientes):
        ${JSON.stringify(top5HighestCPA, null, 2)}

        Resumo por Plataforma (Atual):
        ${JSON.stringify(platformSummary, null, 2)}

        Resumo por Influenciador (Atual):
        ${JSON.stringify(influencerSummary, null, 2)}

        Dados do Período Anterior (${prevPeriodStr || 'N/A'}):
        - Custo Total: R$ ${prevSpent}
        - Receita Total: R$ ${prevRevenue}
        - Lucro Total: R$ ${prevProfit}

        Resumo por Plataforma (Anterior):
        ${JSON.stringify(prevPlatformSummary, null, 2)}

        Detalhamento das Campanhas (Atual):
        ${JSON.stringify(campaignsForAI, null, 2)}

        Formate sua resposta em Markdown, usando títulos, listas e negrito. Seja direto, profissional e focado em otimização de ROI, CPA e controle de orçamento.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      setAnalysis(response.text || "Não foi possível gerar a análise.");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Ocorreu um erro ao analisar os dados.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <Bot className="text-emerald-500" size={32} />
            Assistente IA
          </h2>
          <p className="text-neutral-400 mt-1">Análise inteligente das suas operações e recomendações de otimização.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 w-full sm:w-auto">
            <select 
              value={periodType}
              onChange={(e) => setPeriodType(e.target.value as 'monthly' | 'annual')}
              className="bg-transparent text-sm text-white focus:outline-none border-r border-neutral-700 pr-2 mr-2"
            >
              <option value="monthly">Mensal</option>
              <option value="annual">Anual</option>
            </select>
            <Calendar className="text-neutral-500" size={18} />
            {periodType === 'monthly' ? (
              <input 
                type="month" 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-sm text-white focus:outline-none [color-scheme:dark] w-full"
              />
            ) : (
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-transparent text-sm text-white focus:outline-none [color-scheme:dark] w-full"
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            )}
          </div>
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={analyzeData}
            disabled={isLoading || filteredCampaigns.length === 0}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors shadow-lg shadow-emerald-900/20 w-full sm:w-auto"
          >
            {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
            {isLoading ? 'Analisando Dados...' : 'Gerar Análise Completa'}
          </motion.button>
        </div>
      </header>

      {error && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3 text-red-400"
        >
          <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
          <p>{error}</p>
        </motion.div>
      )}

      {!analysis && !isLoading && !error && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-neutral-950 border border-neutral-800 rounded-xl p-12 text-center flex flex-col items-center justify-center min-h-[400px] shadow-xl relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
          <motion.div 
            animate={{ 
              y: [0, -10, 0],
            }}
            transition={{ 
              duration: 4, 
              repeat: Infinity,
              ease: "easeInOut" 
            }}
            className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6 relative z-10"
          >
            <Bot size={40} className="text-emerald-500" />
          </motion.div>
          <h3 className="text-xl font-semibold text-white mb-2 relative z-10">Pronto para analisar seus dados</h3>
          <p className="text-neutral-400 max-w-md mx-auto mb-8 relative z-10">
            Nossa IA analisará todas as suas campanhas de tráfego e influenciadores para encontrar padrões, identificar gargalos e sugerir onde investir seu próximo orçamento.
          </p>
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={analyzeData}
            disabled={filteredCampaigns.length === 0}
            className="px-6 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 relative z-10"
          >
            {filteredCampaigns.length === 0 ? 'Sem dados no período' : 'Começar Análise'}
          </motion.button>
        </motion.div>
      )}

      {analysis && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {filteredCampaigns.length > 0 && (
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-6 shadow-xl">
              <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                <CalendarDays className="text-emerald-500" size={20} />
                Calendário de Campanhas ({periodType === 'monthly' ? 'Mensal' : 'Anual'})
              </h3>
              
              <div className="space-y-4 overflow-x-auto pb-4">
                <div className="min-w-[600px]">
                  <div className="flex justify-between text-xs text-neutral-500 mb-2 pl-36 pr-2">
                    <span>
                      {periodType === 'monthly' 
                        ? new Date(`${selectedMonth}-01T00:00:00`).toLocaleDateString('pt-BR') 
                        : new Date(`${selectedYear}-01-01T00:00:00`).toLocaleDateString('pt-BR')}
                    </span>
                    <span>
                      {periodType === 'monthly' 
                        ? new Date(new Date(`${selectedMonth}-01T00:00:00`).getFullYear(), new Date(`${selectedMonth}-01T00:00:00`).getMonth() + 1, 0).toLocaleDateString('pt-BR') 
                        : new Date(`${selectedYear}-12-31T23:59:59`).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  
                  <div className="space-y-3">
                    {filteredCampaigns.map(c => {
                      const periodStart = periodType === 'monthly' ? new Date(`${selectedMonth}-01T00:00:00`) : new Date(`${selectedYear}-01-01T00:00:00`);
                      const periodEnd = periodType === 'monthly' ? new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 0, 23, 59, 59) : new Date(`${selectedYear}-12-31T23:59:59`);
                      const totalPeriodDuration = periodEnd.getTime() - periodStart.getTime();

                      const campStart = new Date(c.startDate + 'T00:00:00');
                      const campEnd = new Date(c.endDate + 'T23:59:59');

                      const clampedStart = new Date(Math.max(campStart.getTime(), periodStart.getTime()));
                      const clampedEnd = new Date(Math.min(campEnd.getTime(), periodEnd.getTime()));

                      if (clampedStart > clampedEnd) return null;

                      const leftPercent = ((clampedStart.getTime() - periodStart.getTime()) / totalPeriodDuration) * 100;
                      const widthPercent = Math.max(((clampedEnd.getTime() - clampedStart.getTime()) / totalPeriodDuration) * 100, 1);

                      const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
                      const isProfitable = c.revenue >= c.totalSpent;

                      return (
                        <div key={c.id} className="flex items-center gap-4 text-sm group">
                          <div className="w-32 flex-shrink-0 truncate text-neutral-300 font-medium" title={c.name}>
                            {c.name}
                          </div>
                          <div className="flex-1 relative h-10 bg-neutral-900/50 rounded-lg overflow-hidden border border-neutral-800/50">
                            <div 
                              className={`absolute top-0 bottom-0 rounded-lg flex items-center px-3 text-xs font-medium whitespace-nowrap overflow-hidden transition-all duration-300 ${
                                isProfitable 
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 group-hover:bg-emerald-500/30' 
                                  : 'bg-red-500/20 text-red-300 border border-red-500/30 group-hover:bg-red-500/30'
                              }`}
                              style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
                            >
                              <span className="truncate drop-shadow-md">
                                Orç: {formatCurrency(c.budget)} | Ret: {formatCurrency(c.revenue)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {chartData.length > 0 && (
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-6 shadow-xl">
              <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                <BarChart2 className="text-emerald-500" size={20} />
                Comparativo de Plataformas (Atual vs Anterior)
              </h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="h-72">
                  <h4 className="text-sm font-medium text-neutral-400 mb-4 text-center">Receita por Plataforma</h4>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                      <XAxis dataKey="platform" stroke="#888" tick={{fill: '#888', fontSize: 12}} />
                      <YAxis stroke="#888" tick={{fill: '#888', fontSize: 12}} tickFormatter={(value) => `R$${value/1000}k`} />
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: '#171717', borderColor: '#333', color: '#fff', borderRadius: '8px' }}
                        formatter={(value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}
                      />
                      <Legend wrapperStyle={{ paddingTop: '10px' }} />
                      <Bar dataKey="prevRevenue" name="Receita Anterior" fill="#4b5563" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="currentRevenue" name="Receita Atual" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="h-72">
                  <h4 className="text-sm font-medium text-neutral-400 mb-4 text-center">Lucro por Plataforma</h4>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                      <XAxis dataKey="platform" stroke="#888" tick={{fill: '#888', fontSize: 12}} />
                      <YAxis stroke="#888" tick={{fill: '#888', fontSize: 12}} tickFormatter={(value) => `R$${value/1000}k`} />
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: '#171717', borderColor: '#333', color: '#fff', borderRadius: '8px' }}
                        formatter={(value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}
                      />
                      <Legend wrapperStyle={{ paddingTop: '10px' }} />
                      <Bar dataKey="prevProfit" name="Lucro Anterior" fill="#4b5563" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="currentProfit" name="Lucro Atual" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-8 prose prose-invert prose-emerald max-w-none shadow-xl">
            <ReactMarkdown>{analysis}</ReactMarkdown>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
