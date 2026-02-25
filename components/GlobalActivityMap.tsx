
import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { X, Bike } from 'lucide-react';
import { RideData } from '../types';

interface GlobalActivityMapProps {
    rides: RideData[];
    onClose: () => void;
}

const RecenterGlobalMap: React.FC<{ rides: RideData[] }> = ({ rides }) => {
    const map = useMap();
    useEffect(() => {
        const allCoords = rides.flatMap(r => r.coordinates || []);
        if (allCoords.length > 0) {
            const bounds = L.latLngBounds(allCoords);
            map.fitBounds(bounds, { padding: [40, 40] });
        }
    }, [rides, map]);
    return null;
};

const GlobalActivityMap: React.FC<GlobalActivityMapProps> = ({ rides, onClose }) => {
    const ridesWithCoords = rides.filter(r => r.coordinates && r.coordinates.length > 0);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 md:p-10 animate-in fade-in duration-300">
            <div className="bg-slate-900 w-full h-full rounded-3xl border border-slate-700 overflow-hidden flex flex-col shadow-2xl relative">
                <header className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 absolute top-0 left-0 right-0 z-[1000] backdrop-blur-md">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-600 p-2 rounded-xl">
                            <Bike className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white">Carte Globale des Activités</h3>
                            <p className="text-xs text-slate-500">{ridesWithCoords.length} parcours affichés</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </header>

                <div className="flex-1 relative">
                    <MapContainer
                        center={[46.603354, 1.888334]} // France center
                        zoom={6}
                        className="w-full h-full bg-slate-900"
                        preferCanvas={true}
                    >
                        <TileLayer
                            attribution='Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community'
                            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}"
                        />
                        {ridesWithCoords.map(ride => (
                            <Polyline
                                key={ride.id}
                                positions={ride.coordinates!}
                                pathOptions={{
                                    color: '#ff0000', // Rouge pur pour max visibilité
                                    weight: 4,
                                    opacity: 0.4, // Augmenté pour être visible même sans cumul
                                    lineCap: 'round',
                                    lineJoin: 'round'
                                }}
                            />
                        ))}
                        <RecenterGlobalMap rides={ridesWithCoords} />
                    </MapContainer>
                </div>

                {/* Legend / Info Overlay */}
                <div className="absolute bottom-6 left-6 z-[1000] bg-slate-900/90 backdrop-blur-md border border-slate-700/50 p-4 rounded-2xl hidden md:block shadow-2xl">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-4 h-1 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
                        <span className="text-xs text-slate-100 font-bold uppercase tracking-wider">Effet Heatmap</span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-tight">
                        Les zones les plus <span className="text-red-400 font-bold underline decoration-red-500/50">rouges et intenses</span> indiquent vos<br />
                        passages les plus fréquents (cumul de traces).
                    </p>
                </div>
            </div>
        </div>
    );
};

export default GlobalActivityMap;
