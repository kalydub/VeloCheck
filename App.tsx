
import React, { useState, useEffect, useCallback } from 'react';
import { Bike, Upload, BarChart3, Settings2, Sparkles, Plus, Trash2, ChevronRight, RefreshCcw, AlertTriangle } from 'lucide-react';
import { AppState, ComponentStatus, GpxAnalysisResult } from './types';
import { DEFAULT_COMPONENTS } from './constants';
import { parseGpxFile } from './utils/gpxParser';
import ComponentCard from './components/ComponentCard';
import { getMaintenanceAdvice } from './services/geminiService';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('velocheck_state');
    if (saved) return JSON.parse(saved);
    return {
      components: DEFAULT_COMPONENTS,
      rides: [],
      totalDistance: 0,
      totalElevation: 0
    };
  });

  const [isUploading, setIsUploading] = useState(false);
  const [advice, setAdvice] = useState<{ tips: string[], summary: string } | null>(null);
  const [isLoadingAdvice, setIsLoadingAdvice] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'settings'>('dashboard');

  // Persistence
  useEffect(() => {
    localStorage.setItem('velocheck_state', JSON.stringify(state));
  }, [state]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

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

      setState(prev => ({
        ...prev,
        rides: [...newRides, ...prev.rides],
        totalDistance: prev.totalDistance + addedDistance,
        totalElevation: prev.totalElevation + addedElevation,
        components: prev.components.map(c => ({
          ...c,
          currentKm: c.currentKm + addedDistance
        }))
      }));
    } catch (error) {
      alert("Erreur lors de l'analyse des fichiers GPX. Certains fichiers sont peut-être corrompus.");
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const resetComponent = (id: string) => {
    setState(prev => ({
      ...prev,
      components: prev.components.map(c => 
        c.id === id ? { ...c, currentKm: 0, lastServiceDate: new Date().toISOString() } : c
      )
    }));
  };

  const updateThreshold = (id: string, newThreshold: number) => {
    setState(prev => ({
      ...prev,
      components: prev.components.map(c => 
        c.id === id ? { ...c, thresholdKm: newThreshold } : c
      )
    }));
  };

  const fetchAdvice = async () => {
    setIsLoadingAdvice(true);
    const result = await getMaintenanceAdvice(state);
    setAdvice(result);
    setIsLoadingAdvice(false);
  };

  return (
    <div className="min-h-screen pb-20 md:pb-0 text-slate-50">
      {/* Barre de navigation latérale / inférieure */}
      <nav className="fixed bottom-0 left-0 right-0 md:top-0 md:left-0 md:bottom-0 md:w-64 bg-slate-900 border-t md:border-r border-slate-800 z-50">
        <div className="hidden md:flex p-6 items-center gap-3 border-b border-slate-800 mb-6">
          <div className="bg-indigo-600 p-2 rounded-lg text-white">
            <Bike className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">VeloCheck</h1>
        </div>
        
        <div className="flex md:flex-col justify-around md:justify-start p-2 md:p-4 gap-2">
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
            <span className="hidden md:block font-medium">Importer Sorties</span>
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-3 p-3 rounded-lg transition-colors w-full ${activeTab === 'settings' ? 'bg-indigo-600/20 text-indigo-400' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            <Settings2 className="w-5 h-5" />
            <span className="hidden md:block font-medium">Seuils d'usure</span>
          </button>
        </div>
      </nav>

      {/* Zone de contenu principale */}
      <main className="md:ml-64 p-6 md:p-10 max-w-7xl mx-auto">
        
        {/* Statistiques d'en-tête */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 backdrop-blur-sm">
            <p className="text-slate-400 text-sm font-medium mb-1">Distance Totale</p>
            <h2 className="text-4xl font-bold text-slate-50">{state.totalDistance.toFixed(1)} <span className="text-lg font-normal text-slate-400">km</span></h2>
          </div>
          <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 backdrop-blur-sm">
            <p className="text-slate-400 text-sm font-medium mb-1">Dénivelé Total (D+)</p>
            <h2 className="text-4xl font-bold text-slate-50">{state.totalElevation.toFixed(0)} <span className="text-lg font-normal text-slate-400">m</span></h2>
          </div>
          <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 backdrop-blur-sm relative overflow-hidden group">
            <div className="relative z-10">
              <p className="text-slate-400 text-sm font-medium mb-1">Sorties Enregistrées</p>
              <h2 className="text-4xl font-bold text-slate-50">{state.rides.length}</h2>
            </div>
            <Bike className="absolute -right-4 -bottom-4 w-24 h-24 text-slate-700/20 group-hover:text-indigo-500/10 transition-colors" />
          </div>
        </div>

        {activeTab === 'dashboard' && (
          <div className="space-y-10">
            {/* Grille des composants */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
                  État des composants
                  <span className="text-xs bg-slate-700 px-2 py-0.5 rounded text-slate-400 font-normal uppercase tracking-wider">Temps réel</span>
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {state.components.map(comp => (
                  <ComponentCard 
                    key={comp.id} 
                    component={comp} 
                    onReset={resetComponent} 
                  />
                ))}
              </div>
            </section>

            {/* Section IA Maintenance */}
            <section className="bg-gradient-to-br from-indigo-900/30 to-purple-900/30 rounded-3xl p-8 border border-indigo-500/20 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-10 pointer-events-none opacity-10">
                <Sparkles className="w-40 h-40 text-indigo-400" />
              </div>
              
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-indigo-500 p-2 rounded-xl">
                    <Sparkles className="text-white w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">IA d'Entretien Intelligent</h2>
                    <p className="text-indigo-200/60 text-sm">Conseils personnalisés par Gemini</p>
                  </div>
                </div>

                {!advice && !isLoadingAdvice && (
                  <button 
                    onClick={fetchAdvice}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 px-8 rounded-xl transition-all shadow-lg hover:shadow-indigo-500/25 active:scale-95"
                  >
                    Analyser l'état du vélo
                  </button>
                )}

                {isLoadingAdvice && (
                  <div className="flex items-center gap-3 text-indigo-200 animate-pulse">
                    <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                    Analyse de vos habitudes de roulage en cours...
                  </div>
                )}

                {advice && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    <div className="bg-slate-900/40 p-5 rounded-2xl border border-white/5">
                      <p className="text-indigo-100 italic text-lg">"{advice.summary}"</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {advice.tips.map((tip, idx) => (
                        <div key={idx} className="flex gap-4 p-4 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                          <div className="bg-indigo-500/20 text-indigo-400 w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                            {idx + 1}
                          </div>
                          <p className="text-slate-200 leading-relaxed">{tip}</p>
                        </div>
                      ))}
                    </div>
                    <button 
                      onClick={fetchAdvice}
                      className="text-indigo-400 hover:text-indigo-300 text-sm font-medium flex items-center gap-1 mt-2"
                    >
                      Actualiser les conseils <RefreshCcw className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-10">
             <section className="bg-slate-800/40 p-10 rounded-3xl border-2 border-dashed border-slate-700 text-center group hover:border-indigo-500/50 transition-colors">
                <input 
                  type="file" 
                  id="gpx-upload" 
                  className="hidden" 
                  multiple 
                  accept=".gpx"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                />
                <label htmlFor="gpx-upload" className="cursor-pointer flex flex-col items-center">
                  <div className={`p-6 rounded-2xl mb-4 transition-all ${isUploading ? 'bg-indigo-600/50 animate-pulse' : 'bg-slate-700 group-hover:bg-indigo-600'}`}>
                    <Upload className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-100 mb-2">
                    {isUploading ? 'Analyse des fichiers GPX...' : 'Importer des sorties GPX'}
                  </h3>
                  <p className="text-slate-400 max-w-sm">
                    Faites glisser vos fichiers .gpx ici ou cliquez pour parcourir. La distance et le dénivelé seront calculés automatiquement.
                  </p>
                </label>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-100 mb-6">Activité récente</h2>
              <div className="bg-slate-800/40 rounded-2xl border border-slate-700 divide-y divide-slate-700 overflow-hidden">
                {state.rides.length === 0 ? (
                  <div className="p-10 text-center text-slate-500">Aucune sortie importée pour le moment.</div>
                ) : (
                  state.rides.map(ride => (
                    <div key={ride.id} className="p-5 flex items-center justify-between hover:bg-slate-800/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="bg-slate-700 p-2 rounded-lg text-indigo-400">
                          <Bike className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-100">{ride.name}</h4>
                          <p className="text-xs text-slate-500">{new Date(ride.date).toLocaleDateString('fr-FR')} · {new Date(ride.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>
                      <div className="flex gap-8 text-right">
                        <div>
                          <p className="text-xs text-slate-400 uppercase font-bold tracking-widest">Distance</p>
                          <p className="font-mono text-slate-200">{ride.distance.toFixed(1)} km</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 uppercase font-bold tracking-widest">D+</p>
                          <p className="font-mono text-slate-200">{ride.elevationGain.toFixed(0)} m</p>
                        </div>
                        <div className="hidden sm:flex items-center">
                          <ChevronRight className="w-5 h-5 text-slate-600" />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {state.rides.length > 0 && (
                <button 
                  onClick={() => setState(prev => ({...prev, rides: [], totalDistance: 0, totalElevation: 0, components: prev.components.map(c => ({...c, currentKm: 0}))}))}
                  className="mt-6 text-red-400 hover:text-red-300 text-sm flex items-center gap-1 ml-auto"
                >
                  <Trash2 className="w-4 h-4" /> Effacer tout l'historique
                </button>
              )}
            </section>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-8">
            <header>
              <h2 className="text-2xl font-bold text-slate-100">Seuils de Maintenance</h2>
              <p className="text-slate-400">Ajustez les distances de déclenchement d'alertes en fonction de votre pratique et de la qualité de vos pièces.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {state.components.map(comp => (
                <div key={comp.id} className="bg-slate-800/60 p-6 rounded-2xl border border-slate-700">
                  <div className="flex justify-between items-center mb-4">
                    <label className="text-slate-200 font-bold">{comp.name}</label>
                    <span className="text-indigo-400 font-mono font-bold bg-indigo-500/10 px-3 py-1 rounded-lg">
                      {comp.thresholdKm} km
                    </span>
                  </div>
                  <input 
                    type="range" 
                    min="100" 
                    max="5000" 
                    step="100"
                    value={comp.thresholdKm}
                    onChange={(e) => updateThreshold(comp.id, parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                  <div className="flex justify-between text-xs text-slate-500 mt-2">
                    <span>Performance (100km)</span>
                    <span>Longévité (5000km)</span>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl flex gap-3">
              <AlertTriangle className="text-amber-500 w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-200/80">
                Note : Ces seuils sont des estimations. Des conditions difficiles (boue, sable, dénivelé excessif) peuvent accélérer l'usure. Consultez le manuel fabricant pour des recommandations précises.
              </p>
            </div>
          </div>
        )}

      </main>

      {/* Bouton d'action flottant pour mobile */}
      <div className="md:hidden fixed bottom-24 right-6 z-40">
        <button 
          onClick={() => { setActiveTab('history'); document.getElementById('gpx-upload')?.click(); }}
          className="bg-indigo-600 p-4 rounded-2xl shadow-xl shadow-indigo-600/40 text-white"
        >
          <Plus className="w-8 h-8" />
        </button>
      </div>
    </div>
  );
};

export default App;
