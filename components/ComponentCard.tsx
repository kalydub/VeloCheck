
import React, { useState } from 'react';
import { ComponentStatus } from '../types';
import { RefreshCcw, AlertTriangle, CheckCircle, Info, X, Check, DollarSign, StickyNote, Tag } from 'lucide-react';

interface ComponentCardProps {
  component: ComponentStatus;
  onReset: (id: string, price?: number, note?: string) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  'drivetrain': 'Transmission',
  'suspension': 'Suspension',
  'tires': 'Pneus',
  'brakes': 'Freinage'
};

const ComponentCard: React.FC<ComponentCardProps> = ({ component, onReset }) => {
  const [showResetForm, setShowResetForm] = useState(false);
  const [resetData, setResetData] = useState({ price: '', note: '' });

  const isTimeThreshold = component.thresholdType === 'time';

  let percentage = 0;
  let displayValue = '';
  let displayThreshold = '';

  if (isTimeThreshold) {
    const lastService = new Date(component.lastServiceDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - lastService.getTime());
    const diffMonths = diffTime / (1000 * 60 * 60 * 24 * 30.44); // Average month length
    const thresholdMonths = component.thresholdMonths || 12;
    percentage = Math.min((diffMonths / thresholdMonths) * 100, 100);
    displayValue = `${diffMonths.toFixed(1)} mois`;
    displayThreshold = `${thresholdMonths} mois`;
  } else {
    percentage = Math.min((component.currentKm / component.thresholdKm) * 100, 100);
    displayValue = `${component.currentKm.toFixed(1)} km`;
    displayThreshold = `${component.thresholdKm} km`;
  }

  let statusColor = 'bg-green-500';
  let textColor = 'text-green-400';
  let icon = <CheckCircle className="w-5 h-5" />;

  if (percentage >= 90) {
    statusColor = 'bg-red-500';
    textColor = 'text-red-400';
    icon = <AlertTriangle className="w-5 h-5" />;
  } else if (percentage >= 70) {
    statusColor = 'bg-amber-500';
    textColor = 'text-amber-400';
    icon = <Info className="w-5 h-5" />;
  }

  const handleResetSubmit = () => {
    onReset(component.id, parseFloat(resetData.price) || undefined, resetData.note || undefined);
    setShowResetForm(false);
    setResetData({ price: '', note: '' });
  };

  return (
    <div className="bg-slate-800 rounded-xl p-5 border border-slate-700 shadow-lg hover:border-slate-600 transition-all relative">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="text-lg font-bold text-slate-100">{component.name}</h3>
          <div className="flex items-center gap-2">
            <p className="text-xs text-slate-400 uppercase tracking-wider">
              {CATEGORY_LABELS[component.category] || component.category}
            </p>
            {component.partReference && (
              <span className="flex items-center gap-1 text-[10px] bg-slate-700/50 text-slate-300 px-1.5 py-0.5 rounded border border-white/5">
                <Tag className="w-2.5 h-2.5" /> {component.partReference}
              </span>
            )}
          </div>
        </div>
        <div className={textColor}>
          {icon}
        </div>
      </div>

      <div className="mb-4 mt-2">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-slate-300">{displayValue} / {displayThreshold}</span>
          <span className={`font-semibold ${textColor}`}>{Math.round(percentage)}%</span>
        </div>
        <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ease-out ${statusColor}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {showResetForm ? (
        <div className="mt-4 p-4 bg-slate-900/80 rounded-xl border border-indigo-500/30 animate-in fade-in zoom-in duration-200">
          <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <RefreshCcw className="w-4 h-4 text-indigo-400" /> Nouvel Entretien
          </h4>
          <div className="space-y-3">
            <div className="relative">
              <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input
                type="number"
                placeholder="Prix (€)"
                value={resetData.price}
                onChange={e => setResetData(prev => ({ ...prev, price: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:border-indigo-500 outline-none"
              />
            </div>
            <div className="relative">
              <StickyNote className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Note (ex: marque, modèle...)"
                value={resetData.note}
                onChange={e => setResetData(prev => ({ ...prev, note: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:border-indigo-500 outline-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleResetSubmit}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" /> Valider
              </button>
              <button
                onClick={() => setShowResetForm(false)}
                className="bg-slate-700 hover:bg-slate-600 text-white p-2 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex justify-between items-center pt-2">
          <span className="text-xs text-slate-500">Dernier : {new Date(component.lastServiceDate).toLocaleDateString('fr-FR')}</span>
          <button
            onClick={() => setShowResetForm(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-400 hover:text-white rounded-md text-sm transition-all shadow-sm"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
            Réinitialiser
          </button>
        </div>
      )}

      {component.serviceHistory && component.serviceHistory.length > 0 && !showResetForm && (
        <div className="mt-4 pt-4 border-t border-slate-700/50">
          <p className="text-[10px] text-slate-500 uppercase font-bold mb-2 tracking-widest">Historique des entretiens</p>
          <div className="space-y-2 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
            {component.serviceHistory.map((entry, idx) => (
              <div key={idx} className="bg-slate-900/50 p-2 rounded border border-white/5 space-y-1">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-slate-400">{new Date(entry.date).toLocaleDateString('fr-FR')}</span>
                  <span className="font-mono font-bold text-indigo-400">{entry.kmAtService.toFixed(0)} km</span>
                </div>
                {(entry.price || entry.note) && (
                  <div className="flex justify-between items-start text-[10px] pt-1 border-t border-white/5">
                    {entry.note ? <span className="text-slate-500 italic flex-1 truncate mr-2">"{entry.note}"</span> : <span></span>}
                    {entry.price && <span className="text-emerald-400 font-bold">{entry.price} €</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ComponentCard;
