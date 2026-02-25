
import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { X } from 'lucide-react';

interface RideMapProps {
    coordinates: [number, number][];
    onClose: () => void;
    rideName: string;
}

// Fixed Leaflet icon path issue
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const RecenterMap: React.FC<{ coordinates: [number, number][] }> = ({ coordinates }) => {
    const map = useMap();
    useEffect(() => {
        if (coordinates.length > 0) {
            const bounds = L.latLngBounds(coordinates);
            map.fitBounds(bounds, { padding: [20, 20] });
        }
    }, [coordinates, map]);
    return null;
};

const RideMap: React.FC<RideMapProps> = ({ coordinates, onClose, rideName }) => {
    if (!coordinates || coordinates.length === 0) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                <div className="bg-slate-800 p-8 rounded-3xl border border-slate-700 text-center max-w-md w-full">
                    <p className="text-slate-300 mb-6">Aucune donnée GPS disponible pour cette activité.</p>
                    <button onClick={onClose} className="bg-indigo-600 px-6 py-2 rounded-xl text-white font-bold">Fermer</button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 md:p-10">
            <div className="bg-slate-900 w-full h-full rounded-3xl border border-slate-700 overflow-hidden flex flex-col shadow-2xl">
                <header className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                    <div>
                        <h3 className="text-lg font-bold text-white">{rideName}</h3>
                        <p className="text-xs text-slate-500">Visualisation du tracé GPS</p>
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
                        center={coordinates[0]}
                        zoom={13}
                        className="w-full h-full bg-slate-900"
                    >
                        <TileLayer
                            attribution='Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community'
                            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}"
                        />
                        <Polyline
                            positions={coordinates}
                            pathOptions={{
                                color: '#FC4C02',
                                weight: 5,
                                opacity: 0.9,
                                lineCap: 'round',
                                lineJoin: 'round'
                            }}
                        />
                        <RecenterMap coordinates={coordinates} />
                    </MapContainer>
                </div>
            </div>
        </div>
    );
};

export default RideMap;
