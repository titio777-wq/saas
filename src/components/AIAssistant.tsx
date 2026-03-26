import React, { useState } from 'react';
import { Campaign, DashboardMetrics } from '../types';
import { Bot, Sparkles, AlertCircle, Loader2 } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import ReactMarkdown from 'react-markdown';

interface AIAssistantProps {
  campaigns: Campaign[];
  metrics: DashboardMetrics;
}

export function AIAssistant({ campaigns, metrics }: AIAssistantProps) {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("Chave da API do Gemini não configurada.");
      }

      const ai = new GoogleGenAI({ apiKey });

      const platformSummary = campaigns.reduce((acc, camp) => {
        if (!acc[camp.platform]) {
          acc[camp.platform] = { spent: 0, revenue: 0, profit: 0 };
        }
        acc[camp.platform].spent += camp.totalSpent;
        acc[camp.platform].revenue += camp.revenue;
        acc[camp.platform].profit += (camp.revenue - camp.totalSpent);
        return acc;
      }, {} as Record<string, { spent: number, revenue: number, profit: number }>);

      const prompt = `
        Você é um assistente financeiro e estrategista de marketing digital especialista em tráfego pago e influenciadores.
        Analise os seguintes dados operacionais e forneça um feedback geral, identificando pontos fortes, prejuízos, e recomendações de onde alocar mais ou menos orçamento.
        
        **MUITO IMPORTANTE:** Forneça insights detalhados sobre o desempenho por plataforma (ex: Facebook, Instagram, TikTok, etc.), comparando o ROI e a lucratividade entre elas. Identifique qual plataforma está trazendo o melhor retorno e qual está dando prejuízo.
        
        Métricas Gerais:
        - Orçamento Total: R$ ${metrics.totalBudget}
        - Custo Total: R$ ${metrics.totalSpent}
        - Receita Total: R$ ${metrics.totalRevenue}
        - Lucro Total: R$ ${metrics.totalProfit}
        - ROI Geral: ${metrics.overallROI.toFixed(2)}%

        Resumo por Plataforma:
        ${JSON.stringify(platformSummary, null, 2)}

        Detalhamento das Campanhas:
        ${JSON.stringify(campaigns, null, 2)}

        Formate sua resposta em Markdown, usando títulos, listas e negrito para destacar informações importantes. Seja direto, profissional e focado em otimização de ROI.
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
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <Bot className="text-emerald-500" size={32} />
            Assistente IA
          </h2>
          <p className="text-neutral-400 mt-1">Análise inteligente das suas operações e recomendações de otimização.</p>
        </div>
        <button 
          onClick={analyzeData}
          disabled={isLoading || campaigns.length === 0}
          className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors shadow-lg shadow-emerald-900/20"
        >
          {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
          {isLoading ? 'Analisando Dados...' : 'Gerar Análise Completa'}
        </button>
      </header>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3 text-red-400">
          <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {!analysis && !isLoading && !error && (
        <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
          <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6">
            <Bot size={40} className="text-emerald-500" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Pronto para analisar seus dados</h3>
          <p className="text-neutral-400 max-w-md mx-auto mb-8">
            Nossa IA analisará todas as suas campanhas de tráfego e influenciadores para encontrar padrões, identificar gargalos e sugerir onde investir seu próximo orçamento.
          </p>
          <button 
            onClick={analyzeData}
            disabled={campaigns.length === 0}
            className="px-6 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {campaigns.length === 0 ? 'Adicione dados primeiro' : 'Começar Análise'}
          </button>
        </div>
      )}

      {analysis && (
        <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-8 prose prose-invert prose-emerald max-w-none">
          <ReactMarkdown>{analysis}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}
