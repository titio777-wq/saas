/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Spreadsheet } from './components/Spreadsheet';
import { AIAssistant } from './components/AIAssistant';
import { useCampaigns } from './hooks/useCampaigns';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { campaigns, addCampaign, addMultipleCampaigns, updateCampaign, deleteCampaign, metrics } = useCampaigns();

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {activeTab === 'dashboard' && <Dashboard campaigns={campaigns} metrics={metrics} />}
      {activeTab === 'operations' && (
        <Spreadsheet 
          campaigns={campaigns} 
          addCampaign={addCampaign} 
          addMultipleCampaigns={addMultipleCampaigns}
          updateCampaign={updateCampaign} 
          deleteCampaign={deleteCampaign} 
        />
      )}
      {activeTab === 'ai-assistant' && <AIAssistant campaigns={campaigns} metrics={metrics} />}
    </Layout>
  );
}
