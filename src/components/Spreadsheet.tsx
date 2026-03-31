import React, { useState, useRef } from 'react';
import { Campaign, CampaignType } from '../types';
import { Plus, Edit2, Trash2, Check, X, Upload, Search, Download, Calendar, Filter, Eye, AlertTriangle, Settings, ArrowUp, ArrowDown, MoreVertical, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { CustomField } from '../types';
import { cn } from '../lib/utils';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from '@google/genai';

interface SpreadsheetProps {
  campaigns: Campaign[];
  addCampaign: (campaign: Omit<Campaign, 'id'>) => void;
  updateCampaign: (id: string, updatedFields: Partial<Campaign>) => void;
  deleteCampaign: (id: string) => void;
  addMultipleCampaigns: (campaigns: Omit<Campaign, 'id'>[]) => void;
}

export function Spreadsheet({ campaigns, addCampaign, updateCampaign, deleteCampaign, addMultipleCampaigns }: SpreadsheetProps) {
  const [isAdding, setIsAdding] = useState(() => {
    return localStorage.getItem('adfluence_isAdding') === 'true';
  });
  const [editingId, setEditingId] = useState<string | null>(() => {
    return localStorage.getItem('adfluence_editingId') || null;
  });
  const [editRowData, setEditRowData] = useState<Partial<Campaign>>(() => {
    const saved = localStorage.getItem('adfluence_editRowData');
    return saved ? JSON.parse(saved) : {};
  });
  const [viewingCampaign, setViewingCampaign] = useState<Campaign | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  
  // Filtros com persistência
  const [searchTerm, setSearchTerm] = useState(() => localStorage.getItem('adfluence_searchTerm') || '');
  const [filterStartDate, setFilterStartDate] = useState(() => localStorage.getItem('adfluence_filterStartDate') || '');
  const [filterEndDate, setFilterEndDate] = useState(() => localStorage.getItem('adfluence_filterEndDate') || '');

  // Campos Customizados
  const [customFields, setCustomFields] = useState<CustomField[]>(() => {
    const saved = localStorage.getItem('adfluence_customFields');
    return saved ? JSON.parse(saved) : [];
  });
  const [isCustomFieldsModalOpen, setIsCustomFieldsModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [dailyRecordsCampaignId, setDailyRecordsCampaignId] = useState<string | null>(null);
  const [newDailyRecord, setNewDailyRecord] = useState({ date: new Date().toISOString().split('T')[0], salesCount: 0, revenue: 0, spent: 0 });
  const [exportOption, setExportOption] = useState<'all' | 'filtered' | 'custom'>('filtered');
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<'text'|'number'|'date'>('text');
  const [isImporting, setIsImporting] = useState(false);

  // Paginação e Dropdown
  const [currentPage, setCurrentPage] = useState(1);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const itemsPerPage = 10;

  React.useEffect(() => {
    localStorage.setItem('adfluence_searchTerm', searchTerm);
    localStorage.setItem('adfluence_filterStartDate', filterStartDate);
    localStorage.setItem('adfluence_filterEndDate', filterEndDate);
    setCurrentPage(1);
  }, [searchTerm, filterStartDate, filterEndDate]);

  React.useEffect(() => {
    localStorage.setItem('adfluence_customFields', JSON.stringify(customFields));
  }, [customFields]);

  React.useEffect(() => {
    localStorage.setItem('adfluence_isAdding', String(isAdding));
  }, [isAdding]);

  React.useEffect(() => {
    if (editingId) {
      localStorage.setItem('adfluence_editingId', editingId);
    } else {
      localStorage.removeItem('adfluence_editingId');
    }
  }, [editingId]);

  React.useEffect(() => {
    localStorage.setItem('adfluence_editRowData', JSON.stringify(editRowData));
  }, [editRowData]);

  React.useEffect(() => {
    const handleClickOutside = () => setOpenDropdownId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);
  
  const [newRow, setNewRow] = useState<Partial<Campaign>>(() => {
    const saved = localStorage.getItem('adfluence_newRow');
    if (saved) return JSON.parse(saved);
    return {
      name: '',
      type: 'Traffic',
      platform: '',
      influencerName: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      budget: 0,
      totalSpent: 0,
      revenue: 0,
      status: 'Active'
    };
  });

  React.useEffect(() => {
    localStorage.setItem('adfluence_newRow', JSON.stringify(newRow));
  }, [newRow]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const handleSaveNew = () => {
    if (!newRow.name || !newRow.platform) return;
    addCampaign(newRow as Omit<Campaign, 'id'>);
    setIsAdding(false);
    setIsCampaignModalOpen(false);
    const resetRow: Partial<Campaign> = {
      name: '',
      type: 'Traffic',
      platform: '',
      influencerName: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      budget: 0,
      totalSpent: 0,
      revenue: 0,
      status: 'Active'
    };
    setNewRow(resetRow);
    localStorage.removeItem('adfluence_newRow');
  };

  const startEditing = (campaign: Campaign) => {
    setIsAdding(false);
    setEditingId(campaign.id);
    setEditRowData(campaign);
    setIsCampaignModalOpen(true);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditRowData({});
    setIsCampaignModalOpen(false);
    setIsAdding(false);
    localStorage.removeItem('adfluence_editingId');
    localStorage.removeItem('adfluence_editRowData');
  };

  const saveEditing = () => {
    if (editingId && editRowData.name && editRowData.platform) {
      updateCampaign(editingId, editRowData);
      setEditingId(null);
      setEditRowData({});
      setIsCampaignModalOpen(false);
      localStorage.removeItem('adfluence_editingId');
      localStorage.removeItem('adfluence_editRowData');
    }
  };

  const calculateROI = (spent: number, revenue: number) => {
    if (spent === 0) return 0;
    return ((revenue - spent) / spent) * 100;
  };

  const getProfitColor = (profit: number) => {
    if (profit > 0) return 'text-emerald-500 bg-emerald-500/10';
    if (profit < 0) return 'text-red-500 bg-red-500/10';
    return 'text-yellow-500 bg-yellow-500/10';
  };

  const calculateDailyCost = (spent: number, startDate: string, endDate: string) => {
    if (spent === 0) return '-';
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const days = Math.max(1, diffDays);
    return formatCurrency(spent / days);
  };

  const addCustomField = () => {
    if (!newFieldName.trim()) return;
    const newField: CustomField = {
      id: `cf_${Date.now()}`,
      name: newFieldName.trim(),
      type: newFieldType
    };
    setCustomFields([...customFields, newField]);
    setNewFieldName('');
  };

  const removeCustomField = (id: string) => {
    setCustomFields(customFields.filter(f => f.id !== id));
  };

  const moveCustomField = (index: number, direction: 'up' | 'down') => {
    const newFields = [...customFields];
    if (direction === 'up' && index > 0) {
      [newFields[index - 1], newFields[index]] = [newFields[index], newFields[index - 1]];
      setCustomFields(newFields);
    } else if (direction === 'down' && index < customFields.length - 1) {
      [newFields[index + 1], newFields[index]] = [newFields[index], newFields[index + 1]];
      setCustomFields(newFields);
    }
  };

  const handleCustomDataChange = (dataObj: Partial<Campaign>, setDataObj: (d: Partial<Campaign>) => void, fieldId: string, value: any) => {
    setDataObj({
      ...dataObj,
      customData: {
        ...(dataObj.customData || {}),
        [fieldId]: value
      }
    });
  };

  const parseTextWithGemini = async (text: string) => {
    setIsImporting(true);
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("Chave da API do Gemini não configurada.");
      
      const ai = new GoogleGenAI({ apiKey });
      
      const prompt = `
        Você é um assistente de extração de dados. Vou fornecer um texto não estruturado contendo anotações sobre campanhas de marketing, vendas e operações.
        Extraia as campanhas e retorne APENAS um array JSON de objetos com a seguinte estrutura. Não inclua formatação markdown como \`\`\`json.
        [
          {
            "name": "Nome da Campanha",
            "type": "Traffic" | "Influencer" | "Organic",
            "platform": "Nome da Plataforma (ex: Instagram, Facebook, TikTok)",
            "influencerName": "Nome ou @ do influenciador (se type for Influencer, senão vazio)",
            "startDate": "YYYY-MM-DD",
            "endDate": "YYYY-MM-DD",
            "budget": numero (orçamento),
            "totalSpent": numero (custo total/gasto),
            "revenue": numero (receita/vendas),
            "status": "Active" | "Completed" | "Paused"
          }
        ]
        
        Se alguma data não for especificada, use a data de hoje (${new Date().toISOString().split('T')[0]}).
        Se valores financeiros não forem especificados, use 0.
        
        Texto para analisar:
        ${text}
      `;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                type: { type: Type.STRING },
                platform: { type: Type.STRING },
                influencerName: { type: Type.STRING },
                startDate: { type: Type.STRING },
                endDate: { type: Type.STRING },
                budget: { type: Type.NUMBER },
                totalSpent: { type: Type.NUMBER },
                revenue: { type: Type.NUMBER },
                status: { type: Type.STRING }
              },
              required: ["name", "type", "platform", "startDate", "endDate", "budget", "totalSpent", "revenue", "status"]
            }
          }
        }
      });
      
      const jsonStr = response.text || "[]";
      const importedCampaigns = JSON.parse(jsonStr);
      
      if (importedCampaigns && importedCampaigns.length > 0) {
        addMultipleCampaigns(importedCampaigns);
        alert(`${importedCampaigns.length} campanhas criadas com sucesso a partir das anotações!`);
      } else {
        alert("Nenhuma campanha encontrada no texto.");
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao processar o arquivo de texto com a IA. Verifique o console para mais detalhes.");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.toLowerCase().endsWith('.txt')) {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        const text = evt.target?.result as string;
        await parseTextWithGemini(text);
      };
      reader.readAsText(file);
    } else {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws);
          
          const importedCampaigns = data.map((row: any) => {
            const getVal = (keys: string[]) => {
              const key = Object.keys(row).find(k => keys.includes(k.toLowerCase().trim()));
              return key ? row[key] : undefined;
            };

            return {
              name: getVal(['nome', 'name', 'campanha', 'campaign']) || 'Campanha Importada',
              type: (String(getVal(['tipo', 'type']) || '').toLowerCase().includes('influenc') ? 'Influencer' : 'Traffic') as CampaignType,
              platform: getVal(['plataforma', 'platform', 'canal', 'channel']) || 'Desconhecida',
              influencerName: getVal(['influenciador', 'influencer', '@']) || '',
              startDate: getVal(['data inicio', 'start date', 'inicio', 'start']) || new Date().toISOString().split('T')[0],
              endDate: getVal(['data fim', 'end date', 'fim', 'end']) || new Date().toISOString().split('T')[0],
              budget: Number(getVal(['orçamento', 'budget', 'verba']) || 0),
              totalSpent: Number(getVal(['custo', 'spent', 'gasto', 'total spent']) || 0),
              revenue: Number(getVal(['receita', 'revenue', 'vendas', 'faturamento']) || 0),
              status: 'Active' as const
            };
          });

          addMultipleCampaigns(importedCampaigns);
          alert(`${importedCampaigns.length} campanhas importadas com sucesso!`);
        } catch (error) {
          console.error("Erro ao importar planilha:", error);
          alert("Erro ao ler o arquivo. Certifique-se de que é uma planilha válida.");
        }
        
        if (fileInputRef.current) fileInputRef.current.value = '';
      };
      reader.readAsBinaryString(file);
    }
  };

  const handleExport = () => {
    setIsExportModalOpen(true);
  };

  const executeExport = () => {
    let campaignsToExport = campaigns;

    if (exportOption === 'filtered') {
      campaignsToExport = filteredCampaigns;
    } else if (exportOption === 'custom') {
      campaignsToExport = campaigns.filter(c => {
        let matchesDate = true;
        if (exportStartDate) {
          matchesDate = matchesDate && c.startDate >= exportStartDate;
        }
        if (exportEndDate) {
          matchesDate = matchesDate && c.endDate <= exportEndDate;
        }
        return matchesDate;
      });
    }

    const exportData = campaignsToExport.map(c => {
      const baseData: any = {
        'Nome da Campanha': c.name,
        'Tipo': c.type === 'Traffic' ? 'Tráfego Pago' : 'Influenciador',
        'Plataforma': c.platform,
        'Influenciador': c.influencerName || '-',
        'Data Início': new Date(c.startDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' }),
        'Data Fim': new Date(c.endDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' }),
        'Orçamento (R$)': c.budget,
        'Custo Total (R$)': c.totalSpent,
        'Receita (R$)': c.revenue,
        'Lucro (R$)': c.revenue - c.totalSpent,
        'ROI (%)': calculateROI(c.totalSpent, c.revenue).toFixed(2)
      };
      
      customFields.forEach(cf => {
        baseData[cf.name] = c.customData?.[cf.id] || '';
      });
      
      return baseData;
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Operações");
    XLSX.writeFile(wb, "AdFluence_Relatorio.xlsx");
    setIsExportModalOpen(false);
  };

  // Filtragem
  const filteredCampaigns = campaigns.filter(c => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      c.name.toLowerCase().includes(searchLower) ||
      c.platform.toLowerCase().includes(searchLower) ||
      (c.influencerName && c.influencerName.toLowerCase().includes(searchLower));
    
    let matchesDate = true;
    if (filterStartDate) {
      matchesDate = matchesDate && c.startDate >= filterStartDate;
    }
    if (filterEndDate) {
      matchesDate = matchesDate && c.endDate <= filterEndDate;
    }

    return matchesSearch && matchesDate;
  });

  const totalPages = Math.max(1, Math.ceil(filteredCampaigns.length / itemsPerPage));
  const paginatedCampaigns = filteredCampaigns.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleAddDailyRecord = () => {
    if (!dailyRecordsCampaignId) return;
    const campaign = campaigns.find(c => c.id === dailyRecordsCampaignId);
    if (!campaign) return;

    const recordId = `dr_${Date.now()}`;
    const newRecord = { ...newDailyRecord, id: recordId };
    
    const updatedRecords = [...(campaign.dailyRecords || []), newRecord];
    
    // Auto-calculate totals based on daily records
    const newTotalSpent = updatedRecords.reduce((sum, r) => sum + Number(r.spent), 0);
    const newTotalRevenue = updatedRecords.reduce((sum, r) => sum + Number(r.revenue), 0);

    updateCampaign(dailyRecordsCampaignId, {
      dailyRecords: updatedRecords,
      totalSpent: newTotalSpent,
      revenue: newTotalRevenue
    });

    setNewDailyRecord({ date: new Date().toISOString().split('T')[0], salesCount: 0, revenue: 0, spent: 0 });
  };

  const handleDeleteDailyRecord = (recordId: string) => {
    if (!dailyRecordsCampaignId) return;
    const campaign = campaigns.find(c => c.id === dailyRecordsCampaignId);
    if (!campaign || !campaign.dailyRecords) return;

    const updatedRecords = campaign.dailyRecords.filter(r => r.id !== recordId);
    
    const newTotalSpent = updatedRecords.reduce((sum, r) => sum + Number(r.spent), 0);
    const newTotalRevenue = updatedRecords.reduce((sum, r) => sum + Number(r.revenue), 0);

    updateCampaign(dailyRecordsCampaignId, {
      dailyRecords: updatedRecords,
      totalSpent: newTotalSpent,
      revenue: newTotalRevenue
    });
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Operações (Planilha)</h2>
          <p className="text-neutral-400 mt-1 text-sm sm:text-base">Gerencie suas campanhas de tráfego e influenciadores.</p>
        </div>
      </header>

      {/* Toolbar: Filtros e Ações */}
      <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3 flex flex-col lg:flex-row gap-3 justify-between items-center shadow-sm">
        <div className="flex flex-col sm:flex-row w-full lg:w-auto gap-3 flex-1">
          {/* Busca */}
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
            <input 
              type="text"
              placeholder="Buscar campanha..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-9 pr-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
            />
          </div>
          
          {/* Filtro de Data */}
          <div className="flex flex-col sm:flex-row items-center gap-2 bg-neutral-900 border border-neutral-800 rounded-lg px-2 py-1 w-full sm:w-auto relative z-10">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="text-neutral-500 shrink-0" size={14} />
              <input 
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                className="bg-transparent text-xs text-neutral-300 focus:outline-none [color-scheme:dark] w-full sm:w-auto"
                title="Data Inicial"
              />
            </div>
            <span className="text-neutral-600 hidden sm:inline text-xs">-</span>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input 
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className="bg-transparent text-xs text-neutral-300 focus:outline-none [color-scheme:dark] w-full sm:w-auto"
                title="Data Final"
              />
              {(filterStartDate || filterEndDate) && (
                <button 
                  onClick={() => { setFilterStartDate(''); setFilterEndDate(''); }}
                  className="ml-auto sm:ml-1 text-neutral-500 hover:text-red-400 shrink-0 transition-colors"
                  title="Limpar datas"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap w-full lg:w-auto items-center gap-2 justify-end">
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept=".xlsx, .xls, .csv, .txt" 
            onChange={handleFileUpload}
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors"
          >
            {isImporting ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            <span className="hidden sm:inline">{isImporting ? 'Lendo...' : 'Importar'}</span>
          </button>
          <button 
            onClick={handleExport}
            disabled={filteredCampaigns.length === 0}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-xs font-medium transition-all shadow-lg shadow-blue-900/20"
          >
            <Download size={14} />
            <span className="hidden sm:inline">Exportar</span>
          </button>
          <button 
            onClick={() => setIsCustomFieldsModalOpen(true)}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-white rounded-lg text-xs font-medium transition-colors"
          >
            <Settings size={14} />
            <span className="hidden sm:inline">Campos</span>
          </button>
          <button 
            onClick={() => { setIsAdding(true); setIsCampaignModalOpen(true); }}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition-colors shadow-lg shadow-emerald-900/20"
          >
            <Plus size={14} />
            <span>Nova</span>
          </button>
        </div>
      </div>

      <div className="bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-neutral-300 whitespace-nowrap">
            <thead className="bg-neutral-900/80 text-xs uppercase tracking-wider text-neutral-400 border-b border-neutral-800">
              <tr>
                <th className="px-3 py-3 font-semibold">Nome / Tipo</th>
                <th className="px-3 py-3 font-semibold">Plataforma / Influenciador</th>
                <th className="px-3 py-3 font-semibold">Período</th>
                <th className="px-3 py-3 font-semibold text-right">Orçamento</th>
                <th className="px-3 py-3 font-semibold text-right">Custo Total</th>
                <th className="px-3 py-3 font-semibold text-right">Custo Diário Médio</th>
                <th className="px-3 py-3 font-semibold text-right">Receita</th>
                <th className="px-3 py-3 font-semibold text-right">Lucro</th>
                <th className="px-3 py-3 font-semibold text-right">ROI</th>
                {customFields.map(cf => (
                  <th key={cf.id} className="px-3 py-3 font-semibold">{cf.name}</th>
                ))}
                <th className="px-3 py-3 font-semibold text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/50">
              <AnimatePresence>
                {paginatedCampaigns.map((campaign, index) => {
                  const profit = campaign.revenue - campaign.totalSpent;
                  const roi = calculateROI(campaign.totalSpent, campaign.revenue);
                  const budgetUsedPercentage = campaign.budget > 0 ? (campaign.totalSpent / campaign.budget) * 100 : 0;
                  const isOverBudget = budgetUsedPercentage >= 80;
                  
                  return (
                    <motion.tr 
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2, delay: index * 0.03 }}
                      key={campaign.id} 
                      className={cn("hover:bg-neutral-800/30 transition-colors group", isOverBudget ? "bg-red-900/10" : "")}
                    >
                      <td className="px-3 py-3">
                        <div className="font-semibold text-white flex items-center gap-2">
                          {campaign.name}
                          {isOverBudget && (
                            <div title={`Atenção: Custo atingiu ${budgetUsedPercentage.toFixed(1)}% do orçamento`}>
                              <AlertTriangle size={14} className="text-amber-500" />
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-neutral-500 mt-0.5 flex items-center gap-1">
                          {campaign.type === 'Traffic' ? '🚀 Tráfego Pago' : campaign.type === 'Influencer' ? '🌟 Influenciador' : '🌱 Orgânico'}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="text-neutral-200">{campaign.platform}</div>
                        {campaign.type === 'Influencer' && (
                          <div className="text-xs text-blue-400 mt-0.5 font-medium">{campaign.influencerName}</div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-xs">
                        <div className="flex items-center gap-1.5 text-neutral-300">
                          <Calendar size={12} className="text-neutral-500" />
                          {new Date(campaign.startDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                        </div>
                        <div className="text-neutral-500 mt-0.5 pl-4">
                          até {new Date(campaign.endDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-col items-end">
                          <span className="text-neutral-400">{formatCurrency(campaign.budget)}</span>
                          {campaign.budget > 0 && (
                            <div className="w-24 bg-neutral-800 rounded-full h-1.5 mt-1.5 overflow-hidden" title={`${budgetUsedPercentage.toFixed(1)}% utilizado`}>
                              <div
                                className={cn("h-full rounded-full transition-all duration-500", budgetUsedPercentage >= 100 ? 'bg-red-500' : budgetUsedPercentage >= 80 ? 'bg-yellow-500' : 'bg-emerald-500')}
                                style={{ width: `${Math.min(budgetUsedPercentage, 100)}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right text-neutral-300 font-medium">{formatCurrency(campaign.totalSpent)}</td>
                      <td className="px-3 py-3 text-right text-neutral-400">{calculateDailyCost(campaign.totalSpent, campaign.startDate, campaign.endDate)}</td>
                      <td className="px-3 py-3 text-right text-white font-semibold">{formatCurrency(campaign.revenue)}</td>
                      <td className="px-3 py-3 text-right">
                        <span className={cn("px-2 py-1 rounded-md font-semibold text-xs border", 
                          profit > 0 ? "border-emerald-500/20 text-emerald-400 bg-emerald-500/10" : 
                          profit < 0 ? "border-red-500/20 text-red-400 bg-red-500/10" : 
                          "border-yellow-500/20 text-yellow-400 bg-yellow-500/10"
                        )}>
                          {formatCurrency(profit)}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span className={cn("px-2 py-1 rounded-md font-semibold text-xs border", 
                          roi > 0 ? "border-emerald-500/20 text-emerald-400 bg-emerald-500/10" : 
                          roi < 0 ? "border-red-500/20 text-red-400 bg-red-500/10" : 
                          "border-yellow-500/20 text-yellow-400 bg-yellow-500/10"
                        )}>
                          {roi.toFixed(2)}%
                        </span>
                      </td>
                      {customFields.map(cf => (
                        <td key={cf.id} className="px-3 py-3 text-neutral-300">
                          {cf.type === 'date' && campaign.customData?.[cf.id] 
                            ? new Date(campaign.customData[cf.id]).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
                            : campaign.customData?.[cf.id] || '-'}
                        </td>
                      ))}
                      <td className="px-3 py-3 text-center relative">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenDropdownId(openDropdownId === campaign.id ? null : campaign.id);
                          }}
                          className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-md transition-colors"
                        >
                          <MoreVertical size={18} />
                        </button>
                        
                        <AnimatePresence>
                          {openDropdownId === campaign.id && (
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.95, y: -10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: -10 }}
                              transition={{ duration: 0.15 }}
                              className="absolute right-8 top-10 w-40 bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl z-50 py-1 overflow-hidden"
                            >
                              <button
                                onClick={(e) => { e.stopPropagation(); setViewingCampaign(campaign); setOpenDropdownId(null); }}
                                className="w-full text-left px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-800 hover:text-emerald-400 flex items-center gap-2"
                              >
                                <Eye size={14} /> Detalhes
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setDailyRecordsCampaignId(campaign.id); setOpenDropdownId(null); }}
                                className="w-full text-left px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-800 hover:text-purple-400 flex items-center gap-2"
                              >
                                <Calendar size={14} /> Lançamentos Diários
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); startEditing(campaign); setOpenDropdownId(null); }}
                                className="w-full text-left px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-800 hover:text-blue-400 flex items-center gap-2"
                              >
                                <Edit2 size={14} /> Editar
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); deleteCampaign(campaign.id); setOpenDropdownId(null); }}
                                className="w-full text-left px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-800 hover:text-red-400 flex items-center gap-2"
                              >
                                <Trash2 size={14} /> Excluir
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
              
              {filteredCampaigns.length === 0 && !isAdding && (
                <tr>
                  <td colSpan={10 + customFields.length} className="px-3 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-neutral-500">
                      <Search size={32} className="mb-3 opacity-20" />
                      <p className="text-base font-medium text-neutral-400">Nenhuma operação encontrada</p>
                      <p className="text-sm mt-1">Tente ajustar os filtros ou adicione uma nova operação.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="p-4 border-t border-neutral-800 bg-neutral-900/50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-sm text-neutral-500">
              Mostrando {(currentPage - 1) * itemsPerPage + 1} a {Math.min(currentPage * itemsPerPage, filteredCampaigns.length)} de {filteredCampaigns.length} operações
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-md bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white disabled:opacity-50 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm text-neutral-300 font-medium px-3 py-1 bg-neutral-900 border border-neutral-800 rounded-md">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-md bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white disabled:opacity-50 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {viewingCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-neutral-800">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Eye className="text-emerald-500" />
                Detalhes da Campanha
              </h3>
              <button 
                onClick={() => setViewingCampaign(null)}
                className="text-neutral-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-neutral-800"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-neutral-500 mb-1">Nome da Campanha</p>
                    <p className="text-lg font-semibold text-white">{viewingCampaign.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-500 mb-1">Tipo</p>
                    <p className="text-white flex items-center gap-2">
                      {viewingCampaign.type === 'Traffic' ? '🚀 Tráfego Pago' : viewingCampaign.type === 'Influencer' ? '🌟 Influenciador' : '🌱 Orgânico'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-500 mb-1">Plataforma</p>
                    <p className="text-white">{viewingCampaign.platform}</p>
                  </div>
                  {viewingCampaign.type === 'Influencer' && (
                    <div>
                      <p className="text-sm text-neutral-500 mb-1">Influenciador</p>
                      <p className="text-blue-400 font-medium">{viewingCampaign.influencerName}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-neutral-500 mb-1">Status</p>
                    <span className="px-2.5 py-1 rounded-md font-medium text-xs border border-emerald-500/20 text-emerald-400 bg-emerald-500/10 inline-block">
                      {viewingCampaign.status === 'Active' ? 'Ativa' : 'Inativa'}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-neutral-500 mb-1">Período</p>
                    <p className="text-white">
                      {new Date(viewingCampaign.startDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })} 
                      {' até '} 
                      {new Date(viewingCampaign.endDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-500 mb-1">Orçamento</p>
                    <p className="text-white">{formatCurrency(viewingCampaign.budget)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-500 mb-1">Custo Total</p>
                    <p className="text-white">{formatCurrency(viewingCampaign.totalSpent)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-500 mb-1">Custo Diário Médio</p>
                    <p className="text-white">{calculateDailyCost(viewingCampaign.totalSpent, viewingCampaign.startDate, viewingCampaign.endDate)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-500 mb-1">Receita</p>
                    <p className="text-emerald-400 font-semibold">{formatCurrency(viewingCampaign.revenue)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-500 mb-1">Lucro</p>
                    <p className={cn("font-semibold", (viewingCampaign.revenue - viewingCampaign.totalSpent) >= 0 ? "text-emerald-400" : "text-red-400")}>
                      {formatCurrency(viewingCampaign.revenue - viewingCampaign.totalSpent)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-500 mb-1">ROI</p>
                    <p className={cn("font-semibold", calculateROI(viewingCampaign.totalSpent, viewingCampaign.revenue) >= 0 ? "text-emerald-400" : "text-red-400")}>
                      {calculateROI(viewingCampaign.totalSpent, viewingCampaign.revenue).toFixed(2)}%
                    </p>
                  </div>
                  {customFields.map(cf => (
                    <div key={cf.id}>
                      <p className="text-sm text-neutral-500 mb-1">{cf.name}</p>
                      <p className="text-white">
                        {cf.type === 'date' && viewingCampaign.customData?.[cf.id] 
                          ? new Date(viewingCampaign.customData[cf.id]).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
                          : viewingCampaign.customData?.[cf.id] || '-'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-neutral-800 bg-neutral-900/50 flex justify-end">
              <button 
                onClick={() => setViewingCampaign(null)}
                className="px-6 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg font-medium transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Campos Customizados */}
      <AnimatePresence>
        {isCustomFieldsModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col"
            >
              <div className="flex justify-between items-center p-6 border-b border-neutral-800">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Settings className="text-emerald-500" />
                  Campos Customizados
                </h3>
                <button 
                  onClick={() => setIsCustomFieldsModalOpen(false)}
                  className="text-neutral-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-neutral-800"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[60vh] space-y-4">
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Nome do campo" 
                    className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    value={newFieldName}
                    onChange={e => setNewFieldName(e.target.value)}
                  />
                  <select 
                    className="bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    value={newFieldType}
                    onChange={e => setNewFieldType(e.target.value as 'text'|'number'|'date')}
                  >
                    <option value="text">Texto</option>
                    <option value="number">Número</option>
                    <option value="date">Data</option>
                  </select>
                  <button 
                    onClick={addCustomField}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
                  >
                    <Plus size={18} />
                  </button>
                </div>
                
                <div className="space-y-2 mt-4">
                  {customFields.length === 0 ? (
                    <p className="text-neutral-500 text-sm text-center py-4">Nenhum campo customizado adicionado.</p>
                  ) : (
                    customFields.map((cf, index) => (
                      <div key={cf.id} className="flex items-center justify-between bg-neutral-950 border border-neutral-800 p-3 rounded-lg">
                        <div className="flex-1 mr-4">
                          <input 
                            type="text"
                            className="bg-transparent border-b border-transparent hover:border-neutral-700 focus:border-emerald-500 focus:outline-none text-white text-sm font-medium w-full transition-colors"
                            value={cf.name}
                            onChange={(e) => {
                              const newFields = [...customFields];
                              newFields[index].name = e.target.value;
                              setCustomFields(newFields);
                            }}
                          />
                          <p className="text-neutral-500 text-xs mt-1">
                            {cf.type === 'text' ? 'Texto' : cf.type === 'number' ? 'Número' : 'Data'}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => moveCustomField(index, 'up')} disabled={index === 0} className="p-1.5 text-neutral-400 hover:text-white disabled:opacity-30"><ArrowUp size={16} /></button>
                          <button onClick={() => moveCustomField(index, 'down')} disabled={index === customFields.length - 1} className="p-1.5 text-neutral-400 hover:text-white disabled:opacity-30"><ArrowDown size={16} /></button>
                          <button onClick={() => removeCustomField(cf.id)} className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-md ml-1"><Trash2 size={16} /></button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Exportação */}
      <AnimatePresence>
        {isExportModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col"
            >
              <div className="flex justify-between items-center p-6 border-b border-neutral-800">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Download className="text-blue-500" />
                  Exportar Dados
                </h3>
                <button 
                  onClick={() => setIsExportModalOpen(false)}
                  className="text-neutral-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-neutral-800"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-3 rounded-lg border border-neutral-800 bg-neutral-950/50 cursor-pointer hover:bg-neutral-800 transition-colors">
                    <input 
                      type="radio" 
                      name="exportOption" 
                      value="all" 
                      checked={exportOption === 'all'} 
                      onChange={() => setExportOption('all')}
                      className="text-blue-500 focus:ring-blue-500 bg-neutral-900 border-neutral-700"
                    />
                    <div>
                      <p className="text-sm font-medium text-white">Todas as campanhas</p>
                      <p className="text-xs text-neutral-500">Exporta todo o histórico de operações.</p>
                    </div>
                  </label>
                  
                  <label className="flex items-center gap-3 p-3 rounded-lg border border-neutral-800 bg-neutral-950/50 cursor-pointer hover:bg-neutral-800 transition-colors">
                    <input 
                      type="radio" 
                      name="exportOption" 
                      value="filtered" 
                      checked={exportOption === 'filtered'} 
                      onChange={() => setExportOption('filtered')}
                      className="text-blue-500 focus:ring-blue-500 bg-neutral-900 border-neutral-700"
                    />
                    <div>
                      <p className="text-sm font-medium text-white">Campanhas filtradas</p>
                      <p className="text-xs text-neutral-500">Exporta apenas o que está visível na tabela atual.</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 rounded-lg border border-neutral-800 bg-neutral-950/50 cursor-pointer hover:bg-neutral-800 transition-colors">
                    <input 
                      type="radio" 
                      name="exportOption" 
                      value="custom" 
                      checked={exportOption === 'custom'} 
                      onChange={() => setExportOption('custom')}
                      className="text-blue-500 focus:ring-blue-500 bg-neutral-900 border-neutral-700 mt-1"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">Período específico</p>
                      <p className="text-xs text-neutral-500 mb-3">Escolha um intervalo de datas.</p>
                      
                      {exportOption === 'custom' && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-neutral-400 mb-1">Data Inicial</label>
                            <input 
                              type="date"
                              value={exportStartDate}
                              onChange={(e) => setExportStartDate(e.target.value)}
                              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 [color-scheme:dark]"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-neutral-400 mb-1">Data Final</label>
                            <input 
                              type="date"
                              value={exportEndDate}
                              onChange={(e) => setExportEndDate(e.target.value)}
                              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 [color-scheme:dark]"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-neutral-800">
                  <button 
                    onClick={() => setIsExportModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-neutral-300 hover:text-white transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={executeExport}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-sm font-medium transition-all shadow-lg shadow-blue-900/20 flex items-center gap-2"
                  >
                    <Download size={16} />
                    Exportar Planilha
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Adição/Edição de Campanha */}
      <AnimatePresence>
        {isCampaignModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col my-8"
            >
              <div className="flex justify-between items-center p-6 border-b border-neutral-800 bg-neutral-900/50 sticky top-0 z-10">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  {isAdding ? <Plus className="text-emerald-500" /> : <Edit2 className="text-blue-500" />}
                  {isAdding ? 'Nova Campanha' : 'Editar Campanha'}
                </h3>
                <button 
                  onClick={cancelEditing}
                  className="text-neutral-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-neutral-800"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 space-y-6 overflow-y-auto">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-300">Nome da Campanha</label>
                    <input 
                      type="text" 
                      placeholder="Ex: Black Friday 2026"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                      value={isAdding ? newRow.name : editRowData.name || ''}
                      onChange={e => isAdding ? setNewRow({...newRow, name: e.target.value}) : setEditRowData({...editRowData, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-300">Tipo</label>
                    <select 
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all cursor-pointer"
                      value={isAdding ? newRow.type : editRowData.type || 'Traffic'}
                      onChange={e => isAdding ? setNewRow({...newRow, type: e.target.value as CampaignType}) : setEditRowData({...editRowData, type: e.target.value as CampaignType})}
                    >
                      <option value="Traffic">🚀 Tráfego Pago</option>
                      <option value="Influencer">🌟 Influenciador</option>
                      <option value="Organic">🌱 Orgânico</option>
                    </select>
                  </div>
                </div>

                {/* Platform & Influencer */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-300">Plataforma</label>
                    <input 
                      type="text" 
                      placeholder="Ex: Meta Ads, TikTok"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                      value={isAdding ? newRow.platform : editRowData.platform || ''}
                      onChange={e => isAdding ? setNewRow({...newRow, platform: e.target.value}) : setEditRowData({...editRowData, platform: e.target.value})}
                    />
                  </div>
                  {(isAdding ? newRow.type : editRowData.type) === 'Influencer' && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-neutral-300">@ do Influenciador</label>
                      <input 
                        type="text" 
                        placeholder="@arroba"
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                        value={isAdding ? newRow.influencerName : editRowData.influencerName || ''}
                        onChange={e => isAdding ? setNewRow({...newRow, influencerName: e.target.value}) : setEditRowData({...editRowData, influencerName: e.target.value})}
                      />
                    </div>
                  )}
                </div>

                {/* Dates */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 relative z-10">
                    <label className="text-sm font-medium text-neutral-300">Data de Início</label>
                    <input 
                      type="date" 
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all [color-scheme:dark]"
                      value={isAdding ? newRow.startDate : editRowData.startDate || ''}
                      onChange={e => isAdding ? setNewRow({...newRow, startDate: e.target.value}) : setEditRowData({...editRowData, startDate: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2 relative z-10">
                    <label className="text-sm font-medium text-neutral-300">Data de Fim</label>
                    <input 
                      type="date" 
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all [color-scheme:dark]"
                      value={isAdding ? newRow.endDate : editRowData.endDate || ''}
                      onChange={e => isAdding ? setNewRow({...newRow, endDate: e.target.value}) : setEditRowData({...editRowData, endDate: e.target.value})}
                    />
                  </div>
                </div>

                {/* Financials */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-300">Orçamento (R$)</label>
                    <input 
                      type="number" 
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                      value={isAdding ? newRow.budget : editRowData.budget || 0}
                      onChange={e => isAdding ? setNewRow({...newRow, budget: Number(e.target.value)}) : setEditRowData({...editRowData, budget: Number(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-300">Custo Total (R$)</label>
                    <input 
                      type="number" 
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                      value={isAdding ? newRow.totalSpent : editRowData.totalSpent || 0}
                      onChange={e => isAdding ? setNewRow({...newRow, totalSpent: Number(e.target.value)}) : setEditRowData({...editRowData, totalSpent: Number(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-300">Receita (R$)</label>
                    <input 
                      type="number" 
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                      value={isAdding ? newRow.revenue : editRowData.revenue || 0}
                      onChange={e => isAdding ? setNewRow({...newRow, revenue: Number(e.target.value)}) : setEditRowData({...editRowData, revenue: Number(e.target.value)})}
                    />
                  </div>
                </div>

                {/* Custom Fields */}
                {customFields.length > 0 && (
                  <div className="pt-4 border-t border-neutral-800">
                    <h4 className="text-sm font-semibold text-neutral-400 mb-4 uppercase tracking-wider">Campos Customizados</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {customFields.map(cf => (
                        <div key={cf.id} className="space-y-2">
                          <label className="text-sm font-medium text-neutral-300">{cf.name}</label>
                          <input 
                            type={cf.type} 
                            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all [color-scheme:dark]"
                            value={isAdding ? (newRow.customData?.[cf.id] || '') : (editRowData.customData?.[cf.id] || '')}
                            onChange={e => {
                              const val = cf.type === 'number' ? Number(e.target.value) : e.target.value;
                              if (isAdding) {
                                handleCustomDataChange(newRow, setNewRow, cf.id, val);
                              } else {
                                handleCustomDataChange(editRowData, setEditRowData, cf.id, val);
                              }
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="p-6 border-t border-neutral-800 bg-neutral-900/50 flex justify-end gap-3 sticky bottom-0 z-10">
                <button 
                  onClick={cancelEditing}
                  className="px-5 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={isAdding ? handleSaveNew : saveEditing}
                  disabled={isAdding ? (!newRow.name || !newRow.platform) : (!editRowData.name || !editRowData.platform)}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors shadow-lg shadow-emerald-900/20 flex items-center gap-2"
                >
                  <Check size={18} />
                  {isAdding ? 'Salvar Campanha' : 'Atualizar Campanha'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Lançamentos Diários */}
      <AnimatePresence>
        {dailyRecordsCampaignId && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col my-8"
            >
              <div className="flex justify-between items-center p-6 border-b border-neutral-800 bg-neutral-900/50 sticky top-0 z-10">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Calendar className="text-purple-500" />
                  Lançamentos Diários - {campaigns.find(c => c.id === dailyRecordsCampaignId)?.name}
                </h3>
                <button 
                  onClick={() => setDailyRecordsCampaignId(null)}
                  className="text-neutral-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-neutral-800"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh]">
                <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4">
                  <h4 className="text-sm font-medium text-neutral-300 mb-3">Novo Lançamento</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                    <div className="sm:col-span-1">
                      <label className="block text-xs text-neutral-500 mb-1">Data</label>
                      <input 
                        type="date" 
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 [color-scheme:dark]"
                        value={newDailyRecord.date}
                        onChange={e => setNewDailyRecord({...newDailyRecord, date: e.target.value})}
                      />
                    </div>
                    <div className="sm:col-span-1">
                      <label className="block text-xs text-neutral-500 mb-1">Qtd. Vendas</label>
                      <input 
                        type="number" 
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                        value={newDailyRecord.salesCount}
                        onChange={e => setNewDailyRecord({...newDailyRecord, salesCount: Number(e.target.value)})}
                      />
                    </div>
                    <div className="sm:col-span-1">
                      <label className="block text-xs text-neutral-500 mb-1">Valor Vendas (R$)</label>
                      <input 
                        type="number" 
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                        value={newDailyRecord.revenue}
                        onChange={e => setNewDailyRecord({...newDailyRecord, revenue: Number(e.target.value)})}
                      />
                    </div>
                    <div className="sm:col-span-1">
                      <label className="block text-xs text-neutral-500 mb-1">Custo (R$)</label>
                      <input 
                        type="number" 
                        className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                        value={newDailyRecord.spent}
                        onChange={e => setNewDailyRecord({...newDailyRecord, spent: Number(e.target.value)})}
                      />
                    </div>
                    <div className="sm:col-span-1 flex items-end">
                      <button 
                        onClick={handleAddDailyRecord}
                        className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        <Plus size={16} /> Adicionar
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-neutral-300 mb-3">Histórico de Lançamentos</h4>
                  <div className="bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-sm text-neutral-300">
                      <thead className="bg-neutral-900/80 text-xs uppercase tracking-wider text-neutral-400 border-b border-neutral-800">
                        <tr>
                          <th className="px-4 py-3 font-semibold">Data</th>
                          <th className="px-4 py-3 font-semibold text-right">Qtd. Vendas</th>
                          <th className="px-4 py-3 font-semibold text-right">Valor Vendas</th>
                          <th className="px-4 py-3 font-semibold text-right">Custo</th>
                          <th className="px-4 py-3 font-semibold text-right">Lucro</th>
                          <th className="px-4 py-3 font-semibold text-center">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-800/50">
                        {campaigns.find(c => c.id === dailyRecordsCampaignId)?.dailyRecords?.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(record => {
                          const profit = record.revenue - record.spent;
                          return (
                            <tr key={record.id} className="hover:bg-neutral-800/30 transition-colors">
                              <td className="px-4 py-3">{new Date(record.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                              <td className="px-4 py-3 text-right">{record.salesCount}</td>
                              <td className="px-4 py-3 text-right text-emerald-400 font-medium">{formatCurrency(record.revenue)}</td>
                              <td className="px-4 py-3 text-right text-neutral-400">{formatCurrency(record.spent)}</td>
                              <td className="px-4 py-3 text-right">
                                <span className={cn("px-2 py-1 rounded-md font-semibold text-xs border", 
                                  profit > 0 ? "border-emerald-500/20 text-emerald-400 bg-emerald-500/10" : 
                                  profit < 0 ? "border-red-500/20 text-red-400 bg-red-500/10" : 
                                  "border-yellow-500/20 text-yellow-400 bg-yellow-500/10"
                                )}>
                                  {formatCurrency(profit)}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <button 
                                  onClick={() => handleDeleteDailyRecord(record.id)}
                                  className="p-1.5 text-neutral-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors inline-flex"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                        {(!campaigns.find(c => c.id === dailyRecordsCampaignId)?.dailyRecords || campaigns.find(c => c.id === dailyRecordsCampaignId)?.dailyRecords?.length === 0) && (
                          <tr>
                            <td colSpan={6} className="px-4 py-8 text-center text-neutral-500">
                              Nenhum lançamento diário registrado.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              
              <div className="p-6 border-t border-neutral-800 bg-neutral-900/50 flex justify-end">
                <button 
                  onClick={() => setDailyRecordsCampaignId(null)}
                  className="px-6 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg font-medium transition-colors"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
