
import { ComponentStatus } from './types';

export const DEFAULT_COMPONENTS: ComponentStatus[] = [
  { id: 'chain', name: 'Chaîne', partReference: '', currentKm: 0, thresholdKm: 500, lastServiceDate: new Date().toISOString(), lastSafetyCheckDate: new Date().toISOString(), category: 'drivetrain', serviceHistory: [] },
  { id: 'fork', name: 'Fourche (Entretien 50h)', partReference: '', currentKm: 0, thresholdKm: 1000, lastServiceDate: new Date().toISOString(), lastSafetyCheckDate: new Date().toISOString(), category: 'suspension', serviceHistory: [] },
  { id: 'shock', name: 'Amortisseur arrière', partReference: '', currentKm: 0, thresholdKm: 1000, lastServiceDate: new Date().toISOString(), lastSafetyCheckDate: new Date().toISOString(), category: 'suspension', serviceHistory: [] },
  { id: 'tires-front', name: 'Pneu avant', partReference: '', currentKm: 0, thresholdKm: 1500, lastServiceDate: new Date().toISOString(), lastSafetyCheckDate: new Date().toISOString(), category: 'tires', serviceHistory: [] },
  { id: 'tires-rear', name: 'Pneu arrière', partReference: '', currentKm: 0, thresholdKm: 1000, lastServiceDate: new Date().toISOString(), lastSafetyCheckDate: new Date().toISOString(), category: 'tires', serviceHistory: [] },
  { id: 'brake-pads', name: 'Plaquettes de frein', partReference: '', currentKm: 0, thresholdKm: 800, lastServiceDate: new Date().toISOString(), lastSafetyCheckDate: new Date().toISOString(), category: 'brakes', serviceHistory: [] },
];

export const STATUS_COLORS = {
  safe: 'bg-green-500',
  warning: 'bg-amber-500',
  critical: 'bg-red-500',
};
