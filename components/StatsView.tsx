
import React from 'react';
import { BikeProfile } from '../types';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    CartesianGrid, PieChart, Pie, Cell, Legend, Cell as RechartsCell
} from 'recharts';
import { TrendingUp, Package, Calendar, DollarSign } from 'lucide-react';

interface StatsViewProps {
    bike: BikeProfile;
}

const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#f43f5e', '#f97316', '#eab308'];

const StatsView: React.FC<StatsViewProps> = ({ bike }) => {
    // Calcul du kilométrage mensuel
    const monthlyData = Object.values((bike.rides || []).reduce((acc, ride) => {
        const date = new Date(ride.date);
        const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;
        if (!acc[monthYear]) {
            acc[monthYear] = { name: monthYear, distance: 0, date: date };
        }
        acc[monthYear].distance += ride.distance;
        return acc;
    }, {} as Record<string, any>))
        .sort((a: any, b: any) => a.date - b.date)
        .slice(-6); // 6 derniers mois

    // Répartition des coûts par composant
    const costPerComponent = (bike.components || []).map(comp => ({
        name: comp.name,
        value: (comp.serviceHistory || []).reduce((sum, h) => sum + (h.price || 0), 0)
    })).filter(c => c.value > 0);

    const maintenanceSpent = costPerComponent.reduce((sum, c) => sum + c.value, 0);
    const totalSpent = (bike.purchasePrice || 0) + maintenanceSpent;

    // Analyse de l'usure (Heatmap simplification)
    const wearLevels = bike.components.map(c => {
        let percentage = 0;
        if (c.thresholdType === 'time') {
            const lastService = new Date(c.lastServiceDate);
            const now = new Date();
            const diffTime = Math.abs(now.getTime() - lastService.getTime());
            const diffMonths = diffTime / (1000 * 60 * 60 * 24 * 30.44);
            percentage = Math.round((diffMonths / (c.thresholdMonths || 12)) * 100);
        } else {
            percentage = Math.round((c.currentKm / c.thresholdKm) * 100);
        }
        return {
            name: c.name,
            percentage: Math.min(100, percentage)
        };
    }).sort((a, b) => b.percentage - a.percentage);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-slate-800/50 p-6 rounded-3xl border border-slate-700">
                    <div className="flex items-center gap-3 mb-2 text-indigo-400">
                        <DollarSign className="w-5 h-5" />
                        <span className="text-xs font-bold uppercase tracking-wider">Investissement total</span>
                    </div>
                    <h2 className="text-3xl font-bold text-white">{totalSpent.toFixed(2)} €</h2>
                    <p className="text-slate-500 text-xs mt-1">Vélo ({bike.purchasePrice || 0}€) + Entretien</p>
                </div>
                <div className="bg-slate-800/50 p-6 rounded-3xl border border-slate-700">
                    <div className="flex items-center gap-3 mb-2 text-emerald-400">
                        <TrendingUp className="w-5 h-5" />
                        <span className="text-xs font-bold uppercase tracking-wider">Moyenne / km</span>
                    </div>
                    <h2 className="text-3xl font-bold text-white">
                        {bike.totalDistance > 0 ? (totalSpent / bike.totalDistance).toFixed(2) : 0} €
                    </h2>
                    <p className="text-slate-500 text-xs mt-1">Coût par kilomètre roulé</p>
                </div>
                <div className="bg-slate-800/50 p-6 rounded-3xl border border-slate-700">
                    <div className="flex items-center gap-3 mb-2 text-amber-400">
                        <Package className="w-5 h-5" />
                        <span className="text-xs font-bold uppercase tracking-wider">Pièces remplacées</span>
                    </div>
                    <h2 className="text-3xl font-bold text-white">
                        {bike.components.reduce((sum, c) => sum + (c.serviceHistory?.length || 0), 0)}
                    </h2>
                    <p className="text-slate-500 text-xs mt-1">Interventions enregistrées</p>
                </div>
                <div className="bg-slate-800/50 p-6 rounded-3xl border border-slate-700">
                    <div className="flex items-center gap-3 mb-2 text-blue-400">
                        <Calendar className="w-5 h-5" />
                        <span className="text-xs font-bold uppercase tracking-wider">Activité</span>
                    </div>
                    <h2 className="text-3xl font-bold text-white">{bike.rides.length}</h2>
                    <p className="text-slate-500 text-xs mt-1">Sorties totales</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Graphique Distance Mensuelle */}
                <section className="bg-slate-800/30 p-8 rounded-3xl border border-slate-700">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <TrendingUp className="text-indigo-400 w-5 h-5" /> Évolution du kilométrage
                    </h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlyData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}km`} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px' }}
                                    itemStyle={{ color: '#818cf8', fontWeight: 'bold' }}
                                />
                                <Bar dataKey="distance" fill="#6366f1" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </section>

                {/* Répartition des Coûts */}
                <section className="bg-slate-800/30 p-8 rounded-3xl border border-slate-700">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <DollarSign className="text-emerald-400 w-5 h-5" /> Répartition des dépenses
                    </h3>
                    <div className="h-64 w-full flex items-center">
                        {costPerComponent.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={costPerComponent}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {costPerComponent.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px' }}
                                    />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="m-auto text-slate-500 text-center">
                                <DollarSign className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                <p>Aucune dépense enregistrée.<br />Ajoutez un prix lors de votre prochain entretien.</p>
                            </div>
                        )}
                    </div>
                </section>
            </div>

            {/* Heatmap de l'usure (Liste ordonnée) */}
            <section className="bg-slate-800/30 p-8 rounded-3xl border border-slate-700">
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                    <Package className="text-amber-400 w-5 h-5" /> État d'usure comparé
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {wearLevels.map((lvl) => (
                        <div key={lvl.name} className="bg-slate-900/40 p-4 rounded-2xl border border-white/5">
                            <div className="flex justify-between text-xs mb-2">
                                <span className="text-slate-300 font-medium">{lvl.name}</span>
                                <span className={`font-bold ${lvl.percentage >= 90 ? 'text-red-400' : lvl.percentage >= 70 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                    {lvl.percentage}%
                                </span>
                            </div>
                            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-1000 ${lvl.percentage >= 90 ? 'bg-red-500' : lvl.percentage >= 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                    style={{ width: `${lvl.percentage}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
};

export default StatsView;
