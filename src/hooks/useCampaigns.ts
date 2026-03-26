import { useState, useMemo, useEffect } from 'react';
import { Campaign, DashboardMetrics } from '../types';

const STORAGE_KEY = '@adfluence:campaigns';

export function useCampaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error('Failed to parse stored campaigns', e);
      }
    }
    return []; // Zera as informações iniciais
  });

  // Salva automaticamente no localStorage sempre que houver mudanças
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(campaigns));
  }, [campaigns]);

  const addCampaign = (campaign: Omit<Campaign, 'id'>) => {
    const newCampaign = { ...campaign, id: Math.random().toString(36).substr(2, 9) };
    setCampaigns([...campaigns, newCampaign]);
  };

  const addMultipleCampaigns = (newCampaigns: Omit<Campaign, 'id'>[]) => {
    const campaignsWithIds = newCampaigns.map(c => ({ ...c, id: Math.random().toString(36).substr(2, 9) }));
    setCampaigns(prev => [...prev, ...campaignsWithIds]);
  };

  const updateCampaign = (id: string, updatedFields: Partial<Campaign>) => {
    setCampaigns(campaigns.map(c => c.id === id ? { ...c, ...updatedFields } : c));
  };

  const deleteCampaign = (id: string) => {
    setCampaigns(campaigns.filter(c => c.id !== id));
  };

  const metrics: DashboardMetrics = useMemo(() => {
    let totalBudget = 0;
    let totalSpent = 0;
    let totalRevenue = 0;

    campaigns.forEach(c => {
      totalBudget += c.budget;
      totalSpent += c.totalSpent;
      totalRevenue += c.revenue;
    });

    const totalProfit = totalRevenue - totalSpent;
    const overallROI = totalSpent > 0 ? (totalProfit / totalSpent) * 100 : 0;

    return {
      totalBudget,
      totalSpent,
      totalRevenue,
      totalProfit,
      overallROI
    };
  }, [campaigns]);

  return {
    campaigns,
    addCampaign,
    addMultipleCampaigns,
    updateCampaign,
    deleteCampaign,
    metrics
  };
}
