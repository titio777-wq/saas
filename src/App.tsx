/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Spreadsheet } from './components/Spreadsheet';
import { AIAssistant } from './components/AIAssistant';
import { useCampaigns } from './hooks/useCampaigns';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('adfluence_activeTab') || 'dashboard';
  });

  useEffect(() => {
    localStorage.setItem('adfluence_activeTab', activeTab);
  }, [activeTab]);

  const { campaigns, addCampaign, addMultipleCampaigns, updateCampaign, deleteCampaign, metrics } = useCampaigns();

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="h-full w-full"
        >
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
        </motion.div>
      </AnimatePresence>
    </Layout>
  );
}
