import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

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
        explanation: 'Wide turning radii and high vehicle speeds creating severe conflict points with pedestrians during green signal phases.'
    },
    {
        id: 'cyberTowers',
        name: 'Cyber Towers Junction',
        lat: 17.4497,
        lng: 78.3813,
        category: 'IT Hub Core Junction',
        types: ['crossing', 'bus', 'informal', 'junction'],
        baseScores: { pedestrian: 95, vehicle: 80, infrastructure: 65, speed: 60, busProximity: 92, crashes: 60 },
        explanation: 'High pedestrian exposure due to metro connectivity and disorganized bus bays, causing mid-block informal crossings.'
    },
    {
        id: 'madhapur',
        name: 'Madhapur Main Road',
        lat: 17.4483,
        lng: 78.3915,
        category: 'Commercial & Residential Mix',
        types: ['bus', 'informal', 'turning'],
        baseScores: { pedestrian: 78, vehicle: 82, infrastructure: 80, speed: 65, busProximity: 85, crashes: 55 },
        explanation: 'On-street parking and chaotic boarding zones narrow carriageways and severely restrict sightlines.'
    },
    {
        id: 'kukatpally',
        name: 'Kukatpally Y Junction',
        lat: 17.4933,
        lng: 78.4057,
        category: 'High-Density Arterial',
        types: ['crossing', 'bus', 'junction', 'crash'],
        baseScores: { pedestrian: 90, vehicle: 92, infrastructure: 85, speed: 80, busProximity: 90, crashes: 82 },
        explanation: 'Severe bottleneck where local traffic merges with the main arterial highway without proper refuge islands.'
    }
];

const availableInterventions = [
    { id: 'crossing', label: 'Add controlled pedestrian crossing (Pelican signal)', reduction: 18, cost: 150000, timeline: '2 Weeks' },
    { id: 'refuge', label: 'Construct median pedestrian refuge island', reduction: 12, cost: 95000, timeline: '1 Week' },
    { id: 'busStop', label: 'Relocate bus stop 50m away from junction apex', reduction: 15, cost: 40000, timeline: '3 Days' },
    { id: 'lighting', label: 'Upgrade junction high-mast lighting & visibility', reduction: 8, cost: 75000, timeline: '4 Days' },
    { id: 'speedBumps', label: 'Install table-top speed breakers / rumble strips', reduction: 10, cost: 30000, timeline: '2 Days' }
];

export default function StreetSenseDashboard() {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markersRef = useRef({});
    const reportRef = useRef(null);

    const [currentTimeHour, setCurrentTimeHour] = useState(() => {
        const currentHour = new Date().getHours();
        return Math.min(23, Math.max(6, currentHour));
    });
    
    const [isLiveMode, setIsLiveMode] = useState(true);
    const [activeFilters, setActiveFilters] = useState(['crossing', 'bus', 'turning', 'junction', 'informal', 'crash']);
    const [selectedJunctionId, setSelectedJunctionId] = useState('kondapur');
    const [appliedInterventions, setAppliedInterventions] = useState(new Set());
    
    const [activeView, setActiveView] = useState('map');
    const [isMatrixModalOpen, setIsMatrixModalOpen] = useState(false);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    useEffect(() => {
        if (!isLiveMode || activeView !== 'map') return;
        const interval = setInterval(() => {
            const currentHour = new Date().getHours();
            setCurrentTimeHour(Math.min(23, Math.max(6, currentHour)));
        }, 30000);
        return () => clearInterval(interval);
    }, [isLiveMode, activeView]);

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
        if (score > 75) return { label: 'HOTSPOT', bg: 'bg-red-500/10 text-red-400 border-red-500/30' };
        if (score >= 50) return { label: 'EMERGING RISK', bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30' };
        return { label: 'SAFER', bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' };
    };

    useEffect(() => {
        if (activeView !== 'map') return;
        if (!mapInstanceRef.current && mapRef.current) {
            const map = L.map(mapRef.current, { zoomControl: false }).setView([17.4550, 78.3750], 13);
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);

            L.control.zoom({ position: 'bottomright' }).addTo(map);
            mapInstanceRef.current = map;
        } else if (mapInstanceRef.current) {
            setTimeout(() => {
                mapInstanceRef.current.invalidateSize();
            }, 100);
        }
    }, [activeView]);

    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map || activeView !== 'map') return;

        Object.values(markersRef.current).forEach(m => map.removeLayer(m));
        markersRef.current = {};

        junctionsData.forEach(junction => {
            const matchesFilter = junction.types.some(t => activeFilters.includes(t));
            if (!matchesFilter) return;

            const score = computeScore(junction, currentTimeHour);
            const isSelected = selectedJunctionId === junction.id;

            const htmlIcon = `
                <div class="relative flex items-center justify-center cursor-pointer group">
                    ${score > 75 ? `<div class="absolute w-12 h-12 rounded-full bg-red-500/30 animate-ping"></div>` : ''}
                    <div class="px-3 py-1.5 rounded-xl shadow-xl flex items-center gap-1.5 border backdrop-blur-md transition-all transform ${
                        isSelected 
                            ? 'bg-red-600 border-white text-white scale-125 z-50 shadow-red-500/50' 
                            : score > 75 
                                ? 'bg-red-500 text-white border-red-300 shadow-red-500/40' 
                                : score >= 50 
                                    ? 'bg-amber-500 text-white border-amber-300 shadow-amber-500/40' 
                                    : 'bg-emerald-600 text-white border-emerald-300 shadow-emerald-500/40'
                    }">
                        <div class="w-2 h-2 rounded-full bg-white animate-pulse"></div>
                        <span class="font-black text-xs tracking-wider">${score}</span>
                    </div>
                </div>
            `;

            const customMarker = L.divIcon({
                className: 'custom-div-icon',
                html: htmlIcon,
                iconSize: [50, 36],
                iconAnchor: [25, 18]
            });

            const marker = L.marker([junction.lat, junction.lng], { icon: customMarker }).addTo(map);
            marker.on('click', () => {
                setSelectedJunctionId(junction.id);
                setAppliedInterventions(new Set());
            });
            markersRef.current[junction.id] = marker;
        });
    }, [currentTimeHour, activeFilters, selectedJunctionId, activeView]);

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

    const selectedJunction = junctionsData.find(j => j.id === selectedJunctionId) || junctionsData[0];
    const currentScore = computeScore(selectedJunction, currentTimeHour);
    const totalReduction = Array.from(appliedInterventions).reduce((acc, id) => {
        const item = availableInterventions.find(i => i.id === id);
        return acc + (item ? item.reduction : 0);
    }, 0);
    const finalScore = Math.max(15, currentScore - totalReduction);

    const totalCost = Array.from(appliedInterventions).reduce((acc, id) => {
        const item = availableInterventions.find(i => i.id === id);
        return acc + (item ? item.cost : 0);
    }, 0);

    const roiEfficiency = totalCost > 0 ? (totalReduction / (totalCost / 50000)).toFixed(1) : '0.0';

    const scoresList = junctionsData.map(j => computeScore(j, currentTimeHour));
    const hotspotCount = scoresList.filter(s => s > 75).length;
    const emergingCount = scoresList.filter(s => s >= 50 && s <= 75).length;
    const saferCount = scoresList.filter(s => s < 50).length;

    const hourlyTrend = Array.from({ length: 18 }, (_, i) => {
        const hour = i + 6;
        return { hour, score: computeScore(selectedJunction, hour) };
    });

    const downloadPDFReport = async () => {
        if (!reportRef.current) return;
        try {
            setIsGeneratingPdf(true);
            const canvas = await html2canvas(reportRef.current, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#090d16'
            });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`${selectedJunction.id}-traffic-audit-report.pdf`);
        } catch (error) {
            console.error('Error generating PDF:', error);
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    return (
        <div className="bg-slate-950 text-slate-100 h-screen w-screen flex flex-col overflow-hidden font-sans">
            {/* Header */}
            <header className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex items-center justify-between shrink-0 shadow-lg z-30">
                <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-md">
                        <i className="fa-solid fa-shield-halved text-white text-sm"></i>
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-sm font-bold tracking-tight text-white">StreetSense Hyderabad</h1>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">Cyberabad GIS Suite</span>
                        </div>
                        <p className="text-[11px] text-slate-400">Urban Traffic Conflict Analytics & Simulation Suite</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {activeView === 'map' ? (
                        <button onClick={() => setActiveView('report')} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-md transition-all flex items-center gap-2">
                            <i className="fa-solid fa-file-lines"></i> Export Report View
                        </button>
                    ) : (
                        <button onClick={() => setActiveView('map')} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-md transition-all flex items-center gap-2">
                            <i className="fa-solid fa-map"></i> Back to Map Dashboard
                        </button>
                    )}
                    <button onClick={() => setIsMatrixModalOpen(true)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl shadow-md transition-all flex items-center gap-2">
                        <i className="fa-solid fa-ranking-star"></i> Priority Matrix
                    </button>
                    <div className="px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs font-semibold flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>Cyberabad Zone Active</span>
                    </div>
                </div>
            </header>

            {/* Main Content Switcher */}
            {activeView === 'map' ? (
                <div className="flex-1 flex overflow-hidden">
                    {/* Left Controls Column */}
                    <aside className="w-72 bg-slate-900/95 border-r border-slate-800 flex flex-col shrink-0 p-3 space-y-3 overflow-y-auto">
                        {/* Time Simulator / Live Clock */}
                        <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-2">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Time Mode</span>
                                    <button 
                                        onClick={() => setIsLiveMode(!isLiveMode)}
                                        className={`text-[9px] px-2 py-0.5 rounded-full font-bold border transition-all ${isLiveMode ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-slate-700 text-slate-400 border-slate-600'}`}
                                    >
                                        {isLiveMode ? '● LIVE SYNC' : 'MANUAL'}
                                    </button>
                                </div>
                                <span className="text-xs font-mono font-bold bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded">
                                    {String(currentTimeHour).padStart(2, '0')}:00 IST
                                </span>
                            </div>
                            <input 
                                type="range" min="6" max="23" step="1" value={currentTimeHour} 
                                onChange={(e) => {
                                    setIsLiveMode(false);
                                    setCurrentTimeHour(parseInt(e.target.value));
                                }}
                                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500 mb-2"
                            />
                            <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                                <span>06:00</span>
                                <span>12:00</span>
                                <span>17:00 (Peak)</span>
                                <span>23:00</span>
                            </div>
                        </div>

                        {/* Conflict Filters */}
                        <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">Conflict Filters</span>
                            <div className="grid grid-cols-2 gap-1.5 text-xs">
                                {[
                                    { id: 'crossing', label: 'Crossing' },
                                    { id: 'bus', label: 'Bus Bay' },
                                    { id: 'turning', label: 'Turning' },
                                    { id: 'junction', label: 'Junction' },
                                    { id: 'informal', label: 'Informal' },
                                    { id: 'crash', label: 'Crash' }
                                ].map((f) => {
                                    const active = activeFilters.includes(f.id);
                                    return (
                                        <button 
                                            key={f.id}
                                            onClick={() => handleFilterChange(f.id)}
                                            className={`p-1.5 rounded-lg border text-left flex items-center space-x-1.5 text-[11px] ${active ? 'bg-indigo-600/20 border-indigo-500 text-white' : 'bg-slate-900/40 border-slate-700 text-slate-400'}`}
                                        >
                                            <div className={`w-3 h-3 rounded flex items-center justify-center border text-[8px] ${active ? 'bg-indigo-600 border-indigo-400 text-white' : 'border-slate-600'}`}>
                                                {active && <i className="fa-solid fa-check"></i>}
                                            </div>
                                            <span className="truncate">{f.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Risk Index Legend */}
                        <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">Risk Index Legend</span>
                            <div className="space-y-1.5 text-xs">
                                <div className="flex items-center justify-between bg-slate-900/50 p-1.5 rounded-lg border border-slate-700/50">
                                    <div className="flex items-center space-x-2">
                                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                        <span className="text-[11px] text-slate-300">Hotspots (&gt;75)</span>
                                    </div>
                                    <span className="font-bold text-red-400">{hotspotCount}</span>
                                </div>
                                <div className="flex items-center justify-between bg-slate-900/50 p-1.5 rounded-lg border border-slate-700/50">
                                    <div className="flex items-center space-x-2">
                                        <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                                        <span className="text-[11px] text-slate-300">Emerging Risk (50-75)</span>
                                    </div>
                                    <span className="font-bold text-amber-400">{emergingCount}</span>
                                </div>
                                <div className="flex items-center justify-between bg-slate-900/50 p-1.5 rounded-lg border border-slate-700/50">
                                    <div className="flex items-center space-x-2">
                                        <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                                        <span className="text-[11px] text-slate-300">Safer (&lt;50)</span>
                                    </div>
                                    <span className="font-bold text-emerald-400">{saferCount}</span>
                                </div>
                            </div>
                        </div>
                    </aside>

                    {/* Center Map View */}
                    <main className="flex-1 relative h-full bg-slate-950">
                        <div ref={mapRef} className="absolute inset-0 w-full h-full" />
                    </main>

                    {/* Right Analytics Panel Column */}
                    <aside className="w-80 bg-slate-900/95 border-l border-slate-800 flex flex-col shrink-0 p-3 space-y-3 overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                            <div>
                                <span className="text-[9px] font-bold text-indigo-400 uppercase">Junction Deep Dive</span>
                                <h2 className="text-xs font-bold text-white truncate max-w-[170px]">{selectedJunction.name}</h2>
                            </div>
                            <div className={`px-2 py-0.5 rounded font-bold text-[9px] border ${getRiskBadge(finalScore).bg}`}>
                                {getRiskBadge(finalScore).label}
                            </div>
                        </div>

                        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3 flex justify-between items-center">
                            <div>
                                <span className="text-[10px] text-slate-400 font-medium">Conflict Score</span>
                                <div className="text-xl font-black text-white">{finalScore} <span className="text-[10px] text-slate-500">/ 100</span></div>
                            </div>
                            {totalReduction > 0 && (
                                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30 font-bold">
                                    -{totalReduction} pts
                                </span>
                            )}
                        </div>

                        {/* Historical 24-Hour Trend Chart */}
                        <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3 space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">24h Conflict Trend</span>
                                <span className="text-[9px] text-indigo-400 font-mono">Hourly Profile</span>
                            </div>
                            <div className="h-20 flex items-end gap-1 pt-2 pb-1 border-b border-slate-700/60">
                                {hourlyTrend.map((item) => {
                                    const isCurrent = item.hour === currentTimeHour;
                                    const heightPct = item.score;
                                    const barColor = item.score > 75 ? 'bg-red-500' : item.score >= 50 ? 'bg-amber-500' : 'bg-emerald-500';
                                    
                                    return (
                                        <div 
                                            key={item.hour} 
                                            onClick={() => {
                                                setIsLiveMode(false);
                                                setCurrentTimeHour(item.hour);
                                            }}
                                            className="flex-1 flex flex-col items-center h-full justify-end group relative cursor-pointer"
                                        >
                                            <div className="absolute -top-7 bg-slate-900 text-white text-[9px] px-1.5 py-0.5 rounded border border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none">
                                                {String(item.hour).padStart(2, '0')}:00 ({item.score})
                                            </div>
                                            <div 
                                                className={`w-full rounded-t transition-all ${barColor} ${isCurrent ? 'ring-2 ring-white scale-y-105' : 'opacity-70 group-hover:opacity-100'}`} 
                                                style={{ height: `${heightPct}%` }}
                                            ></div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                                <span>06:00</span>
                                <span>12:00</span>
                                <span>18:00</span>
                                <span>23:00</span>
                            </div>
                        </div>

                        {/* Risk Factor Breakdown Progress Bars */}
                        <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3 space-y-2">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Risk Factor Breakdown</span>
                                <span className="text-[9px] text-slate-500">Scale 0-100</span>
                            </div>
                            {[
                                { label: 'Pedestrian Exposure', val: selectedJunction.baseScores.pedestrian, color: 'bg-indigo-500' },
                                { label: 'Vehicle Volume', val: selectedJunction.baseScores.vehicle, color: 'bg-purple-500' },
                                { label: 'Infrastructure Deficit', val: selectedJunction.baseScores.infrastructure, color: 'bg-amber-500' },
                                { label: 'Average Road Speed', val: selectedJunction.baseScores.speed, color: 'bg-blue-500' },
                                { label: 'Bus Proximity Risk', val: selectedJunction.baseScores.busProximity, color: 'bg-cyan-500' },
                                { label: 'Crash Severity', val: selectedJunction.baseScores.crashes, color: 'bg-red-500' }
                            ].map((factor, idx) => (
                                <div key={idx} className="space-y-1">
                                    <div className="flex justify-between text-[11px]">
                                        <span className="text-slate-400">{factor.label}</span>
                                        <span className="font-bold text-white">{factor.val}%</span>
                                    </div>
                                    <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                                        <div className={`${factor.color} h-full rounded-full`} style={{ width: `${factor.val}%` }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* AI Conflict Explanation */}
                        <div className="bg-indigo-950/30 border border-indigo-500/30 rounded-xl p-3">
                            <span className="text-[10px] font-bold text-indigo-300 block mb-1">AI Diagnostic Summary</span>
                            <p className="text-[10px] text-slate-300 italic leading-relaxed">{selectedJunction.explanation}</p>
                        </div>

                        {/* Countermeasures & Cost ROI Estimator */}
                        <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3 space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold uppercase text-slate-300">Countermeasures & ROI</span>
                                <span className="text-[9px] font-mono text-emerald-400">Budget Simulator</span>
                            </div>
                            
                            <div className="space-y-1.5">
                                {availableInterventions.map(item => {
                                    const isChecked = appliedInterventions.has(item.id);
                                    return (
                                        <div 
                                            key={item.id} 
                                            onClick={() => toggleIntervention(item.id)}
                                            className={`p-2 rounded-lg border cursor-pointer flex items-center justify-between text-xs transition-all ${isChecked ? 'bg-indigo-600/20 border-indigo-500 text-white' : 'bg-slate-900/50 border-slate-700 text-slate-300'}`}
                                        >
                                            <div className="flex items-center space-x-2 truncate pr-2">
                                                <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border text-[9px] shrink-0 ${isChecked ? 'bg-indigo-600 border-indigo-400 text-white' : 'border-slate-600'}`}>
                                                    {isChecked && <i className="fa-solid fa-check"></i>}
                                                </div>
                                                <div className="truncate">
                                                    <div className="truncate text-[10px] font-medium">{item.label}</div>
                                                    <div className="text-[9px] text-slate-400 font-mono">₹{(item.cost / 1000).toFixed(0)}k • {item.timeline}</div>
                                                </div>
                                            </div>
                                            <span className="text-[10px] font-bold text-emerald-400 shrink-0">-{item.reduction}p</span>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* ROI Summary Widget */}
                            <div className="bg-slate-900/80 border border-slate-700/80 rounded-xl p-2.5 space-y-2">
                                <div className="flex justify-between text-[11px]">
                                    <span className="text-slate-400">Total Budget Est.:</span>
                                    <span className="font-mono font-bold text-indigo-300">₹{(totalCost / 100000).toFixed(2)} Lakhs</span>
                                </div>
                                <div className="flex justify-between text-[11px]">
                                    <span className="text-slate-400">Conflict Drop:</span>
                                    <span className="font-bold text-emerald-400">-{totalReduction} points</span>
                                </div>
                                <div className="flex justify-between text-[11px]">
                                    <span className="text-slate-400">Cost-Efficiency Index:</span>
                                    <span className="font-mono font-bold text-amber-400">{roiEfficiency} pts / ₹50k</span>
                                </div>
                            </div>
                        </div>
                    </aside>
                </div>
            ) : (
                /* Dedicated Full-Screen Report View (Optimized for PDF export) */
                <div className="flex-1 overflow-y-auto bg-slate-950 p-8 flex justify-center">
                    <div className="max-w-3xl w-full flex flex-col space-y-6">
                        <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg">
                            <div>
                                <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Executive Audit Brief</span>
                                <h2 className="text-lg font-bold text-white">Report Preview & Export</h2>
                            </div>
                            <div className="flex items-center gap-3">
                                <button onClick={() => setActiveView('map')} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl flex items-center gap-2">
                                    <i className="fa-solid fa-arrow-left"></i> Back to Map
                                </button>
                                <button 
                                    onClick={downloadPDFReport} 
                                    disabled={isGeneratingPdf}
                                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                                >
                                    <i className={`fa-solid ${isGeneratingPdf ? 'fa-spinner fa-spin' : 'fa-file-pdf'}`}></i> 
                                    {isGeneratingPdf ? 'Compiling PDF...' : 'Download PDF Report'}
                                </button>
                            </div>
                        </div>

                        {/* Printable PDF Canvas Target Card */}
                        <div ref={reportRef} className="bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-6 shadow-2xl text-slate-100">
                            <div className="flex justify-between items-start border-b border-slate-800 pb-5">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                                            <i className="fa-solid fa-shield-halved text-xs"></i>
                                        </div>
                                        <h1 className="text-base font-bold text-white tracking-tight">StreetSense Cyberabad</h1>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1">Official Urban Traffic Conflict & Safety Audit Report</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] font-mono text-slate-400 block">Generated On</span>
                                    <span className="text-xs font-mono font-bold text-slate-200">{new Date().toLocaleString()}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-xl space-y-1">
                                    <span className="text-[10px] uppercase font-bold text-slate-400">Target Junction</span>
                                    <div className="text-sm font-bold text-white">{selectedJunction.name}</div>
                                    <div className="text-[11px] text-indigo-400">{selectedJunction.category}</div>
                                </div>
                                <div className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-xl space-y-1 flex justify-between items-center">
                                    <div>
                                        <span className="text-[10px] uppercase font-bold text-slate-400">Conflict Evaluation</span>
                                        <div className="text-2xl font-black text-white">{finalScore} <span className="text-xs text-slate-500">/ 100</span></div>
                                    </div>
                                    <div className={`px-2.5 py-1 rounded-lg font-bold text-xs border ${getRiskBadge(finalScore).bg}`}>
                                        {getRiskBadge(finalScore).label}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Simulation Parameters</h3>
                                <div className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-xl text-xs space-y-2">
                                    <div className="flex justify-between border-b border-slate-800/50 pb-2">
                                        <span className="text-slate-400">Active Time Window</span>
                                        <span className="font-mono font-bold text-slate-200">{String(currentTimeHour).padStart(2, '0')}:00 IST</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-800/50 pb-2">
                                        <span className="text-slate-400">Geospatial Coordinates</span>
                                        <span className="font-mono font-bold text-slate-200">{selectedJunction.lat}, {selectedJunction.lng}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Zone Jurisdiction</span>
                                        <span className="font-bold text-slate-200">Cyberabad Traffic Police Division</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">AI Diagnostic Summary</h3>
                                <div className="bg-indigo-950/30 border border-indigo-500/30 p-4 rounded-xl">
                                    <p className="text-xs text-slate-300 italic leading-relaxed">{selectedJunction.explanation}</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Applied Interventions & Financial ROI</h3>
                                <div className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-xl space-y-3">
                                    {appliedInterventions.size === 0 ? (
                                        <p className="text-xs text-slate-500 italic">No countermeasures selected for this simulation run.</p>
                                    ) : (
                                        <>
                                            <div className="space-y-2">
                                                {Array.from(appliedInterventions).map(id => {
                                                    const item = availableInterventions.find(i => i.id === id);
                                                    return (
                                                        <div key={id} className="flex justify-between items-center text-xs border-b border-slate-800/40 pb-2">
                                                            <div>
                                                                <span className="text-slate-200 block">{item?.label}</span>
                                                                <span className="text-[10px] text-slate-400 font-mono">Timeline: {item?.timeline}</span>
                                                            </div>
                                                            <div className="text-right">
                                                                <span className="font-bold text-emerald-400 block">-{item?.reduction} pts</span>
                                                                <span className="font-mono text-[10px] text-indigo-300">₹{(item?.cost).toLocaleString()}</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            <div className="pt-2 flex justify-between items-center text-xs font-bold border-t border-slate-800">
                                                <span className="text-slate-300">Total Estimated Budget:</span>
                                                <span className="font-mono text-indigo-300">₹{totalCost.toLocaleString()}</span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="pt-6 border-t border-slate-800 flex justify-between items-center text-[10px] text-slate-500">
                                <span>StreetSense GIS & Urban Intelligence System</span>
                                <span>Confidential - For Planning Use Only</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Priority Matrix Modal */}
            {isMatrixModalOpen && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-5 space-y-4 shadow-2xl">
                        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                            <h2 className="text-sm font-bold text-white flex items-center gap-2">
                                <i className="fa-solid fa-ranking-star text-indigo-400"></i> Cyberabad Priority Matrix
                            </h2>
                            <button onClick={() => setIsMatrixModalOpen(false)} className="text-slate-400 hover:text-white"><i className="fa-solid fa-xmark"></i></button>
                        </div>
                        <div className="space-y-2">
                            {junctionsData.map((j, idx) => (
                                <div key={j.id} className="bg-slate-800/50 border border-slate-700/60 p-2.5 rounded-xl flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2.5">
                                        <span className="w-5 h-5 rounded bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-[11px]">{idx + 1}</span>
                                        <div>
                                            <div className="font-bold text-white">{j.name}</div>
                                            <div className="text-[10px] text-slate-400">{j.category}</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="font-black text-red-400">{computeScore(j, currentTimeHour)}/100</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-end pt-2">
                            <button onClick={() => setIsMatrixModalOpen(false)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl">
                                Close Matrix
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}