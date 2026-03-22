
export interface ServiceHistoryEntry {
  date: string;
  kmAtService: number;
  price?: number;
  note?: string;
}

export interface ComponentStatus {
  id: string;
  name: string;
  partReference?: string;
  currentKm: number;
  thresholdKm: number;
  thresholdMonths?: number;
  thresholdType: 'distance' | 'time';
  lastServiceDate: string;
  lastSafetyCheckDate?: string;
  category: 'drivetrain' | 'suspension' | 'tires' | 'brakes';
  serviceHistory: ServiceHistoryEntry[];
}

export interface RideData {
  id: string;
  name: string;
  date: string;
  distance: number;
  elevationGain: number;
  coordinates?: [number, number][]; // [lat, lng] array
  stravaId?: string;
}

export interface BikeSetup {
  id: string;
  date: string;
  weather: 'dry' | 'wet';
  rideName: string;
  gpxPath?: string;
  geometryModified: boolean;
  geometryDetails?: string;
  forkPSI: number;
  forkHighPSI?: number;
  forkLowPSI?: number;
  forkSpringRate?: number;
  forkRebound: number;
  forkLSC: number;
  forkHSC: number;
  shockPSI: number;
  shockSpringRate?: number;
  shockRebound: number;
  shockLSC: number;
  shockHSC: number;
  sagPercentage: number;
  comments: string;
}

export interface BikeProfile {
  id: string;
  name: string;
  brand: string;
  model: string;
  purchasePrice: number;
  image?: string; // base64 string
  components: ComponentStatus[];
  rides: RideData[];
  setups: BikeSetup[];
  totalDistance: number;
  totalElevation: number;
}

export interface AppState {
  bikes: BikeProfile[];
  activeBikeId: string | null;
}

export interface GpxAnalysisResult {
  distance: number;
  elevationGain: number;
  name: string;
  startTime: string;
  coordinates: [number, number][];
}
