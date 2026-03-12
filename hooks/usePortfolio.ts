import { useState, useEffect } from 'react';

export function usePortfolio(setIsLoadingData: (loading: boolean) => void) {
  const [portfolios, setPortfolios] = useState<any[]>([]);
  const [currentPortfolioId, setCurrentPortfolioId] = useState<string | null>(null);
  const [portfolio, setPortfolio] = useState<any[]>([]);
  
  const [isPortfolioModalOpen, setIsPortfolioModalOpen] = useState(false);
  const [newPortfolioName, setNewPortfolioName] = useState('');
  const [editingPortfolioId, setEditingPortfolioId] = useState<string | null>(null);
  
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [itemsToSave, setItemsToSave] = useState<any[]>([]);
  const [saveTargetPortfolioId, setSaveTargetPortfolioId] = useState<string>('');

  useEffect(() => {
    fetchPortfolios();
  }, []);

  useEffect(() => {
    if (currentPortfolioId) {
      fetchPortfolioData();
    }
  }, [currentPortfolioId]);

  const fetchPortfolios = async () => {
    try {
      const res = await fetch('/api/portfolios');
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error(`Failed to fetch portfolios: ${res.status} ${res.statusText}`, errorText);
        // Handle non-JSON error response gracefully
        return; 
      }

      const data = await res.json();
      setPortfolios(data);
      if (data.length > 0 && !currentPortfolioId) {
        setCurrentPortfolioId(data[0].id);
        setSaveTargetPortfolioId(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching portfolios:', error);
    }
  };

  const fetchPortfolioData = async () => {
    if (!currentPortfolioId) return;
    try {
      const res = await fetch(`/api/portfolio?portfolioId=${currentPortfolioId}`);
      if (!res.ok) throw new Error('Failed to fetch portfolio');
      const data = await res.json();
      
      if (data) {
        setPortfolio(data);
        return data;
      }
    } catch (err) {
      console.error('Failed to fetch portfolio', err);
    }
    return null;
  };

  const handleCreateOrUpdatePortfolio = async () => {
    if (!newPortfolioName.trim()) return;
    
    try {
      if (editingPortfolioId) {
        // Update existing portfolio
        const res = await fetch('/api/portfolios', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingPortfolioId, name: newPortfolioName }),
        });

        if (res.ok) {
          const updatedPortfolio = await res.json();
          setPortfolios(portfolios.map(p => p.id === editingPortfolioId ? updatedPortfolio : p));
          setNewPortfolioName('');
          setEditingPortfolioId(null);
          setIsPortfolioModalOpen(false);
        }
      } else {
        // Create new portfolio
        const res = await fetch('/api/portfolios', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newPortfolioName }),
        });
        
        if (res.ok) {
          const newPortfolio = await res.json();
          setPortfolios([...portfolios, newPortfolio]);
          setNewPortfolioName('');
          setIsPortfolioModalOpen(false);
          setCurrentPortfolioId(newPortfolio.id);
        }
      }
    } catch (error) {
      console.error('Error saving portfolio:', error);
    }
  };

  const openCreateModal = () => {
    setEditingPortfolioId(null);
    setNewPortfolioName('');
    setIsPortfolioModalOpen(true);
  };

  const openEditModal = () => {
    if (!currentPortfolioId) return;
    const current = portfolios.find(p => p.id === currentPortfolioId);
    if (current) {
      setEditingPortfolioId(currentPortfolioId);
      setNewPortfolioName(current.name);
      setIsPortfolioModalOpen(true);
    }
  };

  const handleDeletePortfolioGroup = async (id: string) => {
    if (!confirm('Are you sure you want to delete this portfolio and all its items?')) return;

    try {
      const res = await fetch(`/api/portfolios?id=${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        const newPortfolios = portfolios.filter(p => p.id !== id);
        setPortfolios(newPortfolios);
        if (newPortfolios.length > 0) {
          setCurrentPortfolioId(newPortfolios[0].id);
        } else {
          setCurrentPortfolioId(null);
          setPortfolio([]);
        }
      }
    } catch (error) {
      console.error('Error deleting portfolio:', error);
    }
  };

  const handleDeletePortfolioItem = async (id: number) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    try {
      const res = await fetch(`/api/portfolio?id=${id}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to delete');
      }

      fetchPortfolioData();
    } catch (err: any) {
      alert(`Error deleting item: ${err.message}`);
    }
  };

  const handleSaveToPortfolio = (item: any) => {
    setItemsToSave([item]);
    if (portfolios.length > 0) {
       setSaveTargetPortfolioId(currentPortfolioId || portfolios[0].id);
    }
    setIsSaveModalOpen(true);
  };

  const handleSaveAllToPortfolio = (multiResults: any[]) => {
    if (multiResults.length === 0) return;
    setItemsToSave(multiResults);
    if (portfolios.length > 0) {
       setSaveTargetPortfolioId(currentPortfolioId || portfolios[0].id);
    }
    setIsSaveModalOpen(true);
  };

  const confirmSaveToPortfolio = async () => {
    if (!saveTargetPortfolioId || itemsToSave.length === 0) return;

    setIsLoadingData(true);
    try {
      await Promise.all(itemsToSave.map(item => saveSingleItem(item, saveTargetPortfolioId)));
      
      setIsSaveModalOpen(false);
      setItemsToSave([]);
      alert(`Saved ${itemsToSave.length} items to portfolio successfully!`);
      
      if (saveTargetPortfolioId === currentPortfolioId) {
        fetchPortfolioData();
      }
    } catch (error) {
      console.error('Error saving to portfolio:', error);
      alert('Error saving items');
    } finally {
      setIsLoadingData(false);
    }
  };

  const saveSingleItem = async (item: any, targetPortfolioId: string) => {
    const payload = {
      ticker: item.ticker,
      currentPrice: item.currentPrice || 0,
      fairPrice: item.fairPrice,
      d0: item.d0,
      g: item.g,
      ks: item.ks,
      pe: item.pe,
      pbv: item.pbv,
      debtToEquity: item.debtToEquity,
      roa: item.roa,
      roe: item.roe,
      dividendYield: item.dividendYield,
      eps: item.eps,
      mos30Price: item.mos30Price,
      shares30: item.shares30,
      cost30: item.cost30,
      mos40Price: item.mos40Price,
      shares40: item.shares40,
      cost40: item.cost40,
      mos50Price: item.mos50Price,
      shares50: item.shares50,
      cost50: item.cost50,
      statusLabel: item.statusLabel,
      portfolioId: targetPortfolioId
    };

    const res = await fetch('/api/portfolio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error('Failed to save');
  };

  return {
    portfolios,
    currentPortfolioId,
    setCurrentPortfolioId,
    portfolio,
    setPortfolio,
    fetchPortfolioData,
    
    // Modal states and logic
    isPortfolioModalOpen,
    setIsPortfolioModalOpen,
    newPortfolioName,
    setNewPortfolioName,
    editingPortfolioId,
    
    isSaveModalOpen,
    setIsSaveModalOpen,
    saveTargetPortfolioId,
    setSaveTargetPortfolioId,
    itemsToSave,

    // Actions
    openCreateModal,
    openEditModal,
    handleCreateOrUpdatePortfolio,
    handleDeletePortfolioGroup,
    handleDeletePortfolioItem,
    handleSaveToPortfolio,
    handleSaveAllToPortfolio,
    confirmSaveToPortfolio
  };
}
