import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Hyderabad Cyberabad Junction Dataset
const junctionsData = [
    {
        id: 'kondapur',
        name: 'Kondapur Junction',
        lat: 17.4716,
        lng: 78.3642,
        category: 'Major Transit & IT Corridor',
        types: ['crossing', 'bus', 'junction', 'crash'],
        baseScores: { pedestrian: 92, vehicle: 84, infrastructure: 78, speed: 75, busProximity: 88, crashes: 70 },
        explanation: 'Intense pedestrian footfall from adjacent IT parks during evening peak hours with inadequate crossing infrastructure.'
    },
    {
        id: 'gachibowli',
        name: 'Gachibowli Crossroads',
        lat: 17.4401,
        lng: 78.3489,
        category: 'Major Multi-Axis Interchange',
        types: ['crossing', 'turning', 'junction', 'crash'],
        baseScores: { pedestrian: 88, vehicle: 95, infrastructure: 70, speed: 90, busProximity: 80, crashes: 85 },
        explanation: 'Wide turning radii and high vehicle speeds creating conflicts with pedestrians during green signal phases.'
    },
    {
        id: 'cyberTowers',
        name: 'Cyber Towers Junction',
        lat: 17.4497,
        lng: 78.3813,
        category: 'IT Hub Core Junction',
        types: ['crossing', 'bus', 'informal', 'junction'],
        baseScores: { pedestrian: 95, vehicle: 80, infrastructure: 65, speed: 60, busProximity: 92, crashes: 60 },
        explanation: 'High pedestrian exposure due to metro connectivity and bus bays, causing mid-block informal crossings.'
    },
    {
        id: 'madhapur',
        name: 'Madhapur Main Road',
        lat: 17.4483,
        lng: 78.3915,
        category: 'Commercial & Residential Mix',
        types: ['bus', 'informal', 'turning'],
        baseScores: { pedestrian: 78, vehicle: 82, infrastructure: 80, speed: 65, busProximity: 85, crashes: 55 },
        explanation: 'On-street parking and chaotic boarding zones narrow carriageways and restrict visibility.'
    },
    {
        id: 'kukatpally',
        name: 'Kukatpally Y Junction',
        lat: 17.4933,
        lng: 78.4057,
        category: 'High-Density Arterial',
        types: ['crossing', 'bus', 'junction', 'crash'],
        baseScores: { pedestrian: 90, vehicle: 92, infrastructure: 85, speed: 80, busProximity: 90, crashes: 82 },
        explanation: 'Severe bottleneck where traffic merges with the arterial highway without proper refuge islands.'
    }
];

const availableInterventions = [
    { id: 'crossing', label: 'Add controlled pedestrian crossing (Pelican signal)', reduction: 18, icon: 'fa-person-walking-arrow-right' },
    { id: 'refuge', label: 'Construct median pedestrian refuge island', reduction: 12, icon: 'fa-road-barrier' },
    { id: 'busStop', label: 'Relocate bus stop 50m away from junction apex', reduction: 15, icon: 'fa-bus' },
    { id: 'lighting', label: 'Upgrade junction high-mast lighting & visibility', reduction: 8, icon: 'fa-lightbulb' },
    { id: 'speedBumps', label: 'Install table-top speed breakers / rumble strips', reduction: 10, icon: 'fa-gauge-high' }
];

export default function StreetSenseDashboard() {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markersRef = useRef({});

    const [currentTimeHour, setCurrentTimeHour] = useState(19);
    const [activeFilters, setActiveFilters] = useState(['crossing', 'bus', 'turning', 'junction', 'informal', 'crash']);
    const [selectedJunctionId, setSelectedJunctionId] = useState(null);
    const [appliedInterventions, setAppliedInterventions] = useState(new Set());
    const [isModalOpen, setIsModalOpen] = useState(false);

    const getTimeMultiplier = (hour) => {
        if (hour >= 17 && hour <= 20) return 1.35;
        if (hour >= 8 && hour <= 10) return 1.20;
        if (hour >= 12 && hour <= 15) return 1.00;
        return 0.70;
    };

    const computeScore = (junction, hour) => {
        const mult = getTimeMultiplier(hour);
        const raw = (
            junction.baseScores.pedestrian * 0.25 +
            junction.baseScores.vehicle * 0.20 +
            junction.baseScores.infrastructure * 0.15 +
            junction.baseScores.speed * 0.15 +
            junction.baseScores.busProximity * 0.15 +
            junction.baseScores.crashes * 0.10
        ) * (mult > 1.2 ? 1.15 : (mult < 0.8 ? 0.85 : 1.0));
        return Math.min(99, Math.max(25, Math.round(raw)));
    };

    const getRiskBadge = (score) => {
        if (score > 75) return { label: '🔴 Hotspot', bg: 'bg-red-500/20 text-red-400 border border-red-500/30' };
        if (score >= 50) return { label: '🟡 Emerging Risk', bg: 'bg-amber-500/20 text-amber-300 border border-amber-500/30' };
        return { label: '🟢 Relatively Safer', bg: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' };
    };

    const getMarkerColor = (score) => {
        if (score > 75) return '#ef4444';
        if (score >= 50) return '#f59e0b';
        return '#10b981';
    };

    useEffect(() => {
        if (!mapInstanceRef.current && mapRef.current) {
            const map = L.map(mapRef.current, { zoomControl: false }).setView([17.4550, 78.3750], 14);
            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                maxZoom: 19
            }).addTo(map);
            L.control.zoom({ position: 'topright' }).addTo(map);
            mapInstanceRef.current = map;
        }
    }, []);

    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map) return;

        Object.values(markersRef.current).forEach(m => map.removeLayer(m));
        markersRef.current = {};

        junctionsData.forEach(junction => {
            const matchesFilter = junction.types.some(t => activeFilters.includes(t));
            if (!matchesFilter) return;

            const score = computeScore(junction, currentTimeHour);
            const color = getMarkerColor(score);

            const htmlIcon = `
                <div class="relative flex items-center justify-center cursor-pointer group">
                    ${score > 75 ? `<div class="absolute w-10 h-10 rounded-full bg-red-500/40 animate-ping"></div>` : ''}
                    <div class="w-8 h-8 rounded-xl flex items-center justify-center shadow-lg border-2 border-white/80 transition-transform group-hover:scale-110" style="background-color: ${color};">
                        <span class="text-white font-bold text-xs">${score}</span>
                    </div>
                </div>
            `;

            const customMarker = L.divIcon({
                className: 'custom-div-icon',
                html: htmlIcon,
                iconSize: [32, 32],
                iconAnchor: [16, 16]
            });

            const marker = L.marker([junction.lat, junction.lng], { icon: customMarker }).addTo(map);
            marker.on('click', () => {
                setSelectedJunctionId(junction.id);
                setAppliedInterventions(new Set());
            });
            markersRef.current[junction.id] = marker;
        });
    }, [currentTimeHour, activeFilters]);

    const handleFilterChange = (type) => {
        setActiveFilters(prev => 
            prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
        );
    };

    const toggleIntervention = (id) => {
        setAppliedInterventions(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const selectedJunction = junctionsData.find(j => j.id === selectedJunctionId);
    let currentScore = selectedJunction ? computeScore(selectedJunction, currentTimeHour) : 0;
    let totalReduction = Array.from(appliedInterventions).reduce((acc, id) => {
        const item = availableInterventions.find(i => i.id === id);
        return acc + (item ? item.reduction : 0);
    }, 0);
    let finalScore = Math.max(15, currentScore - totalReduction);

    return (
        <div className="bg-slate-950 text-slate-100 h-screen flex flex-col overflow-hidden font-sans">
            <header className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex items-center justify-between shrink-0 shadow-lg z-30">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                        <i className="fa-solid fa-shield-halved text-white text-lg"></i>
                    </div>
                    <div>
                        <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                            StreetSense Hyderabad 
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">Data Jam Demo</span>
                        </h1>
                        <p className="text-xs text-slate-400">See the conflict. Understand the cause. Fix the street.</p>
                    </div>
                </div>
                <button onClick={() => setIsModalOpen(true)} className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-xs font-medium rounded-lg shadow-md flex items-center gap-2">
                    <i className="fa-solid fa-ranking-star"></i> Top Interventions Matrix
                </button>
            </header>

            <div className="flex-1 flex flex-col lg:flex-row relative overflow-hidden">
                <aside className="w-full lg:w-96 bg-slate-900/95 border-r border-slate-800 flex flex-col z-25 shrink-0 overflow-y-auto p-5 space-y-6">
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Time-Series Simulator</h2>
                            <span className="text-xs font-bold bg-indigo-500/10 text-indigo-400 px-2.5 py-1 rounded-full border border-indigo-500/20">{currentTimeHour}:00</span>
                        </div>
                        <input 
                            type="range" min="6" max="23" step="1" value={currentTimeHour} 
                            onChange={(e) => setCurrentTimeHour(parseInt(e.target.value))}
                            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        />
                    </div>

                    <div>
                        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Conflict Type Filters</h2>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            {['crossing', 'bus', 'turning', 'junction', 'informal', 'crash'].map((type) => (
                                <label key={type} className="flex items-center space-x-2 bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/50 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={activeFilters.includes(type)} 
                                        onChange={() => handleFilterChange(type)}
                                        className="rounded bg-slate-900 border-slate-700 text-indigo-600 h-4 w-4"
                                    />
                                    <span className="text-slate-300 capitalize">{type}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </aside>

                <main className="flex-1 relative">
                    <div ref={mapRef} className="w-full h-full" />
                </main>

                {selectedJunction && (
                    <div className="w-full lg:w-[460px] bg-slate-900/98 border-l border-slate-800 flex flex-col z-30 p-5 space-y-6 overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <div>
                                <h2 className="text-lg font-bold text-white">{selectedJunction.name}</h2>
                                <p className="text-xs text-slate-400">{selectedJunction.category}</p>
                            </div>
                            <button onClick={() => setSelectedJunctionId(null)} className="text-slate-400 hover:text-white">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>

                        <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 flex justify-between items-center">
                            <div>
                                <span className="text-xs text-slate-400">Calculated Conflict Score</span>
                                <div className="text-3xl font-extrabold text-white mt-1">{finalScore} <span className="text-sm text-slate-500">/ 100</span></div>
                            </div>
                            <div className={`px-3 py-1.5 rounded-xl font-bold text-xs uppercase ${getRiskBadge(finalScore).bg}`}>
                                {getRiskBadge(finalScore).label}
                            </div>
                        </div>

                        <div className="bg-indigo-950/20 border border-indigo-500/30 rounded-2xl p-4">
                            <h3 className="text-xs font-bold text-indigo-300 mb-2">AI Conflict Explanation</h3>
                            <p className="text-xs text-slate-300 italic">{selectedJunction.explanation}</p>
                        </div>

                        <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-4">
                            <h3 className="text-xs font-bold uppercase text-slate-300 mb-3">What-If Intervention Simulator</h3>
                            <div className="space-y-2">
                                {availableInterventions.map(item => {
                                    const isChecked = appliedInterventions.has(item.id);
                                    return (
                                        <label key={item.id} className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer ${isChecked ? 'bg-indigo-950/40 border-indigo-500/50 text-white' : 'bg-slate-800/50 border-slate-700/60 text-slate-300'}`}>
                                            <div className="flex items-center space-x-2">
                                                <input type="checkbox" checked={isChecked} onChange={() => toggleIntervention(item.id)} className="rounded bg-slate-900 border-slate-700 text-indigo-600 h-4 w-4" />
                                                <span className="text-xs">{item.label}</span>
                                            </div>
                                            <span className="text-[11px] font-semibold text-emerald-400">-{item.reduction} pts</span>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl p-6 space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                            <h2 className="text-base font-bold text-white">Top Priority Interventions for Cyberabad</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white"><i className="fa-solid fa-xmark"></i></button>
                        </div>
                        <p className="text-xs text-slate-300">Ranked by risk score multipliers, pedestrian exposure, and transit stop density.</p>
                        <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-indigo-600 text-white text-xs rounded-xl font-medium">Close Summary</button>
                    </div>
                </div>
            )}
        </div>
    );
}