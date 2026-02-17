
export interface ComponentStatus {
  id: string;
  name: string;
  currentKm: number;
  thresholdKm: number;
  lastServiceDate: string;
  category: 'drivetrain' | 'suspension' | 'tires' | 'brakes';
}

export interface RideData {
  id: string;
  name: string;
  date: string;
  distance: number;
  elevationGain: number;
}

export interface BikeProfile {
  id: string;
  name: string;
  brand: string;
  model: string;
  image?: string; // base64 string
  components: ComponentStatus[];
  rides: RideData[];
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
}
