
import React from 'react';
import { ComponentStatus } from '../types';
import { RefreshCcw, AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface ComponentCardProps {
  component: ComponentStatus;
  onReset: (id: string) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  'drivetrain': 'Transmission',
  'suspension': 'Suspension',
  'tires': 'Pneus',
  'brakes': 'Freinage'
};

const ComponentCard: React.FC<ComponentCardProps> = ({ component, onReset }) => {
  const percentage = Math.min((component.currentKm / component.thresholdKm) * 100, 100);
  
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

  return (
    <div className="bg-slate-800 rounded-xl p-5 border border-slate-700 shadow-lg hover:border-slate-600 transition-all">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-100">{component.name}</h3>
          <p className="text-xs text-slate-400 uppercase tracking-wider">
            {CATEGORY_LABELS[component.category] || component.category}
          </p>
        </div>
        <div className={textColor}>
          {icon}
        </div>
      </div>

      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-slate-300">{component.currentKm.toFixed(1)} / {component.thresholdKm} km</span>
          <span className={`font-semibold ${textColor}`}>{Math.round(percentage)}%</span>
        </div>
        <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 ease-out ${statusColor}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      <div className="flex justify-between items-center pt-2">
        <span className="text-xs text-slate-500">Entretien : {new Date(component.lastServiceDate).toLocaleDateString('fr-FR')}</span>
        <button 
          onClick={() => onReset(component.id)}
          className="flex items-center gap-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-md text-sm transition-colors"
        >
          <RefreshCcw className="w-3.5 h-3.5" />
          Réinitialiser
        </button>
      </div>
    </div>
  );
};

export default ComponentCard;
