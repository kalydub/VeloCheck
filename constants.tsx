
import { ComponentStatus } from './types';

export const DEFAULT_COMPONENTS: ComponentStatus[] = [
  { id: 'chain', name: 'Chaîne', currentKm: 0, thresholdKm: 500, lastServiceDate: new Date().toISOString(), category: 'drivetrain' },
  { id: 'fork', name: 'Fourche (Entretien 50h)', currentKm: 0, thresholdKm: 1000, lastServiceDate: new Date().toISOString(), category: 'suspension' },
  { id: 'shock', name: 'Amortisseur arrière', currentKm: 0, thresholdKm: 1000, lastServiceDate: new Date().toISOString(), category: 'suspension' },
  { id: 'tires-front', name: 'Pneu avant', currentKm: 0, thresholdKm: 1500, lastServiceDate: new Date().toISOString(), category: 'tires' },
  { id: 'tires-rear', name: 'Pneu arrière', currentKm: 0, thresholdKm: 1000, lastServiceDate: new Date().toISOString(), category: 'tires' },
  { id: 'brake-pads', name: 'Plaquettes de frein', currentKm: 0, thresholdKm: 800, lastServiceDate: new Date().toISOString(), category: 'brakes' },
];

export const STATUS_COLORS = {
  safe: 'bg-green-500',
  warning: 'bg-amber-500',
  critical: 'bg-red-500',
};
