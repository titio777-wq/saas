import React, { useState, useRef } from 'react';
import { Campaign, CampaignType } from '../types';
import { Plus, Edit2, Trash2, Check, X, Upload, Search, Download, Calendar, Filter, Eye, AlertTriangle, Settings, ArrowUp, ArrowDown } from 'lucide-react';
import { CustomField } from '../types';
import { cn } from '../lib/utils';
import * as XLSX from 'xlsx';

interface SpreadsheetProps {
  campaigns: Campaign[];
  addCampaign: (campaign: Omit<Campaign, 'id'>) => void;
  updateCampaign: (id: string, updatedFields: Partial<Campaign>) => void;
  deleteCampaign: (id: string) => void;
  addMultipleCampaigns: (campaigns: Omit<Campaign, 'id'>[]) => void;
}

export function Spreadsheet({ campaigns, addCampaign, updateCampaign, deleteCampaign, addMultipleCampaigns }: SpreadsheetProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRowData, setEditRowData] = useState<Partial<Campaign>>({});
  const [viewingCampaign, setViewingCampaign] = useState<Campaign | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<'text'|'number'|'date'>('text');

  React.useEffect(() => {
    localStorage.setItem('adfluence_searchTerm', searchTerm);
    localStorage.setItem('adfluence_filterStartDate', filterStartDate);
    localStorage.setItem('adfluence_filterEndDate', filterEndDate);
  }, [searchTerm, filterStartDate, filterEndDate]);

  React.useEffect(() => {
    localStorage.setItem('adfluence_customFields', JSON.stringify(customFields));
  }, [customFields]);
  
  const [newRow, setNewRow] = useState<Partial<Campaign>>({
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
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const handleSaveNew = () => {
    if (!newRow.name || !newRow.platform) return;
    addCampaign(newRow as Omit<Campaign, 'id'>);
    setIsAdding(false);
    setNewRow({
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
    });
  };

  const startEditing = (campaign: Campaign) => {
    setEditingId(campaign.id);
    setEditRowData(campaign);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditRowData({});
  };

  const saveEditing = () => {
    if (editingId && editRowData.name && editRowData.platform) {
      updateCampaign(editingId, editRowData);
      setEditingId(null);
      setEditRowData({});
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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
  };

  const handleExport = () => {
    const exportData = filteredCampaigns.map(c => {
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

  // Componente reutilizável para os inputs de edição/adição
  const renderEditRow = (data: Partial<Campaign>, setData: (d: Partial<Campaign>) => void, isNew: boolean) => (
    <>
      <td className="px-4 py-3 align-top">
        <input 
          type="text" 
          placeholder="Nome da Campanha"
          className="w-full min-w-[180px] bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-white mb-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
          value={data.name || ''}
          onChange={e => setData({...data, name: e.target.value})}
        />
        <div className="relative">
          <select 
            className="w-full appearance-none bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all cursor-pointer"
            value={data.type || 'Traffic'}
            onChange={e => setData({...data, type: e.target.value as CampaignType})}
          >
            <option value="Traffic">🚀 Tráfego Pago</option>
            <option value="Influencer">🌟 Influenciador</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-neutral-400">
            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 align-top">
        <input 
          type="text" 
          placeholder="Plataforma (ex: Meta Ads)"
          className="w-full min-w-[160px] bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-white mb-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
          value={data.platform || ''}
          onChange={e => setData({...data, platform: e.target.value})}
        />
        {data.type === 'Influencer' && (
          <input 
            type="text" 
            placeholder="@arroba"
            className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
            value={data.influencerName || ''}
            onChange={e => setData({...data, influencerName: e.target.value})}
          />
        )}
      </td>
      <td className="px-4 py-3 align-top">
        <div className="flex flex-col gap-2 min-w-[140px]">
          <div className="relative">
            <input 
              type="date" 
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg pl-8 pr-2 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all [color-scheme:dark]"
              value={data.startDate || ''}
              onChange={e => setData({...data, startDate: e.target.value})}
            />
            <Calendar className="absolute left-2.5 top-2.5 text-neutral-500" size={14} />
          </div>
          <div className="relative">
            <input 
              type="date" 
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg pl-8 pr-2 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all [color-scheme:dark]"
              value={data.endDate || ''}
              onChange={e => setData({...data, endDate: e.target.value})}
            />
            <Calendar className="absolute left-2.5 top-2.5 text-neutral-500" size={14} />
          </div>
        </div>
      </td>
      <td className="px-4 py-3 align-top">
        <input 
          type="number" 
          className="w-28 bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-white text-right focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
          value={data.budget || 0}
          onChange={e => setData({...data, budget: Number(e.target.value)})}
        />
      </td>
      <td className="px-4 py-3 align-top">
        <input 
          type="number" 
          className="w-28 bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-white text-right focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
          value={data.totalSpent || 0}
          onChange={e => setData({...data, totalSpent: Number(e.target.value)})}
        />
      </td>
      <td className="px-4 py-3 text-right text-neutral-500 align-top pt-5">-</td>
      <td className="px-4 py-3 align-top">
        <input 
          type="number" 
          className="w-28 bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-white text-right focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
          value={data.revenue || 0}
          onChange={e => setData({...data, revenue: Number(e.target.value)})}
        />
      </td>
      <td className="px-4 py-3 text-right text-neutral-500 align-top pt-5">-</td>
      <td className="px-4 py-3 text-right text-neutral-500 align-top pt-5">-</td>
      {customFields.map(cf => (
        <td key={cf.id} className="px-4 py-3 align-top">
          <input 
            type={cf.type} 
            placeholder={cf.name}
            className="w-full min-w-[120px] bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all [color-scheme:dark]"
            value={data.customData?.[cf.id] || ''}
            onChange={e => handleCustomDataChange(data, setData, cf.id, cf.type === 'number' ? Number(e.target.value) : e.target.value)}
          />
        </td>
      ))}
      <td className="px-4 py-3 text-center align-top pt-4">
        <div className="flex justify-center gap-2">
          <button 
            onClick={isNew ? handleSaveNew : saveEditing} 
            className="p-2 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-lg transition-colors" 
            title="Salvar"
          >
            <Check size={18} />
          </button>
          <button 
            onClick={isNew ? () => setIsAdding(false) : cancelEditing} 
            className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-colors" 
            title="Cancelar"
          >
            <X size={18} />
          </button>
        </div>
      </td>
    </>
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Operações (Planilha)</h2>
          <p className="text-neutral-400 mt-1 text-sm sm:text-base">Gerencie suas campanhas de tráfego e influenciadores.</p>
        </div>
      </header>

      {/* Toolbar: Filtros e Ações */}
      <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 flex flex-col lg:flex-row gap-4 justify-between items-center shadow-sm">
        <div className="flex flex-col sm:flex-row w-full lg:w-auto gap-3">
          {/* Busca */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
            <input 
              type="text"
              placeholder="Buscar campanha..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
            />
          </div>
          
          {/* Filtro de Data */}
          <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5">
            <Filter className="text-neutral-500" size={16} />
            <input 
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="bg-transparent text-sm text-neutral-300 focus:outline-none [color-scheme:dark]"
              title="Data Inicial"
            />
            <span className="text-neutral-600">-</span>
            <input 
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="bg-transparent text-sm text-neutral-300 focus:outline-none [color-scheme:dark]"
              title="Data Final"
            />
            {(filterStartDate || filterEndDate) && (
              <button 
                onClick={() => { setFilterStartDate(''); setFilterEndDate(''); }}
                className="ml-1 text-neutral-500 hover:text-red-400"
                title="Limpar datas"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="flex w-full lg:w-auto items-center gap-3">
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept=".xlsx, .xls, .csv" 
            onChange={handleFileUpload}
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Upload size={16} />
            <span className="hidden sm:inline">Importar</span>
          </button>
          <button 
            onClick={handleExport}
            disabled={filteredCampaigns.length === 0}
            className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-all shadow-lg shadow-blue-900/20"
          >
            <Download size={16} />
            <span className="hidden sm:inline">Exportar Excel</span>
          </button>
          <button 
            onClick={() => setIsCustomFieldsModalOpen(true)}
            className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Settings size={16} />
            <span className="hidden sm:inline">Campos</span>
          </button>
          <button 
            onClick={() => setIsAdding(true)}
            disabled={isAdding}
            className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-emerald-900/20"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Nova Operação</span>
            <span className="sm:hidden">Nova</span>
          </button>
        </div>
      </div>

      <div className="bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-neutral-300 whitespace-nowrap">
            <thead className="bg-neutral-900/80 text-xs uppercase tracking-wider text-neutral-400 border-b border-neutral-800">
              <tr>
                <th className="px-4 py-4 font-semibold">Nome / Tipo</th>
                <th className="px-4 py-4 font-semibold">Plataforma / Influenciador</th>
                <th className="px-4 py-4 font-semibold">Período</th>
                <th className="px-4 py-4 font-semibold text-right">Orçamento</th>
                <th className="px-4 py-4 font-semibold text-right">Custo Total</th>
                <th className="px-4 py-4 font-semibold text-right">Custo Diário Médio</th>
                <th className="px-4 py-4 font-semibold text-right">Receita</th>
                <th className="px-4 py-4 font-semibold text-right">Lucro</th>
                <th className="px-4 py-4 font-semibold text-right">ROI</th>
                {customFields.map(cf => (
                  <th key={cf.id} className="px-4 py-4 font-semibold">{cf.name}</th>
                ))}
                <th className="px-4 py-4 font-semibold text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/50">
              {isAdding && (
                <tr className="bg-neutral-900/60 border-l-2 border-l-emerald-500">
                  {renderEditRow(newRow, setNewRow, true)}
                </tr>
              )}

              {filteredCampaigns.map((campaign) => {
                const isEditing = editingId === campaign.id;
                const profit = campaign.revenue - campaign.totalSpent;
                const roi = calculateROI(campaign.totalSpent, campaign.revenue);
                const budgetUsedPercentage = campaign.budget > 0 ? (campaign.totalSpent / campaign.budget) * 100 : 0;
                const isOverBudget = budgetUsedPercentage >= 80;
                
                if (isEditing) {
                  return (
                    <tr key={campaign.id} className="bg-neutral-900/60 border-l-2 border-l-blue-500 shadow-inner">
                      {renderEditRow(editRowData, setEditRowData, false)}
                    </tr>
                  );
                }

                return (
                  <tr key={campaign.id} className={cn("hover:bg-neutral-800/30 transition-colors group", isOverBudget ? "bg-red-900/10" : "")}>
                    <td className="px-4 py-4">
                      <div className="font-semibold text-white flex items-center gap-2">
                        {campaign.name}
                        {isOverBudget && (
                          <AlertTriangle size={14} className="text-amber-500" title={`Atenção: Custo atingiu ${budgetUsedPercentage.toFixed(1)}% do orçamento`} />
                        )}
                      </div>
                      <div className="text-xs text-neutral-500 mt-0.5 flex items-center gap-1">
                        {campaign.type === 'Traffic' ? '🚀 Tráfego Pago' : '🌟 Influenciador'}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-neutral-200">{campaign.platform}</div>
                      {campaign.type === 'Influencer' && (
                        <div className="text-xs text-blue-400 mt-0.5 font-medium">{campaign.influencerName}</div>
                      )}
                    </td>
                    <td className="px-4 py-4 text-xs">
                      <div className="flex items-center gap-1.5 text-neutral-300">
                        <Calendar size={12} className="text-neutral-500" />
                        {new Date(campaign.startDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                      </div>
                      <div className="text-neutral-500 mt-0.5 pl-4">
                        até {new Date(campaign.endDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right text-neutral-400">{formatCurrency(campaign.budget)}</td>
                    <td className="px-4 py-4 text-right text-neutral-300 font-medium">{formatCurrency(campaign.totalSpent)}</td>
                    <td className="px-4 py-4 text-right text-neutral-400">{calculateDailyCost(campaign.totalSpent, campaign.startDate, campaign.endDate)}</td>
                    <td className="px-4 py-4 text-right text-white font-semibold">{formatCurrency(campaign.revenue)}</td>
                    <td className="px-4 py-4 text-right">
                      <span className={cn("px-2.5 py-1 rounded-md font-semibold text-xs border", 
                        profit > 0 ? "border-emerald-500/20 text-emerald-400 bg-emerald-500/10" : 
                        profit < 0 ? "border-red-500/20 text-red-400 bg-red-500/10" : 
                        "border-yellow-500/20 text-yellow-400 bg-yellow-500/10"
                      )}>
                        {formatCurrency(profit)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className={cn("px-2.5 py-1 rounded-md font-semibold text-xs border", 
                        roi > 0 ? "border-emerald-500/20 text-emerald-400 bg-emerald-500/10" : 
                        roi < 0 ? "border-red-500/20 text-red-400 bg-red-500/10" : 
                        "border-yellow-500/20 text-yellow-400 bg-yellow-500/10"
                      )}>
                        {roi.toFixed(2)}%
                      </span>
                    </td>
                    {customFields.map(cf => (
                      <td key={cf.id} className="px-4 py-4 text-neutral-300">
                        {cf.type === 'date' && campaign.customData?.[cf.id] 
                          ? new Date(campaign.customData[cf.id]).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
                          : campaign.customData?.[cf.id] || '-'}
                      </td>
                    ))}
                    <td className="px-4 py-4 text-center">
                      <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setViewingCampaign(campaign)} className="p-1.5 text-neutral-400 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-md transition-colors" title="Visualizar Detalhes"><Eye size={16} /></button>
                        <button onClick={() => startEditing(campaign)} className="p-1.5 text-neutral-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-md transition-colors" title="Editar"><Edit2 size={16} /></button>
                        <button onClick={() => deleteCampaign(campaign.id)} className="p-1.5 text-neutral-400 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors" title="Excluir"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              
              {filteredCampaigns.length === 0 && !isAdding && (
                <tr>
                  <td colSpan={10 + customFields.length} className="px-4 py-12 text-center">
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
                      {viewingCampaign.type === 'Traffic' ? '🚀 Tráfego Pago' : '🌟 Influenciador'}
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
      {isCustomFieldsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
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
          </div>
        </div>
      )}
    </div>
  );
}
