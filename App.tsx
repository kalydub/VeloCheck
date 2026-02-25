
import React, { useState, useEffect, useRef } from 'react';
import {
  Bike, Upload, BarChart3, Settings2, Sparkles, Plus, Trash2,
  ChevronRight, RefreshCcw, AlertTriangle, X, Check, Camera,
  ArrowLeft, LayoutGrid, Download, FileDown, Save, Map as MapIcon
} from 'lucide-react';
import { AppState, BikeProfile, ComponentStatus, GpxAnalysisResult, RideData } from './types';
import { DEFAULT_COMPONENTS } from './constants';
import { parseGpxFile } from './utils/gpxParser';
import ComponentCard from './components/ComponentCard';
import { getMaintenanceAdvice } from './services/geminiService';
import StatsView from './components/StatsView';
import RideMap from './components/RideMap';
import GlobalActivityMap from './components/GlobalActivityMap';
import { db } from './db';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    bikes: [],
    activeBikeId: null
  });
  const [isLoading, setIsLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'settings' | 'garage' | 'stats'>('garage');
  const [isUploading, setIsUploading] = useState(false);
  const [editingRideId, setEditingRideId] = useState<string | null>(null);
  const [editingRideNameId, setEditingRideNameId] = useState<string | null>(null);
  const [selectedRideForMap, setSelectedRideForMap] = useState<RideData | null>(null);
  const [showGlobalMap, setShowGlobalMap] = useState(false);
  const [advice, setAdvice] = useState<{ tips: string[], summary: string } | null>(null);
  const [isLoadingAdvice, setIsLoadingAdvice] = useState(false);

  // Formulaire nouveau vélo
  const [isAddingBike, setIsAddingBike] = useState(false);
  const [isEditingBike, setIsEditingBike] = useState(false);
  const [newBikeData, setNewBikeData] = useState({ name: '', brand: '', model: '', purchasePrice: 0, image: '' });
  const [editBikeData, setEditBikeData] = useState({ name: '', brand: '', model: '', purchasePrice: 0, image: '' });

  // Formulaire nouveau composant
  const [isAddingComponent, setIsAddingComponent] = useState(false);
  const [newCompName, setNewCompName] = useState('');
  const [newCompThreshold, setNewCompThreshold] = useState(1000);
  const [newCompThresholdMonths, setNewCompThresholdMonths] = useState(12);
  const [newCompThresholdType, setNewCompThresholdType] = useState<'distance' | 'time'>('distance');
  const [newCompCategory, setNewCompCategory] = useState<ComponentStatus['category']>('drivetrain');

  // Formulaire nouvelle sortie manuelle
  const [isAddingManualRide, setIsAddingManualRide] = useState(false);
  const [manualRideData, setManualRideData] = useState({
    name: '',
    date: new Date().toISOString().split('T')[0],
    distance: 0,
    elevation: 0
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Persistence & Migration
  useEffect(() => {
    const loadData = async () => {
      try {
        const bikes = await db.bikes.toArray();
        const activeBikeIdConfig = await db.config.get('activeBikeId');

        if (bikes.length > 0) {
          setState({
            bikes,
            activeBikeId: activeBikeIdConfig?.value || bikes[0].id
          });
        } else {
          // Migration from LocalStorage
          const saved = localStorage.getItem('velocheck_v2_state');
          if (saved) {
            const legacyState = JSON.parse(saved);
            if (legacyState.bikes && legacyState.bikes.length > 0) {
              await db.bikes.bulkAdd(legacyState.bikes);
              if (legacyState.activeBikeId) {
                await db.config.put({ key: 'activeBikeId', value: legacyState.activeBikeId });
              }
              setState(legacyState);
            }
          }
        }
      } catch (e) {
        console.error("Erreur lors du chargement des données IndexedDB:", e);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const saveData = async () => {
      try {
        // Option simple : on écrase pour synchroniser l'état
        // Pour une performance maximale sur des milliers de vélos, 
        // on pourrait ne mettre à jour que le vélo modifié.
        await db.transaction('rw', db.bikes, db.config, async () => {
          await db.bikes.clear();
          await db.bikes.bulkAdd(state.bikes);
          await db.config.put({ key: 'activeBikeId', value: state.activeBikeId });
        });
      } catch (e) {
        console.error("Erreur lors de la sauvegarde IndexedDB:", e);
      }
    };
    saveData();
  }, [state, isLoading]);

  const activeBike = state.bikes.find(b => b.id === state.activeBikeId);

  const updateActiveBike = (updater: (bike: BikeProfile) => BikeProfile) => {
    if (!state.activeBikeId) return;
    setState(prev => ({
      ...prev,
      bikes: prev.bikes.map(b => b.id === prev.activeBikeId ? updater(b) : b)
    }));
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !activeBike) return;

    setIsUploading(true);
    const newRides: any[] = [];
    let addedDistance = 0;
    let addedElevation = 0;

    try {
      for (let i = 0; i < files.length; i++) {
        const analysis = await parseGpxFile(files[i]);
        newRides.push({
          id: crypto.randomUUID(),
          name: analysis.name,
          date: analysis.startTime,
          distance: analysis.distance,
          elevationGain: analysis.elevationGain,
          coordinates: analysis.coordinates
        });
        addedDistance += analysis.distance;
        addedElevation += analysis.elevationGain;
      }

      updateActiveBike(bike => ({
        ...bike,
        rides: [...newRides, ...bike.rides],
        totalDistance: bike.totalDistance + addedDistance,
        totalElevation: bike.totalElevation + addedElevation,
        components: bike.components.map(c => ({
          ...c,
          currentKm: c.currentKm + addedDistance
        }))
      }));
    } catch (error) {
      alert("Erreur lors de l'analyse des fichiers GPX.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleManualRide = () => {
    if (!activeBike || manualRideData.distance <= 0) return;

    const newRide: RideData = {
      id: crypto.randomUUID(),
      name: manualRideData.name || 'Sortie manuelle',
      date: new Date(manualRideData.date).toISOString(),
      distance: manualRideData.distance,
      elevationGain: manualRideData.elevation
    };

    updateActiveBike(bike => ({
      ...bike,
      rides: [newRide, ...bike.rides],
      totalDistance: bike.totalDistance + manualRideData.distance,
      totalElevation: bike.totalElevation + manualRideData.elevation,
      components: bike.components.map(c => ({
        ...c,
        currentKm: c.currentKm + manualRideData.distance
      }))
    }));

    setIsAddingManualRide(false);
    setManualRideData({
      name: '',
      date: new Date().toISOString().split('T')[0],
      distance: 0,
      elevation: 0
    });
  };

  const deleteRide = (rideId: string) => {
    if (!activeBike || !confirm("Supprimer cette sortie ?")) return;

    const rideToDelete = activeBike.rides.find(r => r.id === rideId);
    if (!rideToDelete) return;

    updateActiveBike(bike => ({
      ...bike,
      rides: bike.rides.filter(r => r.id !== rideId),
      totalDistance: Math.max(0, bike.totalDistance - rideToDelete.distance),
      totalElevation: Math.max(0, bike.totalElevation - rideToDelete.elevationGain),
      components: bike.components.map(c => ({
        ...c,
        currentKm: Math.max(0, c.currentKm - rideToDelete.distance)
      }))
    }));
  };

  const updateRideDate = (rideId: string, newDate: string) => {
    updateActiveBike(bike => ({
      ...bike,
      rides: bike.rides.map(r => r.id === rideId ? { ...r, date: new Date(newDate).toISOString() } : r)
    }));
  };

  const updateRideName = (rideId: string, newName: string) => {
    if (!newName.trim()) return;
    updateActiveBike(bike => ({
      ...bike,
      rides: bike.rides.map(r => r.id === rideId ? { ...r, name: newName } : r)
    }));
  };

  const resetComponent = (id: string, price?: number, note?: string) => {
    updateActiveBike(bike => ({
      ...bike,
      components: bike.components.map(c =>
        c.id === id ? {
          ...c,
          currentKm: 0,
          lastServiceDate: new Date().toISOString(),
          lastSafetyCheckDate: new Date().toISOString(),
          serviceHistory: [
            {
              date: new Date().toISOString(),
              kmAtService: c.currentKm,
              price: price,
              note: note
            },
            ...(c.serviceHistory || [])
          ]
        } : c
      )
    }));
  };

  const performSafetyCheck = () => {
    if (!confirm("Confirmer que vous avez effectué les vérifications de sécurité (serrages, pressions, câbles) ?")) return;
    updateActiveBike(bike => ({
      ...bike,
      components: bike.components.map(c => ({
        ...c,
        lastSafetyCheckDate: new Date().toISOString()
      }))
    }));
  };

  const updateThreshold = (id: string, newThreshold: number) => {
    updateActiveBike(bike => ({
      ...bike,
      components: bike.components.map(c =>
        c.id === id ? { ...c, thresholdKm: newThreshold } : c
      )
    }));
  };

  const updateThresholdType = (id: string, type: 'distance' | 'time') => {
    updateActiveBike(bike => ({
      ...bike,
      components: bike.components.map(c =>
        c.id === id ? { ...c, thresholdType: type } : c
      )
    }));
  };

  const updateThresholdMonths = (id: string, months: number) => {
    updateActiveBike(bike => ({
      ...bike,
      components: bike.components.map(c =>
        c.id === id ? { ...c, thresholdMonths: months } : c
      )
    }));
  };

  const updateReference = (id: string, reference: string) => {
    updateActiveBike(bike => ({
      ...bike,
      components: bike.components.map(c =>
        c.id === id ? { ...c, partReference: reference } : c
      )
    }));
  };

  const addComponent = () => {
    if (!newCompName.trim() || !activeBike) return;
    const newComponent: ComponentStatus = {
      id: crypto.randomUUID(),
      name: newCompName,
      currentKm: 0,
      thresholdKm: newCompThreshold,
      thresholdMonths: newCompThresholdMonths,
      thresholdType: newCompThresholdType,
      lastServiceDate: new Date().toISOString(),
      category: newCompCategory,
      serviceHistory: []
    };
    updateActiveBike(bike => ({ ...bike, components: [...bike.components, newComponent] }));
    setNewCompName('');
    setIsAddingComponent(false);
  };

  const removeComponent = (id: string) => {
    if (confirm("Supprimer ce composant ?")) {
      updateActiveBike(bike => ({ ...bike, components: bike.components.filter(c => c.id !== id) }));
    }
  };

  const createBike = () => {
    if (!newBikeData.name.trim()) return;
    const newBike: BikeProfile = {
      id: crypto.randomUUID(),
      name: newBikeData.name,
      brand: newBikeData.brand,
      model: newBikeData.model,
      purchasePrice: newBikeData.purchasePrice,
      image: newBikeData.image,
      components: [...DEFAULT_COMPONENTS],
      rides: [],
      totalDistance: 0,
      totalElevation: 0
    };
    setState(prev => ({
      bikes: [...prev.bikes, newBike],
      activeBikeId: prev.activeBikeId || newBike.id
    }));
    setNewBikeData({ name: '', brand: '', model: '', purchasePrice: 0, image: '' });
    setIsAddingBike(false);
    if (!state.activeBikeId) setActiveTab('dashboard');
  };

  const startEditingBike = () => {
    if (!activeBike) return;
    setEditBikeData({
      name: activeBike.name,
      brand: activeBike.brand,
      model: activeBike.model,
      purchasePrice: activeBike.purchasePrice || 0,
      image: activeBike.image || ''
    });
    setIsEditingBike(true);
  };

  const saveBikeEdit = () => {
    if (!editBikeData.name.trim()) return;
    updateActiveBike(bike => ({
      ...bike,
      name: editBikeData.name,
      brand: editBikeData.brand,
      model: editBikeData.model,
      purchasePrice: editBikeData.purchasePrice,
      image: editBikeData.image
    }));
    setIsEditingBike(false);
  };

  const deleteBike = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Voulez-vous vraiment supprimer ce vélo et toutes ses données ?")) {
      setState(prev => {
        const remaining = prev.bikes.filter(b => b.id !== id);
        return {
          bikes: remaining,
          activeBikeId: prev.activeBikeId === id ? (remaining[0]?.id || null) : prev.activeBikeId
        };
      });
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewBikeData(prev => ({ ...prev, image: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEditImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditBikeData(prev => ({ ...prev, image: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const exportData = () => {
    const dataStr = JSON.stringify(state, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `velocheck_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm("Importer ces données ? Cela remplacera votre configuration actuelle.")) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.bikes && Array.isArray(json.bikes)) {
          setState(json);
          alert("Données importées avec succès !");
        } else {
          alert("Format de fichier invalide.");
        }
      } catch (error) {
        alert("Erreur lors de la lecture du fichier.");
      }
    };
    reader.readAsText(file);
  };

  const fetchAdvice = async () => {
    if (!activeBike) return;
    setIsLoadingAdvice(true);
    // Passing the entire bike profile to the maintenance advice service
    const result = await getMaintenanceAdvice(activeBike);
    setAdvice(result);
    setIsLoadingAdvice(false);
  };

  // Rediriger vers garage si aucun vélo
  useEffect(() => {
    if (state.bikes.length === 0) setActiveTab('garage');
  }, [state.bikes.length]);


  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
        <div className="bg-indigo-600/20 p-6 rounded-3xl mb-4">
          <Bike className="w-12 h-12 text-indigo-500 animate-bounce" />
        </div>
        <p className="text-slate-400 font-medium animate-pulse">Chargement de votre garage haute performance...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      {/* Sidebar Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 md:top-0 md:left-0 md:bottom-0 md:w-64 bg-slate-900 border-t md:border-r border-slate-800 z-50">
        <div className="hidden md:flex p-6 items-center gap-3 border-b border-slate-800 mb-6">
          <div className="bg-indigo-600 p-2 rounded-lg text-white">
            <Bike className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">VeloCheck</h1>
        </div>

        <div className="flex md:flex-col justify-around md:justify-start p-2 md:p-4 gap-2">
          <button
            onClick={() => setActiveTab('garage')}
            className={`flex items-center gap-3 p-3 rounded-lg transition-colors w-full ${activeTab === 'garage' ? 'bg-indigo-600/20 text-indigo-400' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            <LayoutGrid className="w-5 h-5" />
            <span className="hidden md:block font-medium">Mon Garage</span>
          </button>

          {activeBike && (
            <>
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center gap-3 p-3 rounded-lg transition-colors w-full ${activeTab === 'dashboard' ? 'bg-indigo-600/20 text-indigo-400' : 'text-slate-400 hover:bg-slate-800'}`}
              >
                <BarChart3 className="w-5 h-5" />
                <span className="hidden md:block font-medium">Tableau de bord</span>
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`flex items-center gap-3 p-3 rounded-lg transition-colors w-full ${activeTab === 'history' ? 'bg-indigo-600/20 text-indigo-400' : 'text-slate-400 hover:bg-slate-800'}`}
              >
                <Plus className="w-5 h-5" />
                <span className="hidden md:block font-medium">Activités</span>
              </button>
              <button
                onClick={() => setActiveTab('stats')}
                className={`flex items-center gap-3 p-3 rounded-lg transition-colors w-full ${activeTab === 'stats' ? 'bg-indigo-600/20 text-indigo-400' : 'text-slate-400 hover:bg-slate-800'}`}
              >
                <Sparkles className="w-5 h-5" />
                <span className="hidden md:block font-medium">Statistiques</span>
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`flex items-center gap-3 p-3 rounded-lg transition-colors w-full ${activeTab === 'settings' ? 'bg-indigo-600/20 text-indigo-400' : 'text-slate-400 hover:bg-slate-800'}`}
              >
                <Settings2 className="w-5 h-5" />
                <span className="hidden md:block font-medium">Réglages</span>
              </button>
            </>
          )}
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="md:ml-64 p-6 md:p-10 max-w-7xl mx-auto">

        {/* TAB: GARAGE */}
        {activeTab === 'garage' && (
          <div className="space-y-8 duration-500">
            <header className="flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-extrabold text-white">Mon Garage</h2>
                <p className="text-slate-400">Gérez vos différents vélos et profils d'entretien.</p>
              </div>
              <div className="flex items-center gap-3">
                {!isAddingBike && (
                  <>
                    <input type="file" id="import-json" className="hidden" accept=".json" onChange={importData} />
                    <button
                      onClick={() => document.getElementById('import-json')?.click()}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all border border-slate-700"
                      title="Importer une sauvegarde"
                    >
                      <FileDown className="w-5 h-5" /> <span className="hidden sm:inline">Importer</span>
                    </button>
                    <button
                      onClick={exportData}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all border border-slate-700"
                      title="Exporter une sauvegarde"
                    >
                      <Download className="w-5 h-5" /> <span className="hidden sm:inline">Exporter</span>
                    </button>
                    <button
                      onClick={() => setIsAddingBike(true)}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20"
                    >
                      <Plus className="w-5 h-5" /> Ajouter un vélo
                    </button>
                  </>
                )}
              </div>
            </header>

            {isAddingBike && (
              <section className="bg-slate-800 border border-indigo-500/30 rounded-3xl p-8 duration-300">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-xl font-bold flex items-center gap-2"><Plus className="text-indigo-400" /> Nouveau Profil Vélo</h3>
                  <button onClick={() => setIsAddingBike(false)} className="text-slate-400 hover:text-white"><X /></button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-2">Nom du vélo (ex: Mon Enduro)</label>
                      <input
                        type="text"
                        value={newBikeData.name}
                        onChange={e => setNewBikeData(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors"
                        placeholder="Saisissez un nom..."
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">Marque</label>
                        <input
                          type="text"
                          value={newBikeData.brand}
                          onChange={e => setNewBikeData(prev => ({ ...prev, brand: e.target.value }))}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors"
                          placeholder="Specialized, Trek..."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">Modèle</label>
                        <input
                          type="text"
                          value={newBikeData.model}
                          onChange={e => setNewBikeData(prev => ({ ...prev, model: e.target.value }))}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors"
                          placeholder="Stumpjumper, Fuel..."
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-400 mb-2">Prix d'achat (€)</label>
                      <input
                        type="number"
                        value={newBikeData.purchasePrice || ''}
                        onChange={e => setNewBikeData(prev => ({ ...prev, purchasePrice: parseFloat(e.target.value) }))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors"
                        placeholder="Ex: 2500"
                      />
                    </div>
                    <button
                      onClick={createBike}
                      disabled={!newBikeData.name}
                      className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-2xl font-bold text-lg shadow-xl shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
                    >
                      Créer le profil <Check className="w-6 h-6" />
                    </button>
                  </div>

                  <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-700 rounded-3xl p-6 relative group overflow-hidden bg-slate-900/50">
                    {newBikeData.image ? (
                      <>
                        <img src={newBikeData.image} alt="Preview" className="w-full h-full object-cover absolute inset-0 opacity-50" />
                        <button
                          onClick={() => setNewBikeData(prev => ({ ...prev, image: '' }))}
                          className="absolute top-4 right-4 bg-red-500 p-2 rounded-full z-10"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : null}
                    <label className="cursor-pointer flex flex-col items-center gap-4 relative z-10">
                      <div className="bg-slate-800 p-5 rounded-2xl shadow-lg group-hover:scale-110 transition-transform">
                        <Camera className="w-10 h-10 text-indigo-400" />
                      </div>
                      <span className="text-slate-300 font-medium">Ajouter une photo</span>
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    </label>
                  </div>
                </div>
              </section>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {state.bikes.map(bike => (
                <div
                  key={bike.id}
                  onClick={() => { setState(prev => ({ ...prev, activeBikeId: bike.id })); setActiveTab('dashboard'); }}
                  className={`relative overflow-hidden group rounded-3xl border-2 transition-all cursor-pointer h-72 ${state.activeBikeId === bike.id ? 'border-indigo-500 ring-4 ring-indigo-500/20 shadow-2xl scale-[1.02]' : 'border-slate-800 hover:border-slate-600'}`}
                >
                  {bike.image ? (
                    <img src={bike.image} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={bike.name} />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                      <Bike className="w-20 h-20 text-slate-700" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-transparent"></div>

                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-indigo-400 text-xs font-bold uppercase tracking-widest mb-1">{bike.brand} {bike.model}</p>
                        <h3 className="text-2xl font-extrabold text-white mb-2">{bike.name}</h3>
                        <div className="flex items-center gap-4 text-slate-300 text-sm">
                          <span className="bg-white/10 px-2 py-1 rounded-md">{bike.totalDistance.toFixed(0)} km</span>
                          <span className="bg-white/10 px-2 py-1 rounded-md">{bike.rides.length} sorties</span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => deleteBike(bike.id, e)}
                        className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {state.activeBikeId === bike.id && (
                    <div className="absolute top-4 right-4 bg-indigo-500 text-white p-1.5 rounded-full shadow-lg">
                      <Check className="w-4 h-4" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PROFIL ACTIF : DASHBOARD, HISTORY, SETTINGS */}
        {activeBike && activeTab !== 'garage' && (
          <div className="space-y-10 duration-500">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-800/40 p-6 rounded-3xl border border-slate-700">
              <div className="flex items-center gap-5">
                <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-indigo-500/30 flex-shrink-0 bg-slate-900">
                  {activeBike.image ? <img src={activeBike.image} className="w-full h-full object-cover" /> : <Bike className="m-auto mt-4 text-slate-700" />}
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white">{activeBike.name}</h2>
                  <p className="text-indigo-400 font-medium">{activeBike.brand} {activeBike.model}</p>
                </div>
              </div>
              <div className="flex gap-4">
                <button onClick={() => setActiveTab('garage')} className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl transition-colors">
                  <ArrowLeft className="w-4 h-4" /> Changer de vélo
                </button>
              </div>
            </header>

            {/* Statistiques d'en-tête */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 backdrop-blur-sm">
                <p className="text-slate-400 text-sm font-medium mb-1">Distance Totale</p>
                <h2 className="text-4xl font-bold text-slate-50">{activeBike.totalDistance.toFixed(1)} <span className="text-lg font-normal text-slate-400">km</span></h2>
              </div>
              <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 backdrop-blur-sm">
                <p className="text-slate-400 text-sm font-medium mb-1">Dénivelé Total (D+)</p>
                <h2 className="text-4xl font-bold text-slate-50">{activeBike.totalElevation.toFixed(0)} <span className="text-lg font-normal text-slate-400">m</span></h2>
              </div>
              <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 backdrop-blur-sm relative overflow-hidden group">
                <div className="relative z-10">
                  <p className="text-slate-400 text-sm font-medium mb-1">Sorties Enregistrées</p>
                  <h2 className="text-4xl font-bold text-slate-50">{activeBike.rides.length}</h2>
                </div>
                <Bike className="absolute -right-4 -bottom-4 w-24 h-24 text-slate-700/20 group-hover:text-indigo-500/10 transition-colors" />
              </div>
            </div>

            {/* Alerte Sécurité */}
            {activeBike.components.some(c => {
              const lastCheck = c.lastSafetyCheckDate ? new Date(c.lastSafetyCheckDate) : new Date(0);
              const daysSince = (new Date().getTime() - lastCheck.getTime()) / (1000 * 3600 * 24);
              return daysSince > 90;
            }) && (
                <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl flex items-center justify-between gap-4 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="bg-amber-500 p-2 rounded-xl text-white">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-amber-400 font-bold">Vérifications de sécurité recommandées</h4>
                      <p className="text-amber-500/70 text-sm">Il est temps de vérifier les serrages et l'état général de votre vélo.</p>
                    </div>
                  </div>
                  <button
                    onClick={performSafetyCheck}
                    className="bg-amber-500 hover:bg-amber-400 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors"
                  >
                    Effectué
                  </button>
                </div>
              )}

            {activeTab === 'dashboard' && (
              <div className="space-y-10">
                <section>
                  <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2 mb-6">
                    État des composants
                    <span className="text-xs bg-slate-700 px-2 py-0.5 rounded text-slate-400 font-normal uppercase tracking-wider">Temps réel</span>
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {activeBike.components.map(comp => (
                      <ComponentCard key={comp.id} component={comp} onReset={resetComponent} />
                    ))}
                  </div>
                </section>

                <section className="bg-gradient-to-br from-indigo-900/30 to-purple-900/30 rounded-3xl p-8 border border-indigo-500/20 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-10 pointer-events-none opacity-10">
                    <Sparkles className="w-40 h-40 text-indigo-400" />
                  </div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="bg-indigo-500 p-2 rounded-xl"><Sparkles className="text-white w-6 h-6" /></div>
                      <div>
                        <h2 className="text-2xl font-bold text-white">IA d'Entretien Intelligent</h2>
                        <p className="text-indigo-200/60 text-sm">Conseils personnalisés par Gemini</p>
                      </div>
                    </div>
                    {!advice && !isLoadingAdvice && (
                      <button onClick={fetchAdvice} className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 px-8 rounded-xl transition-all shadow-lg">Analyser l'état du vélo</button>
                    )}
                    {isLoadingAdvice && (
                      <div className="flex items-center gap-3 text-indigo-200 animate-pulse">
                        <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div> Analyse en cours...
                      </div>
                    )}
                    {advice && (
                      <div className="space-y-6">
                        <div className="bg-slate-900/40 p-5 rounded-2xl border border-white/5 italic text-lg text-indigo-100">"{advice.summary}"</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {advice.tips.map((tip, idx) => (
                            <div key={idx} className="flex gap-4 p-4 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                              <div className="bg-indigo-500/20 text-indigo-400 w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0">{idx + 1}</div>
                              <p className="text-slate-200 leading-relaxed">{tip}</p>
                            </div>
                          ))}
                        </div>
                        <button onClick={fetchAdvice} className="text-indigo-400 text-sm font-medium flex items-center gap-1">Actualiser les conseils <RefreshCcw className="w-3 h-3" /></button>
                      </div>
                    )}
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'stats' && (
              <StatsView bike={activeBike} />
            )}

            {showGlobalMap && (
              <GlobalActivityMap
                rides={activeBike.rides}
                onClose={() => setShowGlobalMap(false)}
              />
            )}

            {selectedRideForMap && (
              <RideMap
                coordinates={selectedRideForMap.coordinates || []}
                rideName={selectedRideForMap.name}
                onClose={() => setSelectedRideForMap(null)}
              />
            )}

            {activeTab === 'history' && (
              <div className="space-y-10">
                <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-slate-800/40 p-8 rounded-3xl border-2 border-dashed border-slate-700 text-center group hover:border-indigo-500/50 transition-colors flex flex-col items-center justify-center">
                    <input type="file" id="gpx-upload" className="hidden" multiple accept=".gpx" onChange={handleFileUpload} disabled={isUploading} />
                    <label htmlFor="gpx-upload" className="cursor-pointer flex flex-col items-center">
                      <div className={`p-4 rounded-xl mb-4 transition-all ${isUploading ? 'bg-indigo-600/50 animate-pulse' : 'bg-slate-700 group-hover:bg-indigo-600'}`}>
                        <Upload className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-100 mb-1">{isUploading ? 'Analyse...' : 'Importer GPX'}</h3>
                      <p className="text-xs text-slate-400">Assigné à : <span className="text-indigo-400 font-bold">{activeBike.name}</span></p>
                    </label>
                  </div>

                  <div className="bg-slate-800/40 p-6 rounded-3xl border border-slate-700">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Plus className="text-indigo-400 w-5 h-5" /> Ajout manuel
                      </h3>
                    </div>

                    <div className="mb-4">
                      <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1 tracking-wider">Nom de la sortie</label>
                      <input
                        type="text"
                        value={manualRideData.name}
                        onChange={e => setManualRideData(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none transition-colors"
                        placeholder="Sortie du soir, Entraînement..."
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1 tracking-wider">Distance (km)</label>
                        <input
                          type="number"
                          value={manualRideData.distance || ''}
                          onChange={e => setManualRideData(prev => ({ ...prev, distance: parseFloat(e.target.value) }))}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none transition-colors"
                          placeholder="0.0"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1 tracking-wider">Dénivelé (D+ m)</label>
                        <input
                          type="number"
                          value={manualRideData.elevation || ''}
                          onChange={e => setManualRideData(prev => ({ ...prev, elevation: parseFloat(e.target.value) }))}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none transition-colors"
                          placeholder="0"
                        />
                      </div>
                    </div>
                    <div className="mb-4">
                      <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1 tracking-wider">Date de la sortie</label>
                      <input
                        type="date"
                        value={manualRideData.date}
                        onChange={e => setManualRideData(prev => ({ ...prev, date: e.target.value }))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none transition-colors"
                      />
                    </div>
                    <button
                      onClick={handleManualRide}
                      disabled={manualRideData.distance <= 0}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-indigo-600/20"
                    >
                      Enregistrer la sortie
                    </button>
                  </div>
                </section>
                <section>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-slate-100">Activité de ce vélo</h2>
                    {activeBike.rides.some(r => r.coordinates && r.coordinates.length > 0) && (
                      <button
                        onClick={() => setShowGlobalMap(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white rounded-xl transition-all border border-indigo-600/20 text-sm font-bold"
                      >
                        <MapIcon className="w-4 h-4" /> Carte globale
                      </button>
                    )}
                  </div>
                  <div className="bg-slate-800/40 rounded-2xl border border-slate-700 divide-y divide-slate-700 overflow-hidden">
                    {activeBike.rides.length === 0 ? (
                      <div className="p-10 text-center text-slate-500">Aucune sortie pour ce vélo.</div>
                    ) : (
                      activeBike.rides.map(ride => (
                        <div key={ride.id} className="p-5 flex items-center justify-between hover:bg-slate-800/50 group/ride transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="bg-slate-700 p-2 rounded-lg text-indigo-400"><Bike className="w-5 h-5" /></div>
                            <div>
                              {editingRideNameId === ride.id ? (
                                <input
                                  type="text"
                                  defaultValue={ride.name}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      updateRideName(ride.id, e.currentTarget.value);
                                      setEditingRideNameId(null);
                                    }
                                    if (e.key === 'Escape') setEditingRideNameId(null);
                                  }}
                                  onBlur={(e) => {
                                    updateRideName(ride.id, e.target.value);
                                    setEditingRideNameId(null);
                                  }}
                                  className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-0.5 text-sm text-white outline-none focus:border-indigo-500 animate-in fade-in zoom-in-95 duration-200"
                                  autoFocus
                                />
                              ) : (
                                <h4
                                  className="font-semibold text-slate-100 font-medium cursor-pointer hover:text-indigo-400 transition-colors group/name flex items-center gap-2"
                                  onClick={() => setEditingRideNameId(ride.id)}
                                  title="Renommer l'activité"
                                >
                                  {ride.name}
                                  <Settings2 className="w-3 h-3 opacity-0 group-hover/name:opacity-50 transition-opacity" />
                                </h4>
                              )}
                              {editingRideId === ride.id ? (
                                <input
                                  type="date"
                                  defaultValue={ride.date.split('T')[0]}
                                  onChange={(e) => {
                                    updateRideDate(ride.id, e.target.value);
                                    setEditingRideId(null);
                                  }}
                                  onBlur={() => setEditingRideId(null)}
                                  className="mt-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[10px] text-white outline-none focus:border-indigo-500 animate-in fade-in zoom-in-95 duration-200"
                                  autoFocus
                                />
                              ) : (
                                <p
                                  className="text-[10px] text-slate-500 cursor-pointer hover:text-indigo-400 transition-colors flex items-center gap-1.5 mt-0.5"
                                  onClick={() => setEditingRideId(ride.id)}
                                  title="Modifier la date"
                                >
                                  {new Date(ride.date).toLocaleDateString('fr-FR')}
                                  <Settings2 className="w-2.5 h-2.5 opacity-0 group-hover/ride:opacity-100 transition-opacity" />
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-8">
                            <div className="text-right">
                              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Distance</p>
                              <p className="font-mono text-slate-200">{ride.distance.toFixed(1)} km</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">D+</p>
                              <p className="font-mono text-slate-200">{ride.elevationGain.toFixed(0)} m</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {ride.coordinates && ride.coordinates.length > 0 && (
                                <button
                                  onClick={() => setSelectedRideForMap(ride)}
                                  className="p-2 text-indigo-400 hover:text-white hover:bg-indigo-600 rounded-lg transition-all"
                                  title="Voir la carte"
                                >
                                  <MapIcon className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={(e) => { e.stopPropagation(); deleteRide(ride.id); }}
                                className="p-2 text-slate-500 hover:text-red-400 transition-colors opacity-0 group-hover/ride:opacity-100 bg-red-500/0 hover:bg-red-500/10 rounded-lg"
                                title="Supprimer la sortie"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="space-y-8">
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-100">Configuration du Vélo</h2>
                    <p className="text-slate-400">Gérez les caractéristiques et les composants de <span className="text-indigo-400 font-bold">{activeBike.name}</span>.</p>
                  </div>
                  <div className="flex gap-4">
                    <button
                      onClick={startEditingBike}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl transition-all shadow-lg"
                    >
                      <Settings2 className="w-4 h-4" /> Modifier le profil
                    </button>
                    <button onClick={() => setIsAddingComponent(!isAddingComponent)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 rounded-xl transition-all shadow-lg">
                      {isAddingComponent ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                      {isAddingComponent ? 'Annuler' : 'Ajouter un composant'}
                    </button>
                  </div>
                </header>

                {isEditingBike && (
                  <section className="bg-slate-800 border border-indigo-500/30 rounded-3xl p-8 duration-300">
                    <div className="flex justify-between items-center mb-8">
                      <h3 className="text-xl font-bold flex items-center gap-2"><Settings2 className="text-indigo-400" /> Modifier le Profil Vélo</h3>
                      <button onClick={() => setIsEditingBike(false)} className="text-slate-400 hover:text-white"><X /></button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div className="space-y-6">
                        <div>
                          <label className="block text-sm font-medium text-slate-400 mb-2">Nom du vélo</label>
                          <input
                            type="text"
                            value={editBikeData.name}
                            onChange={e => setEditBikeData(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">Marque</label>
                            <input
                              type="text"
                              value={editBikeData.brand}
                              onChange={e => setEditBikeData(prev => ({ ...prev, brand: e.target.value }))}
                              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">Modèle</label>
                            <input
                              type="text"
                              value={editBikeData.model}
                              onChange={e => setEditBikeData(prev => ({ ...prev, model: e.target.value }))}
                              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-400 mb-2">Prix d'achat (€)</label>
                          <input
                            type="number"
                            value={editBikeData.purchasePrice || ''}
                            onChange={e => setEditBikeData(prev => ({ ...prev, purchasePrice: parseFloat(e.target.value) }))}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors"
                          />
                        </div>
                        <button
                          onClick={saveBikeEdit}
                          disabled={!editBikeData.name}
                          className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-2xl font-bold text-lg shadow-xl shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
                        >
                          Enregistrer les modifications <Check className="w-6 h-6" />
                        </button>
                      </div>

                      <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-700 rounded-3xl p-6 relative group overflow-hidden bg-slate-900/50">
                        {editBikeData.image ? (
                          <>
                            <img src={editBikeData.image} alt="Preview" className="w-full h-full object-cover absolute inset-0 opacity-50" />
                            <button
                              onClick={() => setEditBikeData(prev => ({ ...prev, image: '' }))}
                              className="absolute top-4 right-4 bg-red-500 p-2 rounded-full z-10"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : null}
                        <label className="cursor-pointer flex flex-col items-center gap-4 relative z-10">
                          <div className="bg-slate-800 p-5 rounded-2xl shadow-lg group-hover:scale-110 transition-transform">
                            <Camera className="w-10 h-10 text-indigo-400" />
                          </div>
                          <span className="text-slate-300 font-medium">Changer la photo</span>
                          <input type="file" accept="image/*" onChange={handleEditImageUpload} className="hidden" />
                        </label>
                      </div>
                    </div>
                  </section>
                )}

                {isAddingComponent && (
                  <div className="bg-slate-800 border border-indigo-500/30 p-6 rounded-2xl">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-slate-500">Nom</label>
                        <input type="text" value={newCompName} onChange={e => setNewCompName(e.target.value)} placeholder="Chaîne, Pneu..." className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-slate-500">Catégorie</label>
                        <select value={newCompCategory} onChange={e => setNewCompCategory(e.target.value as any)} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2">
                          <option value="drivetrain">Transmission</option>
                          <option value="suspension">Suspension</option>
                          <option value="tires">Pneus</option>
                          <option value="brakes">Freinage</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-slate-500">Type de seuil</label>
                        <div className="flex bg-slate-900 rounded-xl p-1 border border-slate-700">
                          <button
                            onClick={() => setNewCompThresholdType('distance')}
                            className={`flex-1 py-1 rounded-lg text-xs font-bold transition-all ${newCompThresholdType === 'distance' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                          >
                            Distance
                          </button>
                          <button
                            onClick={() => setNewCompThresholdType('time')}
                            className={`flex-1 py-1 rounded-lg text-xs font-bold transition-all ${newCompThresholdType === 'time' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                          >
                            Durée
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {newCompThresholdType === 'distance' ? (
                          <div className="flex-1 space-y-2">
                            <div className="flex justify-between text-[10px] font-bold">
                              <span className="text-slate-500 uppercase">Seuil</span>
                              <span className="text-indigo-400 font-mono">{newCompThreshold} km</span>
                            </div>
                            <input type="range" min="100" max="10000" step="100" value={newCompThreshold} onChange={e => setNewCompThreshold(parseInt(e.target.value))} className="w-full accent-indigo-500" />
                          </div>
                        ) : (
                          <div className="flex-1 space-y-2">
                            <div className="flex justify-between text-[10px] font-bold">
                              <span className="text-slate-500 uppercase">Seuil</span>
                              <span className="text-indigo-400 font-mono">{newCompThresholdMonths} mois</span>
                            </div>
                            <input type="range" min="1" max="60" step="1" value={newCompThresholdMonths} onChange={e => setNewCompThresholdMonths(parseInt(e.target.value))} className="w-full accent-indigo-500" />
                          </div>
                        )}
                        <button onClick={addComponent} disabled={!newCompName.trim()} className="bg-indigo-600 hover:bg-indigo-500 text-white p-2.5 rounded-xl transition-all shadow-lg active:scale-95"><Check /></button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {activeBike.components.map(comp => (
                    <div key={comp.id} className="bg-slate-800/60 p-6 rounded-2xl border border-slate-700 group">
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-3">
                          <label className="text-slate-200 font-bold">{comp.name}</label>
                          <span className="text-[10px] bg-slate-700 px-2 py-0.5 rounded text-slate-400 uppercase">{comp.category}</span>
                        </div>
                        <button onClick={() => removeComponent(comp.id)} className="text-slate-600 hover:text-red-400 transition-colors p-1"><Trash2 className="w-4 h-4" /></button>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-[10px] uppercase font-bold text-slate-500 block">Type de seuil d'usure</label>
                          <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-700 w-full max-w-[200px]">
                            <button
                              onClick={() => updateThresholdType(comp.id, 'distance')}
                              className={`flex-1 py-1 rounded-md text-[10px] font-bold transition-all ${comp.thresholdType !== 'time' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                              Distance
                            </button>
                            <button
                              onClick={() => updateThresholdType(comp.id, 'time')}
                              className={`flex-1 py-1 rounded-md text-[10px] font-bold transition-all ${comp.thresholdType === 'time' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                              Durée
                            </button>
                          </div>
                        </div>

                        {comp.thresholdType === 'time' ? (
                          <div className="space-y-2">
                            <div className="flex justify-between text-[10px] uppercase font-bold text-slate-500">
                              <span>Seuil d'usure (mois)</span>
                              <span className="text-indigo-400">{comp.thresholdMonths || 12} mois</span>
                            </div>
                            <input type="range" min="1" max="60" step="1" value={comp.thresholdMonths || 12} onChange={e => updateThresholdMonths(comp.id, parseInt(e.target.value))} className="w-full accent-indigo-500" />
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex justify-between text-[10px] uppercase font-bold text-slate-500">
                              <span>Seuil d'usure (km)</span>
                              <span className="text-indigo-400">{comp.thresholdKm} km</span>
                            </div>
                            <input type="range" min="100" max="10000" step="100" value={comp.thresholdKm} onChange={e => updateThreshold(comp.id, parseInt(e.target.value))} className="w-full accent-indigo-500" />
                          </div>
                        )}

                        <div>
                          <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Référence de la pièce</label>
                          <input
                            type="text"
                            value={comp.partReference || ''}
                            placeholder="ex: Shimano HG-95, SRAM GX..."
                            onChange={e => updateReference(comp.id, e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:border-indigo-500 outline-none transition-colors"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Floating Action Button for Mobile */}
      <div className="md:hidden fixed bottom-24 right-6 z-40">
        <button
          onClick={() => {
            if (activeBike) {
              setActiveTab('history');
              document.getElementById('gpx-upload')?.click();
            } else {
              setIsAddingBike(true);
            }
          }}
          className="bg-indigo-600 p-4 rounded-2xl shadow-xl shadow-indigo-600/40 text-white"
        >
          <Plus className="w-8 h-8" />
        </button>
      </div>

      {/* Copyright Footer */}
      <footer className="md:ml-64 py-8 border-t border-slate-800 text-center text-slate-500 text-sm">
        <p>© {new Date().getFullYear()} VeloCheck - développé par Florian F.</p>
      </footer>
    </div>
  );
};

export default App;
