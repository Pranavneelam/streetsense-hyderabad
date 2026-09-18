import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker so it parses documents properly
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const initialJunctionsData = [
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
            { id: 'ACC-801', date: '2026-02-14', time: '19:30', type: 'Pedestrian Strike', severity: 'Fatal', vehicle: 'Commercial Delivery Van', casualties: 1 },
            { id: 'ACC-802', date: '2026-01-28', time: '08:45', type: 'Rear-End Collision', severity: 'Severe Injury', vehicle: 'Two-Wheeler & Auto', casualties: 2 },
            { id: 'ACC-803', date: '2025-12-12', time: '21:15', type: 'Angle Collision', severity: 'Property Damage Only', vehicle: 'Car vs Car', casualties: 0 }
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
        explanation: 'Wide turning radii and high vehicle speeds creating severe conflict points with pedestrians during green signal phases.',
        accidents: [
            { id: 'ACC-701', date: '2026-03-02', time: '23:00', type: 'High-Speed Loss of Control', severity: 'Fatal', vehicle: 'Sports Utility Vehicle', casualties: 2 },
            { id: 'ACC-702', date: '2026-02-10', time: '14:20', type: 'Side-Swipe Turning Conflict', severity: 'Severe Injury', vehicle: 'RTC Bus & Bike', casualties: 1 },
            { id: 'ACC-703', date: '2026-01-15', time: '10:10', type: 'Pedestrian Crossing Mishap', severity: 'Severe Injury', vehicle: 'Cab', casualties: 1 }
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
        explanation: 'High pedestrian exposure due to metro connectivity and disorganized bus bays, causing mid-block informal crossings.',
        accidents: [
            { id: 'ACC-601', date: '2026-02-20', time: '18:00', type: 'Mid-Block Pedestrian Hit', severity: 'Severe Injury', vehicle: 'Auto Rickshaw', casualties: 1 },
            { id: 'ACC-602', date: '2026-01-05', time: '09:30', type: 'Bus Bay Conflict', severity: 'Property Damage Only', vehicle: 'RTC Bus', casualties: 0 }
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
        explanation: 'On-street parking and chaotic boarding zones narrow carriageways and severely restrict sightlines.',
        accidents: [
            { id: 'ACC-501', date: '2026-02-11', time: '16:45', type: 'Door-Zone / Parking Strike', severity: 'Minor Injury', vehicle: 'Two-Wheeler', casualties: 1 }
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
        explanation: 'Severe bottleneck where local traffic merges with the main arterial highway without proper refuge islands.',
        accidents: [
            { id: 'ACC-401', date: '2026-03-01', time: '20:15', type: 'Heavy Vehicle Merge Crash', severity: 'Fatal', vehicle: 'Multi-Axle Truck & Car', casualties: 1 },
            { id: 'ACC-402', date: '2026-02-04', time: '11:20', type: 'Pedestrian Refuge Collision', severity: 'Severe Injury', vehicle: 'Two-Wheeler', casualties: 1 }
        ]
    }
];

const availableInterventions = [
    { id: 'crossing', label: 'Add controlled pedestrian crossing (Pelican signal)', reduction: 18, cost: 150000, timeline: '2 Weeks' },
    { id: 'refuge', label: 'Construct median pedestrian refuge island', reduction: 12, cost: 95000, timeline: '1 Week' },
    { id: 'busStop', label: 'Relocate bus stop 50m away from junction apex', reduction: 15, cost: 40000, timeline: '3 Days' },
    { id: 'lighting', label: 'Upgrade junction high-mast lighting & visibility', reduction: 8, cost: 75000, timeline: '4 Days' },
    { id: 'speedBumps', label: 'Install table-top speed breakers / rumble strips', reduction: 10, cost: 30000, timeline: '2 Days' }
];

const governmentAgencies = [
    {
        name: 'GHMC (Greater Hyderabad Municipal Corporation)',
        division: 'Directorate of Urban Planning',
        badge: 'GHMC-UP-GIS',
        logoUrl: '/ghmc.png'
    },
    {
        name: 'Cyberabad Traffic Police',
        division: 'Traffic & Road Safety Wing',
        badge: 'CYBERABAD-PD-GIS',
        logoUrl: '/tspolice.png'
    },
    {
        name: 'TG-RTA (Telangana Road Transport Authority)',
        division: 'Safety & Audit Division',
        badge: 'TGRTA-AUDIT',
        logoUrl: '/tsrtc.png'
    }
];

export default function StreetSenseDashboard() {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markersRef = useRef({});
    const reportRef = useRef(null);

    const [junctionsData, setJunctionsData] = useState(initialJunctionsData);
    const [currentTimeHour, setCurrentTimeHour] = useState(() => {
        const currentHour = new Date().getHours();
        return Math.min(23, Math.max(6, currentHour));
    });
    const [isLiveMode, setIsLiveMode] = useState(true);
    const [activeFilters, setActiveFilters] = useState(['crossing', 'bus', 'turning', 'junction', 'informal', 'crash']);
    const [selectedJunctionId, setSelectedJunctionId] = useState('kondapur');
    const [appliedInterventions, setAppliedInterventions] = useState(new Set());
    const [activeView, setActiveView] = useState('map'); // 'map', 'report', 'accidents'
    const [isMatrixModalOpen, setIsMatrixModalOpen] = useState(false);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [isUploadingPdf, setIsUploadingPdf] = useState(false);
    const [selectedAgency, setSelectedAgency] = useState(governmentAgencies[0]);

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
                attribution: '&copy; OpenStreetMap contributors'
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
                    ${score > 75 ? '<div class="absolute w-12 h-12 rounded-full bg-red-500/30 animate-ping"></div>' : ''}
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
    }, [currentTimeHour, activeFilters, selectedJunctionId, activeView, junctionsData]);

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

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        setIsUploadingPdf(true);
        try {
            const arrayBuffer = await file.arrayBuffer();
            const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
            const pdfDoc = await loadingTask.promise;
            let extractedText = "";
            for (let i = 1; i <= pdfDoc.numPages; i++) {
                const page = await pdfDoc.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(" ");
                extractedText += pageText + "\n";
            }
            const newAccidentId = `ACC-${Math.floor(100 + Math.random() * 900)}`;
            const isFatal = extractedText.toLowerCase().includes('fatal') || extractedText.toLowerCase().includes('death');
            const severity = isFatal ? 'Fatal' : extractedText.toLowerCase().includes('severe') ? 'Severe Injury' : 'Property Damage Only';
            const casualties = isFatal ? 1 : (severity === 'Severe Injury' ? 1 : 0);
            const parsedAccident = {
                id: newAccidentId,
                date: new Date().toISOString().split('T')[0],
                time: '12:00',
                type: 'Uploaded Report Incident',
                severity: severity,
                vehicle: file.name.replace(/\.[^/.]+$/, ""),
                casualties: casualties
            };
            setJunctionsData(prevData => prevData.map(j => {
                if (j.id === selectedJunctionId) {
                    return {
                        ...j,
                        accidents: [parsedAccident, ...j.accidents]
                    };
                }
                return j;
            }));
            alert(`Successfully parsed and added incident log from ${file.name}!`);
        } catch (error) {
            console.error('Error parsing PDF:', error);
            alert('Failed to parse PDF file. Ensure it is a valid text-based document.');
        } finally {
            setIsUploadingPdf(false);
            event.target.value = null;
        }
    };

    const selectedJunction = junctionsData.find(j => j.id === selectedJunctionId) || junctionsData[0];
    const currentScore = computeScore(selectedJunction, currentTimeHour);
    const totalReduction = Array.from(appliedInterventions).reduce((acc, id) => {
        const item = availableInterventions.find(i => i.id === id);
        return acc + (item ? item.reduction : 0);
    }, 0);
    const finalScore = Math.max(15, currentScore - totalReduction);

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

    const allAccidents = junctionsData.flatMap(j => j.accidents.map(a => ({ ...a, junctionName: j.name })));
    const totalFatalities = allAccidents.filter(a => a.severity === 'Fatal').reduce((sum, a) => sum + a.casualties, 0);
    const totalInjuries = allAccidents.filter(a => a.severity === 'Severe Injury' || a.severity === 'Minor Injury').reduce((sum, a) => sum + a.casualties, 0);

    return (
        <div className="bg-slate-950 text-slate-100 h-screen w-screen flex flex-col overflow-hidden font-sans">
            {/* Header with Agency Logos */}
            <header className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex items-center justify-between shrink-0 shadow-lg z-30">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-slate-700 p-1 flex items-center justify-center shadow-md overflow-hidden">
                        <img
                            src={selectedAgency.logoUrl}
                            alt={selectedAgency.name}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                            }}
                        />
                        <div className="w-full h-full items-center justify-center hidden">
                            <i className="fa-solid fa-building-shield text-white text-sm"></i>
                        </div>
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-sm font-bold tracking-tight text-white">StreetSense Hyderabad</h1>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">{selectedAgency.badge}</span>
                        </div>
                        <p className="text-[11px] text-slate-400">Urban Traffic Conflict Analytics & Simulation Suite</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700 px-3 py-1.5 rounded-xl text-xs">
                        <i className="fa-solid fa-building-columns text-indigo-400"></i>
                        <select
                            value={selectedAgency.badge}
                            onChange={(e) => {
                                const found = governmentAgencies.find(a => a.badge === e.target.value);
                                if (found) setSelectedAgency(found);
                            }}
                            className="bg-transparent text-slate-200 font-semibold focus:outline-none cursor-pointer"
                        >
                            {governmentAgencies.map(agency => (
                                <option key={agency.badge} value={agency.badge} className="bg-slate-900 text-slate-200">
                                    {agency.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
                        <button
                            onClick={() => setActiveView('map')}
                            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${activeView === 'map' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                        >
                            <i className="fa-solid fa-map"></i> Map Dashboard
                        </button>
                        <button
                            onClick={() => setActiveView('accidents')}
                            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${activeView === 'accidents' ? 'bg-red-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                        >
                            <i className="fa-solid fa-triangle-exclamation"></i> Accident & Casualty Log
                        </button>
                        <button
                            onClick={() => setActiveView('report')}
                            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${activeView === 'report' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                        >
                            <i className="fa-solid fa-file-lines"></i> PDF Brief
                        </button>
                    </div>
                    <button onClick={() => setIsMatrixModalOpen(true)} className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl shadow-md transition-all flex items-center gap-1.5">
                        <i className="fa-solid fa-ranking-star"></i> Priority Matrix
                    </button>
                </div>
            </header>

            {/* Main Content Switcher */}
            {activeView === 'map' ? (
                <div className="flex-1 flex overflow-hidden">
                    <aside className="w-72 bg-slate-900/95 border-r border-slate-800 flex flex-col shrink-0 p-3 space-y-3 overflow-y-auto">
                        <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-2">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Time Mode</span>
                                    <button
                                        onClick={() => setIsLiveMode(!isLiveMode)}
                                        className={`text-[9px] px-2 py-0.5 rounded-full font-bold border transition-all ${isLiveMode ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-slate-700 text-slate-400 border-slate-600'}`}
                                    >
                                        {isLiveMode ? 'LIVE SYNC' : 'MANUAL'}
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

                    <main className="flex-1 relative h-full bg-slate-950">
                        <div ref={mapRef} className="absolute inset-0 w-full h-full" />
                    </main>

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

                        <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3 space-y-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Targeted Interventions</span>
                            <div className="space-y-1.5">
                                {availableInterventions.map((item) => {
                                    const applied = appliedInterventions.has(item.id);
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => toggleIntervention(item.id)}
                                            className={`w-full text-left p-2 rounded-lg border transition-all text-xs flex items-center justify-between ${applied ? 'bg-emerald-600/20 border-emerald-500 text-white' : 'bg-slate-900/50 border-slate-700 text-slate-300 hover:border-slate-500'}`}
                                        >
                                            <div className="pr-2">
                                                <div className="font-semibold">{item.label}</div>
                                                <div className="text-[10px] text-slate-400">-{item.reduction} pts risk | ₹{(item.cost).toLocaleString()}</div>
                                            </div>
                                            <div className={`w-4 h-4 rounded flex items-center justify-center border text-[10px] shrink-0 ${applied ? 'bg-emerald-600 border-emerald-400 text-white' : 'border-slate-600'}`}>
                                                {applied && <i className="fa-solid fa-check"></i>}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

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
                                                style={{ height: `${heightPct}%` }}
                                                className={`w-full rounded-t transition-all ${barColor} ${isCurrent ? 'ring-2 ring-white scale-y-105' : 'opacity-70 group-hover:opacity-100'}`}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </aside>
                </div>
            ) : activeView === 'accidents' ? (
                <div className="flex-1 p-6 overflow-y-auto bg-slate-950 space-y-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                        <div>
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <i className="fa-solid fa-triangle-exclamation text-red-500"></i> Accident & Casualty Log
                            </h2>
                            <p className="text-xs text-slate-400 mt-1">Comprehensive historical incident registry across all monitored Hyderabad junctions.</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <label className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl cursor-pointer shadow-md transition-all flex items-center gap-2">
                                <input type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" />
                                <i className="fa-solid fa-file-arrow-up"></i> {isUploadingPdf ? 'Parsing PDF...' : 'Upload Incident PDF'}
                            </label>
                        </div>
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
                <div className="flex-1 p-6 overflow-y-auto bg-slate-950 flex flex-col items-center">
                    <div className="w-full max-w-4xl flex justify-between items-center mb-4">
                        <h2 className="text-sm font-bold text-white">Official Agency Audit Report Preview</h2>
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
                                <img src={selectedAgency.logoUrl} alt="Agency Logo" className="w-12 h-12 object-contain" />
                                <div>
                                    <div className="text-[10px] font-bold text-indigo-400 tracking-widest uppercase">{selectedAgency.name}</div>
                                    <h1 className="text-xl font-black text-white mt-1">ROAD SAFETY AUDIT & INTERVENTION BRIEF</h1>
                                    <p className="text-xs text-slate-400 mt-0.5">Generated via StreetSense GIS Analytics Suite</p>
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
                                <div className="text-base font-bold text-white mt-1">{selectedJunction.name}</div>
                                <div className="text-xs text-slate-400 mt-0.5">{selectedJunction.category}</div>
                            </div>
                            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                                <span className="text-[10px] uppercase font-bold text-slate-400">Current Risk Index</span>
                                <div className="text-base font-bold text-white mt-1 flex items-center gap-2">
                                    <span>{finalScore}/100</span>
                                    <span className={`text-[10px] px-2 py-0.5 rounded border ${getRiskBadge(finalScore).bg}`}>
                                        {getRiskBadge(finalScore).label}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-2">Junction Safety Assessment & Analysis</h3>
                            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/40 p-4 rounded-xl border border-slate-800/80">
                                {selectedJunction.explanation} Based on multi-variable telemetry, peak conflict hours concentrate between 17:00 and 20:00 IST. Immediate administrative intervention is mandated to mitigate pedestrian vulnerability and vehicular conflict points.
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
                                            <th className="p-3">Est. Cost</th>
                                            <th className="p-3">Timeline</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800">
                                        {availableInterventions.map((item) => (
                                            <tr key={item.id} className="text-slate-300">
                                                <td className="p-3 font-semibold">{item.label}</td>
                                                <td className="p-3 text-emerald-400 font-bold">-{item.reduction} pts</td>
                                                <td className="p-3 font-mono">₹{item.cost.toLocaleString()}</td>
                                                <td className="p-3 text-slate-400">{item.timeline}</td>
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
                <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
                        <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                <i className="fa-solid fa-ranking-star text-indigo-400"></i> Hyderabad Junction Priority Matrix
                            </h3>
                            <button onClick={() => setIsMatrixModalOpen(false)} className="text-slate-400 hover:text-white">
                                <i className="fa-solid fa-xmark text-base"></i>
                            </button>
                        </div>
                        <div className="p-4 overflow-y-auto space-y-3">
                            <p className="text-xs text-slate-400">Junctions ranked in descending order of current risk score during peak hours for resource allocation.</p>
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
                                                    <div className="text-xs font-black text-white">{j.currentScore} / <span className="text-[9px] text-slate-500">Peak Risk</span></div>
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
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}