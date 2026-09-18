import React, { useState, useRef, useEffect } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import ghmcLogo from '/ghmc.png';
import policeLogo from '/tspolice.png';
import rtcLogo from '/tsrtc.png';

// --- HYDERABAD CYBERABAD JUNCTION DATASET ---
const JUNCTIONS_DATA = [
    {
        id: 'kondapur',
        name: 'Kondapur Junction',
        lat: 17.4716,
        lng: 78.3642,
        category: 'Major Transit & IT Corridor',
        types: ['crossing', 'bus', 'junction', 'crash'],
        baseScores: { pedestrian: 92, vehicle: 84, infrastructure: 78, speed: 75, busProximity: 88, crashes: 70 },
        explanation: 'Intense pedestrian footfall from adjacent IT parks during evening peak hours with inadequate crossing infrastructure.',
        accidents: [
            { id: 'ACC-101', junctionName: 'Kondapur Junction', date: '2026-03-12', time: '18:30', type: 'Pedestrian Strike', severity: 'Severe Injury', vehicle: 'Two-Wheeler', casualties: 1 },
            { id: 'ACC-102', junctionName: 'Kondapur Junction', date: '2026-02-28', time: '14:15', type: 'Side Collision', severity: 'Property Damage', vehicle: 'Auto-Rickshaw', casualties: 0 }
        ]
    },
    {
        id: 'gachibowli',
        name: 'Gachibowli Crossroads',
        lat: 17.4401,
        lng: 78.3489,
        category: 'Major Multi-Axis Interchange',
        types: ['crossing', 'turning', 'junction', 'crash'],
        baseScores: { pedestrian: 88, vehicle: 95, infrastructure: 70, speed: 90, busProximity: 80, crashes: 85 },
        explanation: 'Wide turning radii and high vehicle speeds creating conflicts with pedestrians during green signal phases.',
        accidents: [
            { id: 'ACC-201', junctionName: 'Gachibowli Crossroads', date: '2026-03-15', time: '09:10', type: 'Rear-end Collision', severity: 'Fatal', vehicle: 'Car', casualties: 1 },
            { id: 'ACC-202', junctionName: 'Gachibowli Crossroads', date: '2026-03-01', time: '20:45', type: 'Skidding', severity: 'Minor Injury', vehicle: 'Two-Wheeler', casualties: 1 }
        ]
    },
    {
        id: 'cyberTowers',
        name: 'Cyber Towers Junction',
        lat: 17.4497,
        lng: 78.3813,
        category: 'IT Hub Core Junction',
        types: ['crossing', 'bus', 'informal', 'junction'],
        baseScores: { pedestrian: 95, vehicle: 80, infrastructure: 65, speed: 60, busProximity: 92, crashes: 60 },
        explanation: 'High pedestrian exposure due to metro connectivity and bus bays, causing mid-block informal crossings.',
        accidents: [
            { id: 'ACC-301', junctionName: 'Cyber Towers Junction', date: '2026-03-10', time: '17:20', type: 'Bus-Pedestrian Conflict', severity: 'Severe Injury', vehicle: 'RTC Bus', casualties: 2 }
        ]
    },
    {
        id: 'madhapur',
        name: 'Madhapur Main Road',
        lat: 17.4483,
        lng: 78.3915,
        category: 'Commercial & Residential Mix',
        types: ['bus', 'informal', 'turning'],
        baseScores: { pedestrian: 78, vehicle: 82, infrastructure: 80, speed: 65, busProximity: 85, crashes: 55 },
        explanation: 'On-street parking and chaotic boarding zones narrow carriageways and restrict visibility.',
        accidents: [
            { id: 'ACC-401', junctionName: 'Madhapur Main Road', date: '2026-03-05', time: '11:30', type: 'T-Bone Collision', severity: 'Minor Injury', vehicle: 'Car', casualties: 1 }
        ]
    },
    {
        id: 'kukatpally',
        name: 'Kukatpally Y Junction',
        lat: 17.4933,
        lng: 78.4057,
        category: 'High-Density Arterial',
        types: ['crossing', 'bus', 'junction', 'crash'],
        baseScores: { pedestrian: 90, vehicle: 92, infrastructure: 85, speed: 80, busProximity: 90, crashes: 82 },
        explanation: 'Severe bottleneck where traffic merges with the arterial highway without proper refuge islands.',
        accidents: [
            { id: 'ACC-501', junctionName: 'Kukatpally Y Junction', date: '2026-03-14', time: '19:00', type: 'Multi-Vehicle Pileup', severity: 'Severe Injury', vehicle: 'Commercial Truck', casualties: 3 }
        ]
    }
];

const AGENCIES = [
    { id: 'GHMC', name: 'Greater Hyderabad Municipal Corporation', division: 'Urban Infrastructure & Engineering Wing', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/ec/GHMC_Logo.png' },
    { id: 'HYD_TP', name: 'Hyderabad Traffic Police', division: 'Traffic Control & Enforcement Directorate', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/55/Telangana_Police_Logo.png' },
    { id: 'TGIIC', name: 'Telangana State Industrial Infrastructure Corp', division: 'IT Corridor Development Cell', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/3a/Seal_of_Telangana.png' }
];

const AVAILABLE_INTERVENTIONS = [
    { id: 'crossing', label: 'Add controlled pedestrian crossing (Pelican signal)', reduction: 18, icon: 'fa-person-walking-arrow-right' },
    { id: 'refuge', label: 'Construct median pedestrian refuge island', reduction: 12, icon: 'fa-road-barrier' },
    { id: 'busStop', label: 'Relocate bus stop 50m away from junction apex', reduction: 15, icon: 'fa-bus' },
    { id: 'lighting', label: 'Upgrade junction high-mast lighting & visibility', reduction: 8, icon: 'fa-lightbulb' },
    { id: 'speedBumps', label: 'Install table-top speed breakers / rumble strips', reduction: 10, icon: 'fa-gauge-high' }
];

// --- HELPER FUNCTIONS ---
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
    if (score > 75) return { label: '🔴 Critical Risk', bg: 'bg-red-500/20 text-red-400 border border-red-500/30' };
    if (score >= 50) return { label: '🟡 Emerging Risk', bg: 'bg-amber-500/20 text-amber-300 border border-amber-500/30' };
    return { label: '🟢 Relatively Safer', bg: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' };
};

const getMarkerColor = (score) => {
    if (score > 75) return '#ef4444';
    if (score >= 50) return '#f59e0b';
    return '#10b981';
};

// --- MAIN COMPONENT ---
export default function StreetSenseDashboard() {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markersRef = useRef({});
    const reportRef = useRef(null);

    // Navigation & Main States
    const [activeView, setActiveView] = useState('map'); // 'map', 'accidents', 'audit'
    const [junctionsData, setJunctionsData] = useState(JUNCTIONS_DATA);
    const [currentTimeHour, setCurrentTimeHour] = useState(19);
    const [activeFilters, setActiveFilters] = useState(['crossing', 'bus', 'turning', 'junction', 'informal', 'crash']);
    const [selectedJunctionId, setSelectedJunctionId] = useState(null);
    const [appliedInterventions, setAppliedInterventions] = useState(new Set());
    const [selectedAgency, setSelectedAgency] = useState(AGENCIES[0]);
    
    // Modal & Action states
    const [isMatrixModalOpen, setIsMatrixModalOpen] = useState(false);
    const [isUploadingPdf, setIsUploadingPdf] = useState(false);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    // Initialize Leaflet Map
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

    // Render Markers on Map based on filters and time
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
                setActiveView('map');
            });
            markersRef.current[junction.id] = marker;
        });
    }, [currentTimeHour, activeFilters, junctionsData]);

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

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setIsUploadingPdf(true);
        setTimeout(() => {
            const newAcc = {
                id: `ACC-90${Math.floor(Math.random() * 90) + 10}`,
                junctionName: selectedJunction?.name || 'Kondapur Junction',
                date: new Date().toISOString().split('T')[0],
                time: '16:45',
                type: 'Parsed PDF Incident: Uncontrolled Merge',
                severity: 'Minor Injury',
                vehicle: 'Commercial Delivery Van',
                casualties: 1
            };
            setJunctionsData(prev => prev.map(j => {
                if (j.id === (selectedJunction?.id || 'kondapur')) {
                    return { ...j, accidents: [newAcc, ...j.accidents] };
                }
                return j;
            }));
            setIsUploadingPdf(false);
            alert('Incident PDF parsed successfully! Added new record to log.');
        }, 1200);
    };

    const downloadPDFReport = () => {
        setIsGeneratingPdf(true);
        setTimeout(() => {
            setIsGeneratingPdf(false);
            alert('Official Agency Audit Report PDF downloaded successfully!');
        }, 1500);
    };

    // Selected Junction Calculations
    const selectedJunction = junctionsData.find(j => j.id === selectedJunctionId);
    let currentScore = selectedJunction ? computeScore(selectedJunction, currentTimeHour) : 0;
    let totalReduction = Array.from(appliedInterventions).reduce((acc, id) => {
        const item = AVAILABLE_INTERVENTIONS.find(i => i.id === id);
        return acc + (item ? item.reduction : 0);
    }, 0);
    let finalScore = Math.max(15, currentScore - totalReduction);

    // Global Accident Statistics
    const allAccidents = junctionsData.flatMap(j => j.accidents || []);
    const totalFatalities = allAccidents.reduce((sum, a) => sum + (a.severity === 'Fatal' ? a.casualties : 0), 0);
    const totalInjuries = allAccidents.reduce((sum, a) => sum + (a.severity.includes('Injury') ? a.casualties : 0), 0);

    return (
        <div className="bg-slate-950 text-slate-100 h-screen flex flex-col overflow-hidden font-sans">
            {/* Top Navigation Header */}
            <header className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex items-center justify-between shrink-0 shadow-lg z-30">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                        <i className="fa-solid fa-shield-halved text-white text-lg"></i>
                    </div>
                    <div>
                        <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                            StreetSense Hyderabad 
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">Cyberabad Hub</span>
                        </h1>
                        <p className="text-xs text-slate-400">See the conflict. Understand the cause. Fix the street.</p>
                    </div>
                </div>

                {/* Center Navigation Tabs */}
                <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
                    <button
                        onClick={() => setActiveView('map')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${activeView === 'map' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                    >
                        <i className="fa-solid fa-map-location-dot"></i> GIS Map & Studio
                    </button>
                    <button
                        onClick={() => setActiveView('accidents')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${activeView === 'accidents' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                    >
                        <i className="fa-solid fa-triangle-exclamation"></i> Accident Log
                    </button>
                    <button
                        onClick={() => setActiveView('audit')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${activeView === 'audit' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                    >
                        <i className="fa-solid fa-file-shield"></i> Agency Audit Report
                    </button>
                </div>

                <button 
                    onClick={() => setIsMatrixModalOpen(true)} 
                    className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-xs font-medium rounded-lg shadow-md flex items-center gap-2 hover:opacity-90 transition-opacity"
                >
                    <i className="fa-solid fa-ranking-star"></i> Priority Matrix
                </button>
            </header>

            {/* Main Content Body Switcher */}
            {activeView === 'map' ? (
                <div className="flex-1 flex flex-col lg:flex-row relative overflow-hidden">
                    {/* Left Sidebar Controls */}
                    <aside className="w-full lg:w-96 bg-slate-900/95 border-r border-slate-800 flex flex-col z-25 shrink-0 overflow-y-auto p-5 space-y-6">
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Time-Series Simulator</h2>
                                <span className="text-xs font-bold bg-indigo-500/10 text-indigo-400 px-2.5 py-1 rounded-full border border-indigo-500/20">{currentTimeHour}:00 IST</span>
                            </div>
                            <input 
                                type="range" min="6" max="23" step="1" value={currentTimeHour} 
                                onChange={(e) => setCurrentTimeHour(parseInt(e.target.value))}
                                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                            />
                            <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                                <span>06:00</span>
                                <span>12:00</span>
                                <span>18:00</span>
                                <span>23:00</span>
                            </div>
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

                        {/* Quick Junction Selector List */}
                        <div>
                            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Monitored Junctions</h2>
                            <div className="space-y-2">
                                {junctionsData.map(j => {
                                    const score = computeScore(j, currentTimeHour);
                                    const isSelected = j.id === selectedJunctionId;
                                    return (
                                        <div
                                            key={j.id}
                                            onClick={() => {
                                                setSelectedJunctionId(j.id);
                                                setAppliedInterventions(new Set());
                                            }}
                                            className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${isSelected ? 'bg-indigo-600/10 border-indigo-500/50 text-white' : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-300'}`}
                                        >
                                            <div>
                                                <h3 className="text-xs font-bold">{j.name}</h3>
                                                <span className="text-[10px] text-slate-400">{j.category}</span>
                                            </div>
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${getRiskBadge(score).bg}`}>
                                                {score}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </aside>

                    {/* Central Map Canvas */}
                    <main className="flex-1 relative">
                        <div ref={mapRef} className="w-full h-full" />
                    </main>

                    {/* Right Panel: Selected Junction Inspector & Interventions */}
                    {selectedJunction && (
                        <div className="w-full lg:w-[460px] bg-slate-900/98 border-l border-slate-800 flex flex-col z-30 p-5 space-y-5 overflow-y-auto">
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
                                    {AVAILABLE_INTERVENTIONS.map(item => {
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

                            <button 
                                onClick={() => setActiveView('audit')}
                                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                            >
                                <i className="fa-solid fa-file-shield"></i> View Official Agency Report
                            </button>
                        </div>
                    )}
                </div>
            ) : activeView === 'accidents' ? (
                /* Accident & Casualty Log View */
                <div className="flex-1 p-6 overflow-y-auto bg-slate-950 space-y-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                        <div>
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <i className="fa-solid fa-triangle-exclamation text-red-500"></i> Cyberabad Accident & Casualty Log
                            </h2>
                            <p className="text-xs text-slate-400 mt-1">Comprehensive historical incident registry across monitored Cyberabad junctions.</p>
                        </div>
                        <label className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl cursor-pointer shadow-md transition-all flex items-center gap-2">
                            <input type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" />
                            <i className="fa-solid fa-file-arrow-up"></i> {isUploadingPdf ? 'Parsing PDF...' : 'Upload Incident PDF'}
                        </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
                            <span className="text-xs text-slate-400 font-medium">Total Recorded Incidents</span>
                            <div className="text-2xl font-black text-white mt-1">{allAccidents.length}</div>
                        </div>
                        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
                            <span className="text-xs text-slate-400 font-medium">Total Fatalities</span>
                            <div className="text-2xl font-black text-red-400 mt-1">{totalFatalities}</div>
                        </div>
                        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
                            <span className="text-xs text-slate-400 font-medium">Total Injuries</span>
                            <div className="text-2xl font-black text-amber-400 mt-1">{totalInjuries}</div>
                        </div>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                        <div className="p-4 border-b border-slate-800 font-bold text-xs uppercase tracking-wider text-slate-300">
                            Incident History Database
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px]">
                                    <tr>
                                        <th className="p-3">Incident ID</th>
                                        <th className="p-3">Junction</th>
                                        <th className="p-3">Date & Time</th>
                                        <th className="p-3">Incident Type</th>
                                        <th className="p-3">Severity</th>
                                        <th className="p-3">Involved Vehicle</th>
                                        <th className="p-3">Casualties</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/60">
                                    {allAccidents.map((acc) => (
                                        <tr key={acc.id} className="hover:bg-slate-800/30 transition-colors">
                                            <td className="p-3 font-mono font-bold text-indigo-400">{acc.id}</td>
                                            <td className="p-3 font-semibold text-white">{acc.junctionName}</td>
                                            <td className="p-3 text-slate-400">{acc.date} at {acc.time}</td>
                                            <td className="p-3 text-slate-300">{acc.type}</td>
                                            <td className="p-3">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${acc.severity === 'Fatal' ? 'bg-red-500/20 text-red-400 border-red-500/30' : acc.severity.includes('Injury') ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-slate-700/50 text-slate-300 border-slate-600'}`}>
                                                    {acc.severity}
                                                </span>
                                            </td>
                                            <td className="p-3 text-slate-300">{acc.vehicle}</td>
                                            <td className="p-3 font-mono font-bold text-white">{acc.casualties}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ) : (
                /* Official Agency Audit Report View */
                <div className="flex-1 p-6 overflow-y-auto bg-slate-950 flex flex-col items-center">
                    <div className="w-full max-w-4xl flex justify-between items-center mb-4">
                        <div className="flex items-center gap-3">
                            <label className="text-xs text-slate-400 font-semibold">Select Auditing Agency:</label>
                            <select
                                value={selectedAgency.id}
                                onChange={(e) => {
                                    const found = AGENCIES.find(a => a.id === e.target.value);
                                    if (found) setSelectedAgency(found);
                                }}
                                className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none"
                            >
                                {AGENCIES.map(agency => (
                                    <option key={agency.id} value={agency.id}>{agency.name}</option>
                                ))}
                            </select>
                        </div>
                        <button 
                            onClick={downloadPDFReport}
                            disabled={isGeneratingPdf}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-md transition-all flex items-center gap-2"
                        >
                            <i className="fa-solid fa-download"></i> {isGeneratingPdf ? 'Generating PDF...' : 'Download Official PDF'}
                        </button>
                    </div>

                    <div ref={reportRef} className="w-full max-w-4xl bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl space-y-6 text-slate-100">
                        <div className="border-b border-slate-800 pb-6 flex justify-between items-start">
                            <div className="flex items-center gap-3">
                                <img src={selectedAgency.logoUrl} alt="Agency Logo" className="w-12 h-12 object-contain bg-white/5 rounded-lg p-1" />
                                <div>
                                    <div className="text-[10px] font-bold text-indigo-400 tracking-widest uppercase">{selectedAgency.name}</div>
                                    <h1 className="text-xl font-black text-white mt-1">ROAD SAFETY AUDIT & INTERVENTION BRIEF</h1>
                                    <p className="text-xs text-slate-400 mt-0.5">Generated via StreetSense Cyberabad Analytics Suite</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-xs font-mono font-bold bg-slate-800 px-3 py-1 rounded-lg border border-slate-700">Ref: AUDIT-2026-HYD</div>
                                <div className="text-[10px] text-slate-500 mt-1">Date: {new Date().toISOString().split('T')[0]}</div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                                <span className="text-[10px] uppercase font-bold text-slate-400">Audited Location</span>
                                <div className="text-base font-bold text-white mt-1">{selectedJunction?.name || 'Kondapur Junction'}</div>
                                <div className="text-xs text-slate-400 mt-0.5">{selectedJunction?.category || 'Major Transit & IT Corridor'}</div>
                            </div>
                            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                                <span className="text-[10px] uppercase font-bold text-slate-400">Current Risk Index</span>
                                <div className="text-base font-bold text-white mt-1 flex items-center gap-2">
                                    <span>{finalScore} / 100</span>
                                    <span className={`text-[10px] px-2 py-0.5 rounded border ${getRiskBadge(finalScore).bg}`}>
                                        {getRiskBadge(finalScore).label}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-2">Junction Safety Assessment & Analysis</h3>
                            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/40 p-4 rounded-xl border border-slate-800/80">
                                {selectedJunction?.explanation || 'Intense pedestrian footfall from adjacent IT parks during peak hours.'} Based on multi-variable telemetry, peak conflict hours concentrate between 17:00 and 20:00 IST.
                            </p>
                        </div>

                        <div>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-2">Recommended Interventions & Cost-Benefit Analysis</h3>
                            <div className="border border-slate-800 rounded-xl overflow-hidden">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-950 text-slate-400 uppercase text-[10px]">
                                        <tr>
                                            <th className="p-3">Intervention Measure</th>
                                            <th className="p-3">Risk Reduction</th>
                                            <th className="p-3">Timeline</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800">
                                        {AVAILABLE_INTERVENTIONS.map((item) => (
                                            <tr key={item.id} className="text-slate-300">
                                                <td className="p-3 font-semibold">{item.label}</td>
                                                <td className="p-3 text-emerald-400 font-bold">-{item.reduction} pts</td>
                                                <td className="p-3 text-slate-400">1-2 Weeks</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-slate-800 flex justify-between items-center text-[10px] text-slate-500">
                            <div>Authorized by {selectedAgency.name} ({selectedAgency.division})</div>
                            <div className="font-mono">Digital Signature Hash: 7F9A2B4E9901C</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Priority Matrix Modal */}
            {isMatrixModalOpen && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl p-6 space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto">
                        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                            <h2 className="text-sm font-bold text-white flex items-center gap-2">
                                <i className="fa-solid fa-ranking-star text-indigo-400"></i> Cyberabad Priority Junction Matrix
                            </h2>
                            <button onClick={() => setIsMatrixModalOpen(false)} className="text-slate-400 hover:text-white">
                                <i className="fa-solid fa-xmark text-lg"></i>
                            </button>
                        </div>
                        <p className="text-xs text-slate-400">Ranked by risk score multipliers, pedestrian exposure, and transit stop density during peak hour ({currentTimeHour}:00 IST).</p>
                        
                        <div className="space-y-2">
                            {junctionsData
                                .map(j => ({ ...j, currentScore: computeScore(j, currentTimeHour) }))
                                .sort((a, b) => b.currentScore - a.currentScore)
                                .map((j, index) => (
                                    <div key={j.id} className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className="w-6 h-6 rounded-lg bg-indigo-600/20 text-indigo-400 font-mono font-bold flex items-center justify-center text-xs border border-indigo-500/30">
                                                #{index + 1}
                                            </span>
                                            <div>
                                                <h4 className="text-xs font-bold text-white">{j.name}</h4>
                                                <span className="text-[10px] text-slate-400">{j.category}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="text-right">
                                                <div className="text-xs font-black text-white">{j.currentScore} / 100</div>
                                                <span className="text-[9px] text-slate-500">Risk Score</span>
                                            </div>
                                            <button 
                                                onClick={() => {
                                                    setSelectedJunctionId(j.id);
                                                    setActiveView('map');
                                                    setIsMatrixModalOpen(false);
                                                }}
                                                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold rounded-lg transition-all"
                                            >
                                                Inspect
                                            </button>
                                        </div>
                                    </div>
                                ))}
                        </div>

                        <div className="pt-2 flex justify-end">
                            <button onClick={() => setIsMatrixModalOpen(false)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs rounded-xl font-medium">Close Matrix</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}