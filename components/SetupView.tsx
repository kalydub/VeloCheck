
import React, { useState, useRef } from 'react';
import { 
  BikeSetup, 
  BikeProfile 
} from '../types';
import { parseGpxFile } from '../utils/gpxParser';
import { 
  Plus, 
  Trash2, 
  Calendar, 
  Cloud, 
  Droplets, 
  Sun, 
  Settings2, 
  Info, 
  Brain, 
  ChevronDown, 
  ChevronUp,
  Activity,
  Maximize2,
  Minimize2,
  Gauge,
  MessageSquare,
  History,
  Lightbulb,
  Upload,
  Check,
  Zap,
  Save,
  X
} from 'lucide-react';

interface SetupViewProps {
  bike: BikeProfile;
  onAddSetup: (setup: BikeSetup) => void;
  onDeleteSetup: (id: string) => void;
}

const LEXICON = [
  {
    title: "SAG (Enfoncement statique)",
    description: "Le pourcentage d'enfoncement de la suspension sous le poids du pilote équipé, en position de roulage. Un réglage de base se situe souvent entre 25% et 30%.",
    impact: "Trop de SAG = vélo mou, talonne facilement. Trop peu = manque d'adhérence, vélo nerveux."
  },
  {
    title: "Rebound (Rebond / Détente)",
    description: "Vitesse à laquelle la suspension revient à sa position initiale après un choc.",
    impact: "Trop rapide = effet 'pogo', perte de contrôle sur les sauts. Trop lent = la suspension 's'assoit' (pack down) sur les chocs successifs."
  },
  {
    title: "LSC (Low Speed Compression)",
    description: "Gère les mouvements lents : freinage, pompage au pédalage, appuis en courbe.",
    impact: "Plus de clics (fermé) = vélo plus ferme sous le pilote, moins de plongée au freinage. Moins de clics = plus de confort, plus sensible."
  },
  {
    title: "HSC (High Speed Compression)",
    description: "Gère les chocs rapides et violents : grosses racines, réceptions de sauts, pierres.",
    impact: "Plus de clics = évite de talonner violemment. Moins de clics = absorbe mieux les gros impacts sans retour brusque dans les mains."
  }
];

const SetupView: React.FC<SetupViewProps> = ({ bike, onAddSetup, onDeleteSetup }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [showLexicon, setShowLexicon] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [isParsingGpx, setIsParsingGpx] = useState(false);
  const gpxInputRef = useRef<HTMLInputElement>(null);

  // AI Inputs
  const [userWeight, setUserWeight] = useState<number>(75);
  const [ridingStyle, setRidingStyle] = useState<'cool' | 'balanced' | 'aggressive'>('balanced');
  const [aiResult, setAiResult] = useState<{forkPSI: number, shockPSI: number, rebound: number, lsc: number, hsc: number} | null>(null);

  const [newSetup, setNewSetup] = useState<Omit<BikeSetup, 'id'>>({
    date: new Date().toISOString().split('T')[0],
    weather: 'dry',
    rideName: '',
    geometryModified: false,
    geometryDetails: '',
    forkPSI: 0,
    shockPSI: 0,
    sagPercentage: 25,
    reboundClicks: 0,
    lscClicks: 0,
    hscClicks: 0,
    comments: ''
  });

  const handleGpxUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsingGpx(true);
    try {
      const analysis = await parseGpxFile(file);
      setNewSetup(prev => ({
        ...prev,
        rideName: analysis.name,
        date: analysis.startTime.split('T')[0]
      }));
    } catch (error) {
      alert("Erreur lors de l'analyse du fichier GPX.");
    } finally {
      setIsParsingGpx(false);
    }
  };

  const calculateAiSetup = () => {
    // Basic logic for demonstration
    const factor = ridingStyle === 'aggressive' ? 1.15 : ridingStyle === 'cool' ? 0.9 : 1.0;
    
    // Simple heuristic for fork/shock based on weight
    const suggested = {
      forkPSI: Math.round(userWeight * 1.1 * factor),
      shockPSI: Math.round(userWeight * 2.6 * factor),
      rebound: ridingStyle === 'aggressive' ? 6 : ridingStyle === 'cool' ? 10 : 8,
      lsc: ridingStyle === 'aggressive' ? 4 : ridingStyle === 'cool' ? 12 : 8,
      hsc: ridingStyle === 'aggressive' ? 2 : ridingStyle === 'cool' ? 0 : 1
    };
    
    setAiResult(suggested);
  };

  const applyAiSetup = () => {
    if (!aiResult) return;
    setNewSetup(prev => ({
      ...prev,
      forkPSI: aiResult.forkPSI,
      shockPSI: aiResult.shockPSI,
      reboundClicks: aiResult.rebound,
      lscClicks: aiResult.lsc,
      hscClicks: aiResult.hsc
    }));
    setShowAI(false);
    setIsAdding(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddSetup({
      ...newSetup,
      id: crypto.randomUUID()
    });
    setIsAdding(false);
    setNewSetup({
      date: new Date().toISOString().split('T')[0],
      weather: 'dry',
      rideName: '',
      geometryModified: false,
      geometryDetails: '',
      forkPSI: 0,
      shockPSI: 0,
      sagPercentage: 25,
      reboundClicks: 0,
      lscClicks: 0,
      hscClicks: 0,
      comments: ''
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-white">Setup & Réglages</h2>
          <p className="text-slate-400">Optimisez le comportement de votre {bike.brand} {bike.model}.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setShowLexicon(!showLexicon)}
            className={`px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all border ${showLexicon ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'}`}
          >
            <Info className="w-5 h-5" /> <span className="hidden sm:inline">Lexique</span>
          </button>
          <button
            onClick={() => setShowAI(!showAI)}
            className={`px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all border ${showAI ? 'bg-indigo-600/40 text-white border-indigo-500' : 'bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border-indigo-500/20'}`}
          >
            <Brain className="w-5 h-5" /> <span className="hidden sm:inline">Calculateur IA</span>
          </button>
          <button
            onClick={() => setIsAdding(!isAdding)}
            className={`px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all shadow-lg ${isAdding ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20'}`}
          >
            {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-5 h-5" />}
            {isAdding ? 'Annuler' : 'Nouveau Setup'}
          </button>
        </div>
      </header>

      {/* Lexique Section */}
      {showLexicon && (
        <section className="bg-slate-800/50 border border-slate-700 rounded-3xl p-6 md:p-8 animate-in zoom-in-95 duration-200">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold flex items-center gap-2 text-white">
              <Lightbulb className="text-amber-400" /> Comprendre les réglages
            </h3>
            <button onClick={() => setShowLexicon(false)} className="text-slate-400 hover:text-white"><ChevronUp /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {LEXICON.map((item, index) => (
              <div key={index} className="bg-slate-900/50 p-5 rounded-2xl border border-white/5">
                <h4 className="font-bold text-indigo-400 mb-2">{item.title}</h4>
                <p className="text-slate-300 text-sm mb-3 leading-relaxed">{item.description}</p>
                <div className="bg-indigo-500/10 p-3 rounded-lg border border-indigo-500/20">
                  <p className="text-xs text-indigo-300 italic"><span className="font-bold">Effet :</span> {item.impact}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* AI Recommendation Section */}
      {showAI && (
        <section className="bg-indigo-900/20 border border-indigo-500/30 rounded-3xl p-6 md:p-8 animate-in zoom-in-95 duration-200">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold flex items-center gap-2 text-white">
              <Brain className="text-indigo-400" /> Assistant Setup Personnalisé
            </h3>
            <button onClick={() => setShowAI(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-4 flex items-center justify-between">
                  Votre poids (équipé) : <span className="text-indigo-400 font-bold">{userWeight} kg</span>
                </label>
                <input 
                  type="range" min="40" max="130" step="1" 
                  value={userWeight} 
                  onChange={e => setUserWeight(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-3">Style de pilotage</label>
                <div className="grid grid-cols-3 gap-3">
                  {(['cool', 'balanced', 'aggressive'] as const).map(style => (
                    <button
                      key={style}
                      onClick={() => setRidingStyle(style)}
                      className={`py-2 rounded-lg text-xs font-bold transition-all border ${ridingStyle === style ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
                    >
                      {style === 'cool' ? 'Tranquille' : style === 'balanced' ? 'Équilibré' : 'Engagé'}
                    </button>
                  ))}
                </div>
              </div>
              
              <button
                onClick={calculateAiSetup}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg"
              >
                <Zap className="w-4 h-4" /> Calculer ma base
              </button>
            </div>

            <div className="bg-slate-900/50 rounded-2xl p-6 border border-white/5 flex flex-col justify-center min-h-[200px]">
              {aiResult ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-800 border border-indigo-500/20 p-4 rounded-xl text-center">
                      <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Fourche</span>
                      <div className="text-2xl font-bold text-white">{aiResult.forkPSI} <span className="text-xs text-slate-400">PSI</span></div>
                    </div>
                    <div className="bg-slate-800 border border-indigo-500/20 p-4 rounded-xl text-center">
                      <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Amortisseur</span>
                      <div className="text-2xl font-bold text-white">{aiResult.shockPSI} <span className="text-xs text-slate-400">PSI</span></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-slate-800/50 p-2 rounded-lg">
                      <span className="text-[10px] text-slate-500 uppercase block mb-1">Rebond</span>
                      <div className="font-bold text-emerald-400">{aiResult.rebound}</div>
                    </div>
                    <div className="bg-slate-800/50 p-2 rounded-lg">
                      <span className="text-[10px] text-slate-500 uppercase block mb-1">LSC</span>
                      <div className="font-bold text-blue-400">{aiResult.lsc}</div>
                    </div>
                    <div className="bg-slate-800/50 p-2 rounded-lg">
                      <span className="text-[10px] text-slate-500 uppercase block mb-1">HSC</span>
                      <div className="font-bold text-purple-400">{aiResult.hsc}</div>
                    </div>
                  </div>
                  <button
                    onClick={applyAiSetup}
                    className="w-full py-2.5 bg-indigo-500/10 hover:bg-indigo-500 text-indigo-400 rounded-lg text-sm font-bold border border-indigo-500/20 transition-all flex items-center justify-center gap-2"
                  >
                    Appliquer au nouveau setup <Check className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="text-center text-slate-500 py-10">
                  <Brain className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">Paramétrez votre profil à gauche pour une suggestion personnalisée.</p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Add Setup Form */}
      {isAdding && (
        <section className="bg-slate-800 border border-indigo-500/30 rounded-[2.5rem] p-6 md:p-10 duration-300 animate-in slide-in-from-top-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <h3 className="text-2xl font-bold flex items-center gap-2 text-white"><Plus className="text-indigo-400" /> Nouvel enregistrement</h3>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <select
                onChange={(e) => {
                  const ride = bike.rides.find(r => r.id === e.target.value);
                  if (ride) {
                    setNewSetup(prev => ({
                      ...prev,
                      rideName: ride.name,
                      date: ride.date.split('T')[0]
                    }));
                  }
                }}
                className="flex-1 bg-slate-900 border border-slate-700 text-slate-300 px-4 py-2 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 transition-all appearance-none cursor-pointer pr-8"
                style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%2364748b\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'org.lucide.ChevronDown\' /%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '1rem' }}
              >
                <option value="">Sorties enregistrées...</option>
                {bike.rides?.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 30).map(ride => (
                  <option key={ride.id} value={ride.id}>
                    {new Date(ride.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} - {ride.name}
                  </option>
                ))}
              </select>

              <input 
                type="file" 
                accept=".gpx" 
                ref={gpxInputRef}
                onChange={handleGpxUpload}
                className="hidden" 
              />
              <button
                type="button"
                onClick={() => gpxInputRef.current?.click()}
                disabled={isParsingGpx}
                className="bg-slate-900 border border-slate-700 hover:border-indigo-500 text-slate-300 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm"
              >
                {isParsingGpx ? <Activity className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Charger un GPX
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Nom de la sortie / Lieu</label>
                  <input
                    type="text"
                    required
                    value={newSetup.rideName}
                    onChange={e => setNewSetup(prev => ({ ...prev, rideName: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-5 py-4 focus:outline-none focus:border-indigo-500 transition-colors text-white text-lg font-medium"
                    placeholder="Ex: Station des Arcs, Session racines..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Date</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type="date"
                        value={newSetup.date}
                        onChange={e => setNewSetup(prev => ({ ...prev, date: e.target.value }))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:border-indigo-500 transition-colors text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Météo</label>
                    <select
                      value={newSetup.weather}
                      onChange={e => setNewSetup(prev => ({ ...prev, weather: e.target.value as 'dry' | 'wet' }))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-5 py-4 focus:outline-none focus:border-indigo-500 transition-colors text-white appearance-none"
                    >
                      <option value="dry">☀️ Sec</option>
                      <option value="wet">🌧️ Humide / Boue</option>
                    </select>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-slate-400 flex items-center gap-2">
                      <Settings2 className="w-5 h-5 text-indigo-400" /> Suggestion Géo ?
                    </label>
                    <div 
                      onClick={() => setNewSetup(prev => ({ ...prev, geometryModified: !prev.geometryModified }))}
                      className={`w-14 h-7 rounded-full p-1 cursor-pointer transition-colors ${newSetup.geometryModified ? 'bg-indigo-600' : 'bg-slate-700'}`}
                    >
                      <div className={`bg-white w-5 h-5 rounded-full transition-transform ${newSetup.geometryModified ? 'translate-x-7' : ''}`} />
                    </div>
                  </div>
                  {newSetup.geometryModified && (
                    <input
                      type="text"
                      value={newSetup.geometryDetails}
                      onChange={e => setNewSetup(prev => ({ ...prev, geometryDetails: e.target.value }))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-5 py-4 focus:outline-none focus:border-indigo-500 transition-colors mt-2 animate-in fade-in placeholder-slate-600"
                      placeholder="Ex: Flip-chip Low, Angle set à 64°..."
                    />
                  )}
                </div>
              </div>

              <div className="bg-slate-900/50 p-8 rounded-[2rem] border border-slate-700 space-y-8">
                <h4 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2 mb-2">
                  <Activity className="w-4 h-4 text-indigo-400" /> Suspensions & Amorti
                </h4>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Fourche (PSI)</label>
                    <div className="relative">
                      <Gauge className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                      <input
                        type="number"
                        value={newSetup.forkPSI || ''}
                        onChange={e => setNewSetup(prev => ({ ...prev, forkPSI: parseInt(e.target.value) }))}
                        className="w-full bg-slate-800 border border-slate-700 rounded-2xl pl-12 pr-4 py-3 text-white focus:border-indigo-500 outline-none font-bold text-lg"
                        placeholder="80"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Amorto (PSI)</label>
                    <div className="relative">
                      <Gauge className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                      <input
                        type="number"
                        value={newSetup.shockPSI || ''}
                        onChange={e => setNewSetup(prev => ({ ...prev, shockPSI: parseInt(e.target.value) }))}
                        className="w-full bg-slate-800 border border-slate-700 rounded-2xl pl-12 pr-4 py-3 text-white focus:border-indigo-500 outline-none font-bold text-lg"
                        placeholder="195"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                   <div className="flex justify-between items-center">
                     <label className="text-xs font-bold text-slate-500 uppercase">Mesure du SAG (%)</label>
                     <span className="text-sm font-black text-indigo-400 bg-indigo-600/10 px-3 py-1 rounded-full border border-indigo-500/20">{newSetup.sagPercentage}%</span>
                   </div>
                   <input 
                    type="range" 
                    min="15" max="40" step="1" 
                    value={newSetup.sagPercentage}
                    onChange={e => setNewSetup(prev => ({ ...prev, sagPercentage: parseInt(e.target.value) }))}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500" 
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2 text-center">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Rebond</label>
                    <input
                      type="number"
                      value={newSetup.reboundClicks || ''}
                      onChange={e => setNewSetup(prev => ({ ...prev, reboundClicks: parseInt(e.target.value) }))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-3 text-center text-emerald-400 font-black text-xl"
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2 text-center">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-tighter">LSC</label>
                    <input
                      type="number"
                      value={newSetup.lscClicks || ''}
                      onChange={e => setNewSetup(prev => ({ ...prev, lscClicks: parseInt(e.target.value) }))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-3 text-center text-blue-400 font-black text-xl"
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2 text-center">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-tighter">HSC</label>
                    <input
                      type="number"
                      value={newSetup.hscClicks || ''}
                      onChange={e => setNewSetup(prev => ({ ...prev, hscClicks: parseInt(e.target.value) }))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-3 text-center text-purple-400 font-black text-xl"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-400 flex items-center gap-2 px-1">
                <MessageSquare className="w-5 h-5 text-indigo-400" /> Impressions & Ressenti Global
              </label>
              <textarea
                value={newSetup.comments}
                onChange={e => setNewSetup(prev => ({ ...prev, comments: e.target.value }))}
                className="w-full bg-slate-900 border border-slate-700 rounded-[1.5rem] px-6 py-6 focus:outline-none focus:border-indigo-500 transition-colors min-h-[160px] resize-none text-slate-200"
                placeholder="Décrivez vos sensations lors de la sortie... Le vélo talonne-t-il sur les gros sauts ? Est-il trop ferme sur les racines ? Plonge-t-il trop au freinage ?"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-6">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="flex-1 py-5 bg-slate-900/50 hover:bg-slate-800 text-slate-400 hover:text-white rounded-[1.25rem] font-bold transition-all border border-slate-700"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="flex-[2] py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[1.25rem] font-bold shadow-2xl shadow-indigo-600/30 transition-all flex items-center justify-center gap-3 text-lg"
              >
                <Save className="w-6 h-6" /> Enregistrer ce réglage
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Setups List */}
      <section className="space-y-6">
        <div className="flex items-center justify-between px-4">
          <h3 className="text-xl font-bold flex items-center gap-3 text-white">
            <History className="text-indigo-500 w-6 h-6" /> Historique des sorties
          </h3>
          <span className="text-xs bg-slate-800 px-3 py-1 rounded-full text-slate-400 font-bold border border-slate-700">{bike.setups?.length || 0} setups</span>
        </div>
        
        {(!bike.setups || bike.setups.length === 0) ? (
          <div className="bg-slate-800/10 border border-dashed border-slate-700 rounded-[3rem] p-20 text-center">
            <div className="bg-slate-800 w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-inner">
              <Settings2 className="w-12 h-12 text-slate-600" />
            </div>
            <h4 className="text-slate-300 font-bold text-xl mb-3">Aucun réglage mémorisé</h4>
            <p className="text-slate-500 max-w-sm mx-auto leading-relaxed">
              Vos réglages de suspension sont précieux. Enregistrez-les pour mieux comprendre l'impact de chaque clic.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8">
            {bike.setups.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((setup) => (
              <div key={setup.id} className="bg-slate-800/40 border border-slate-700 rounded-[2.5rem] p-8 hover:bg-slate-800/60 transition-all group relative overflow-hidden">
                <div className="absolute -right-20 -top-20 bg-indigo-600/5 w-60 h-60 rounded-full blur-3xl group-hover:bg-indigo-600/10 transition-colors" />
                
                <div className="flex flex-col lg:flex-row justify-between gap-10 relative z-10">
                  <div className="flex-1 space-y-6">
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="flex items-center gap-2 bg-slate-900/80 px-4 py-2 rounded-full border border-white/5">
                        <Calendar className="w-4 h-4 text-indigo-400" />
                        <span className="text-xs font-bold text-slate-200">{new Date(setup.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                      </div>
                      <div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${setup.weather === 'dry' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-blue-500/10 text-blue-500 border-blue-500/20'}`}>
                        {setup.weather === 'dry' ? <Sun className="w-4 h-4" /> : <Droplets className="w-4 h-4" />}
                        <span className="text-xs font-bold uppercase tracking-widest">{setup.weather === 'dry' ? 'Sec' : 'Humide'}</span>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-3xl font-black text-white group-hover:text-indigo-400 transition-colors leading-tight tracking-tight">{setup.rideName}</h4>
                      {setup.geometryModified && (
                        <div className="flex items-center gap-2 mt-3 bg-amber-500/10 text-amber-500 text-[10px] font-bold uppercase px-3 py-1.5 rounded-full border border-amber-500/20 w-fit italic">
                          <Settings2 className="w-3.5 h-3.5" /> Géo modifiée : {setup.geometryDetails}
                        </div>
                      )}
                    </div>

                    <div className="bg-slate-900/60 p-6 rounded-[1.5rem] border border-white/5 relative">
                       <MessageSquare className="w-5 h-5 text-indigo-600/50 absolute top-4 right-4" />
                       <p className="text-sm text-slate-400 leading-relaxed max-w-2xl italic pr-6">
                        "{setup.comments || "Aucune note sur ce setup."}"
                       </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row gap-6 lg:min-w-[320px]">
                    <div className="flex-1 bg-slate-900/80 p-6 rounded-3xl border border-white/5 space-y-5 shadow-inner">
                      <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest border-b border-white/5 pb-3">Pressions (PSI)</div>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                             <div className="w-2 h-2 rounded-full bg-indigo-500" />
                             <span className="text-xs text-slate-400 font-medium">Fourche</span>
                          </div>
                          <span className="text-lg font-black text-white bg-indigo-600/20 px-3 py-1 rounded-xl border border-indigo-500/10">{setup.forkPSI}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                             <div className="w-2 h-2 rounded-full bg-purple-500" />
                             <span className="text-xs text-slate-400 font-medium">Amortisseur</span>
                          </div>
                          <span className="text-lg font-black text-white bg-indigo-600/20 px-3 py-1 rounded-xl border border-indigo-500/10">{setup.shockPSI}</span>
                        </div>
                      </div>
                      <div className="pt-3 flex justify-between items-center border-t border-white/5">
                         <span className="text-[10px] text-slate-500 uppercase font-black">SAG Effectif</span>
                         <span className="text-sm font-black text-indigo-400">{setup.sagPercentage}%</span>
                      </div>
                    </div>

                    <div className="flex-1 bg-slate-900/80 p-6 rounded-3xl border border-white/5 space-y-5 shadow-inner">
                      <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest border-b border-white/5 pb-3 text-center">Hydraulique (Clicks)</div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="text-center group/click">
                          <div className="text-[10px] text-emerald-500 font-black mb-2">REBOND</div>
                          <div className="bg-slate-800 h-14 flex items-center justify-center rounded-2xl text-2xl font-black text-emerald-400 border border-emerald-500/10 group-hover/click:scale-105 transition-transform">{setup.reboundClicks}</div>
                        </div>
                        <div className="text-center group/click">
                          <div className="text-[10px] text-blue-500 font-black mb-2">LSC</div>
                          <div className="bg-slate-800 h-14 flex items-center justify-center rounded-2xl text-2xl font-black text-blue-400 border border-blue-500/10 group-hover/click:scale-105 transition-transform">{setup.lscClicks}</div>
                        </div>
                        <div className="text-center group/click">
                          <div className="text-[10px] text-purple-500 font-black mb-2">HSC</div>
                          <div className="bg-slate-800 h-14 flex items-center justify-center rounded-2xl text-2xl font-black text-purple-400 border border-purple-500/10 group-hover/click:scale-105 transition-transform">{setup.hscClicks}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center absolute top-8 right-8 lg:static">
                    <button 
                      onClick={() => onDeleteSetup(setup.id)}
                      className="p-4 text-slate-600 hover:text-red-500 hover:bg-red-500/10 rounded-[1.5rem] transition-all"
                      title="Supprimer ce setup"
                    >
                      <Trash2 className="w-6 h-6" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default SetupView;
