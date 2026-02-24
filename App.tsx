
import React, { useState, useEffect, useRef } from 'react';
import {
  Bike, Upload, BarChart3, Settings2, Sparkles, Plus, Trash2,
  ChevronRight, RefreshCcw, AlertTriangle, X, Check, Camera,
  ArrowLeft, LayoutGrid
} from 'lucide-react';
import { AppState, BikeProfile, ComponentStatus, GpxAnalysisResult } from './types';
import { DEFAULT_COMPONENTS } from './constants';
import { parseGpxFile } from './utils/gpxParser';
import ComponentCard from './components/ComponentCard';
import { getMaintenanceAdvice } from './services/geminiService';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(() => {
    try {
      const saved = localStorage.getItem('velocheck_v2_state');
      if (saved) {
        console.log("State loaded from localStorage");
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error("Error loading state from localStorage:", e);
    }
    return {
      bikes: [],
      activeBikeId: null
    };
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'settings' | 'garage'>('garage');
  const [isUploading, setIsUploading] = useState(false);
  const [advice, setAdvice] = useState<{ tips: string[], summary: string } | null>(null);
  const [isLoadingAdvice, setIsLoadingAdvice] = useState(false);

  // Formulaire nouveau vélo
  const [isAddingBike, setIsAddingBike] = useState(false);
  const [newBikeData, setNewBikeData] = useState({ name: '', brand: '', model: '', image: '' });

  // Formulaire nouveau composant
  const [isAddingComponent, setIsAddingComponent] = useState(false);
  const [newCompName, setNewCompName] = useState('');
  const [newCompThreshold, setNewCompThreshold] = useState(1000);
  const [newCompCategory, setNewCompCategory] = useState<ComponentStatus['category']>('drivetrain');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Persistence
  useEffect(() => {
    localStorage.setItem('velocheck_v2_state', JSON.stringify(state));
  }, [state]);

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
          elevationGain: analysis.elevationGain
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

  const resetComponent = (id: string) => {
    updateActiveBike(bike => ({
      ...bike,
      components: bike.components.map(c =>
        c.id === id ? { ...c, currentKm: 0, lastServiceDate: new Date().toISOString() } : c
      )
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

  const addComponent = () => {
    if (!newCompName.trim() || !activeBike) return;
    const newComponent: ComponentStatus = {
      id: crypto.randomUUID(),
      name: newCompName,
      currentKm: 0,
      thresholdKm: newCompThreshold,
      lastServiceDate: new Date().toISOString(),
      category: newCompCategory
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
    setNewBikeData({ name: '', brand: '', model: '', image: '' });
    setIsAddingBike(false);
    if (!state.activeBikeId) setActiveTab('dashboard');
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


  return (
    <div className="min-h-screen pb-20 md:pb-0 text-slate-50 bg-[#0f172a]">
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
              {!isAddingBike && (
                <button
                  onClick={() => setIsAddingBike(true)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all"
                >
                  <Plus className="w-5 h-5" /> Ajouter un vélo
                </button>
              )}
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

            {activeTab === 'history' && (
              <div className="space-y-10">
                <section className="bg-slate-800/40 p-10 rounded-3xl border-2 border-dashed border-slate-700 text-center group hover:border-indigo-500/50 transition-colors">
                  <input type="file" id="gpx-upload" className="hidden" multiple accept=".gpx" onChange={handleFileUpload} disabled={isUploading} />
                  <label htmlFor="gpx-upload" className="cursor-pointer flex flex-col items-center">
                    <div className={`p-6 rounded-2xl mb-4 transition-all ${isUploading ? 'bg-indigo-600/50 animate-pulse' : 'bg-slate-700 group-hover:bg-indigo-600'}`}>
                      <Upload className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-100 mb-2">{isUploading ? 'Analyse...' : 'Importer des sorties GPX'}</h3>
                    <p className="text-slate-400 max-w-sm">Les sorties seront assignées à : <span className="text-indigo-400 font-bold">{activeBike.name}</span></p>
                  </label>
                </section>
                <section>
                  <h2 className="text-2xl font-bold text-slate-100 mb-6">Activité de ce vélo</h2>
                  <div className="bg-slate-800/40 rounded-2xl border border-slate-700 divide-y divide-slate-700 overflow-hidden">
                    {activeBike.rides.length === 0 ? (
                      <div className="p-10 text-center text-slate-500">Aucune sortie pour ce vélo.</div>
                    ) : (
                      activeBike.rides.map(ride => (
                        <div key={ride.id} className="p-5 flex items-center justify-between hover:bg-slate-800/50">
                          <div className="flex items-center gap-4">
                            <div className="bg-slate-700 p-2 rounded-lg text-indigo-400"><Bike className="w-5 h-5" /></div>
                            <div>
                              <h4 className="font-semibold text-slate-100">{ride.name}</h4>
                              <p className="text-xs text-slate-500">{new Date(ride.date).toLocaleDateString('fr-FR')}</p>
                            </div>
                          </div>
                          <div className="flex gap-8 text-right">
                            <div><p className="text-xs text-slate-400 uppercase font-bold tracking-widest">Distance</p><p className="font-mono text-slate-200">{ride.distance.toFixed(1)} km</p></div>
                            <div><p className="text-xs text-slate-400 uppercase font-bold tracking-widest">D+</p><p className="font-mono text-slate-200">{ride.elevationGain.toFixed(0)} m</p></div>
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
                    <h2 className="text-2xl font-bold text-slate-100">Seuils de Maintenance</h2>
                    <p className="text-slate-400">Ajustez les réglages pour <span className="text-indigo-400 font-bold">{activeBike.name}</span>.</p>
                  </div>
                  <button onClick={() => setIsAddingComponent(!isAddingComponent)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 rounded-xl transition-all shadow-lg">
                    {isAddingComponent ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                    {isAddingComponent ? 'Annuler' : 'Ajouter un composant'}
                  </button>
                </header>

                {isAddingComponent && (
                  <div className="bg-slate-800 border border-indigo-500/30 p-6 rounded-2xl">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <input type="text" value={newCompName} onChange={e => setNewCompName(e.target.value)} placeholder="Nom (ex: Chaîne...)" className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2" />
                      <select value={newCompCategory} onChange={e => setNewCompCategory(e.target.value as any)} className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2">
                        <option value="drivetrain">Transmission</option>
                        <option value="suspension">Suspension</option>
                        <option value="tires">Pneus</option>
                        <option value="brakes">Freinage</option>
                      </select>
                      <div className="flex items-center gap-3">
                        <input type="range" min="100" max="5000" step="100" value={newCompThreshold} onChange={e => setNewCompThreshold(parseInt(e.target.value))} className="flex-1 accent-indigo-500" />
                        <button onClick={addComponent} disabled={!newCompName.trim()} className="bg-indigo-600 p-2 rounded-xl"><Check /></button>
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
                        <div className="flex items-center gap-3">
                          <span className="text-indigo-400 font-mono font-bold bg-indigo-500/10 px-3 py-1 rounded-lg">{comp.thresholdKm} km</span>
                          <button onClick={() => removeComponent(comp.id)} className="text-slate-600 hover:text-red-400 transition-colors p-1"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                      <input type="range" min="100" max="5000" step="100" value={comp.thresholdKm} onChange={e => updateThreshold(comp.id, parseInt(e.target.value))} className="w-full accent-indigo-500" />
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
