import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import * as pdfjsLib from 'pdfjs-dist';

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
        hourlyTrend: [30, 25, 20, 22, 35, 50, 75, 92, 95, 85, 70, 65, 60, 62, 70, 80, 95, 98, 92, 85, 75, 60, 45, 35],
        accidents: [
            { id: 'ACC-801', date: '2026-02-14', time: '19:30', type: 'Pedestrian Strike', severity: 'Fatal', vehicle: 'Commercial Delivery Van', casualties: 1 },
            { id: 'ACC-802', date: '2026-01-28', time: '08:45', type: 'Rear-End Collision', severity: 'Severe Injury', vehicle: 'Two-Wheeler & Auto', casualties: 2 }
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
        hourlyTrend: [35, 28, 22, 25, 40, 60, 82, 95, 98, 90, 75, 68, 62, 65, 75, 85, 98, 99, 94, 88, 78, 62, 48, 38],
        accidents: [
            { id: 'ACC-701', date: '2026-03-02', time: '23:00', type: 'High-Speed Loss of Control', severity: 'Fatal', vehicle: 'Sports Utility Vehicle', casualties: 2 }
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
        hourlyTrend: [28, 22, 18, 20, 38, 55, 78, 90, 96, 88, 72, 62, 58, 60, 68, 78, 92, 96, 90, 82, 70, 55, 42, 32],
        accidents: [
            { id: 'ACC-601', date: '2026-02-20', time: '18:00', type: 'Mid-Block Pedestrian Hit', severity: 'Severe Injury', vehicle: 'Auto Rickshaw', casualties: 1 }
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
        hourlyTrend: [25, 20, 15, 18, 30, 45, 65, 78, 85, 75, 62, 55, 50, 52, 60, 70, 82, 85, 80, 72, 60, 48, 35, 28],
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
        hourlyTrend: [32, 26, 20, 24, 42, 58, 80, 94, 97, 89, 74, 66, 60, 64, 72, 82, 96, 97, 95, 86, 75, 58, 44, 34],
        accidents: [
            { id: 'ACC-401', date: '2026-03-01', time: '20:15', type: 'Heavy Vehicle Merge Crash', severity: 'Fatal', vehicle: 'Multi-Axle Truck & Car', casualties: 1 }
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

const authorities = [
    { id: 'ghmc', name: 'GHMC (Greater Hyderabad Municipal Corporation)', badge: 'GHMC-UP-GIS', logoUrl: '/ghmc.png' },
    { id: 'police', name: 'Telangana State Police (Traffic & Safety Wing)', badge: 'TS-POLICE-GIS', logoUrl: '/tspolice.png' },
    { id: 'tsrtc', name: 'TSRTC / TGSRTC (Transport Corporation)', badge: 'TSRTC-GIS', logoUrl: '/tsrtc.png' }
];

export default function StreetSenseDashboard() {
    const mapRef = useRef(null);
    const excelInputRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markersRef = useRef({});
    const circleRef = useRef(null);
    const reportRef = useRef(null);
    const fileInputRef = useRef(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [badgeId, setBadgeId] = useState('GHMC-UP-GIS');
    const [password, setPassword] = useState('');

    const [junctionsData, setJunctionsData] = useState(initialJunctionsData);
    const [currentTimeMinutes, setCurrentTimeMinutes] = useState(() => {
        const now = new Date();
        return now.getHours() * 60 + now.getMinutes();
    });
    const [isLiveMode, setIsLiveMode] = useState(true);
    const [activeFilters, setActiveFilters] = useState(['crossing', 'bus', 'turning', 'junction', 'informal', 'crash']);
    const [selectedJunctionId, setSelectedJunctionId] = useState('kondapur');
    const [appliedInterventions, setAppliedInterventions] = useState(new Set(['crossing']));
    const [activeView, setActiveView] = useState('dashboard');
    const [selectedAuthorityId, setSelectedAuthorityId] = useState('police');
    const [trafficScenario, setTrafficScenario] = useState('normal');
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    // Area Analysis states
    const [isAreaAnalysisActive, setIsAreaAnalysisActive] = useState(true);
    const [analysisRadiusKm, setAnalysisRadiusKm] = useState(5);

    const currentHour = Math.floor(currentTimeMinutes / 60);
    const currentMinute = currentTimeMinutes % 60;

    useEffect(() => {
        if (!isLiveMode) return;
        const interval = setInterval(() => {
            const now = new Date();
            setCurrentTimeMinutes(now.getHours() * 60 + now.getMinutes());
        }, 15000);
        return () => clearInterval(interval);
    }, [isLiveMode]);

    const getScenarioMultiplier = () => {
        if (trafficScenario === 'rain') return 1.25;
        if (trafficScenario === 'festival') return 1.40;
        if (trafficScenario === 'vip') return 1.15;
        return 1.0;
    };

    const computeScore = (junction, totalMins) => {
        const hour = Math.floor(totalMins / 60);
        const minFrac = (totalMins % 60) / 60;
        const hourlyVal = junction.hourlyTrend[hour] || 50;
        const nextHourlyVal = junction.hourlyTrend[(hour + 1) % 24] || hourlyVal;
        
        const interpolatedVal = hourlyVal + (nextHourlyVal - hourlyVal) * minFrac;
        const scenarioMult = getScenarioMultiplier();
        const raw = interpolatedVal * scenarioMult;
        return Math.min(99, Math.max(20, Math.round(raw)));
    };

    const junctionsWithScores = junctionsData.map(j => ({
        ...j,
        currentScore: computeScore(j, currentTimeMinutes)
    }));
    const sortedJunctions = [...junctionsWithScores].sort((a, b) => b.currentScore - a.currentScore);
    
    const hotspotsCount = sortedJunctions.filter(j => j.currentScore > 75).length;
    const emergingCount = sortedJunctions.filter(j => j.currentScore >= 50 && j.currentScore <= 75).length;
    const saferCount = sortedJunctions.filter(j => j.currentScore < 50).length;

    const getDistanceFromLatLonInKm = (lat1, lon1, lat2, lon2) => {
        const R = 6371;
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a = 
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    const selectedJunction = sortedJunctions.find(j => j.id === selectedJunctionId) || sortedJunctions[0];

    const junctionsInRadius = sortedJunctions.filter(j => {
        const dist = getDistanceFromLatLonInKm(selectedJunction.lat, selectedJunction.lng, j.lat, j.lng);
        return dist <= analysisRadiusKm;
    });

    const regionalRiskScore = junctionsInRadius.length > 0 
        ? Math.round(junctionsInRadius.reduce((acc, j) => acc + j.currentScore, 0) / junctionsInRadius.length)
        : selectedJunction.currentScore;

    const toggleFilter = (type) => {
        setActiveFilters(prev => 
            prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
        );
    };
    const handleLogin = (e) => {
    e.preventDefault();
    if (!badgeId.trim()) {
        alert('Please enter a valid Department Badge ID.');
        return;
    }
    // Simple authentication pass for demo / evaluation
    setIsAuthenticated(true);
};

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        try {
            const arrayBuffer = await file.arrayBuffer();
            const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
            const pdfDoc = await loadingTask.promise;
            
            let extractedText = '';
            for (let i = 1; i <= pdfDoc.numPages; i++) {
                const page = await pdfDoc.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(' ');
                extractedText += ` [Page ${i}] ${pageText}`;
            }

            const newAccidentId = `ACC-EXT-${Math.floor(100 + Math.random() * 900)}`;
            const parsedAccident = {
                id: newAccidentId,
                date: new Date().toISOString().split('T')[0],
                time: `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`,
                type: 'Imported Incident Report',
                severity: extractedText.toLowerCase().includes('fatal') ? 'Fatal' : 'Severe Injury',
                vehicle: file.name.replace('.pdf', ''),
                casualties: 1
            };

            setJunctionsData(prevJunctions => 
                prevJunctions.map(j => {
                    if (j.id === selectedJunctionId) {
                        return {
                            ...j,
                            baseScores: { ...j.baseScores, crashes: Math.min(99, j.baseScores.crashes + 10) },
                            accidents: [parsedAccident, ...j.accidents]
                        };
                    }
                    return j;
                })
            );
            alert(`Successfully ingested and parsed "${file.name}"! Added incident ${newAccidentId} to ${selectedJunctionId} junction profile.`);
        } catch (err) {
            console.error('Error parsing uploaded accident PDF:', err);
            alert('Failed to parse PDF document. Please ensure it is a valid text-readable PDF file.');
        }
    };
    const handleExcelUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
            alert('The uploaded Excel sheet is empty.');
            return;
        }

        let importedCount = 0;

        setJunctionsData(prevJunctions => {
            const updatedJunctions = [...prevJunctions];

            jsonData.forEach((row) => {
                const jName = String(row.JunctionName || row.junction || row.Name || 'kondapur').toLowerCase();
                const accId = row.IncidentID || row.ID || `ACC-XL-${Math.floor(1000 + Math.random() * 9000)}`;
                const date = row.Date || new Date().toISOString().split('T')[0];
                const time = row.Time || '12:00';
                const type = row.Type || row.IncidentType || 'Imported Road Mishap';
                const severity = row.Severity || 'Severe Injury';
                const vehicle = row.Vehicle || row.VehicleType || 'Unknown Vehicle';
                const casualties = parseInt(row.Casualties || row.Injured || 1, 10);

                let targetJunction = updatedJunctions.find(j => j.id.toLowerCase() === jName || j.name.toLowerCase().includes(jName));
                
                if (!targetJunction) {
                    targetJunction = updatedJunctions.find(j => j.id === selectedJunctionId) || updatedJunctions[0];
                }

                const newAccident = {
                    id: String(accId),
                    date: String(date),
                    time: String(time),
                    type: String(type),
                    severity: String(severity),
                    vehicle: String(vehicle),
                    casualties: isNaN(casualties) ? 1 : casualties
                };

                targetJunction.accidents.unshift(newAccident);
                if (targetJunction.baseScores && typeof targetJunction.baseScores.crashes === 'number') {
                    targetJunction.baseScores.crashes = Math.min(99, targetJunction.baseScores.crashes + 4);
                }
                importedCount++;
            });

            return updatedJunctions;
        });

        alert(`Successfully imported ${importedCount} accident records from "${file.name}"!`);
    } catch (err) {
        console.error('Error parsing Excel file:', err);
        alert('Failed to parse Excel file. Please ensure it is a valid .xlsx or .csv file.');
    } finally {
        if (excelInputRef.current) excelInputRef.current.value = '';
    }
};

    useEffect(() => {
        if (activeView !== 'dashboard') return;
        const timer = setTimeout(() => {
            if (mapRef.current) {
                if (mapInstanceRef.current) {
                    mapInstanceRef.current.remove();
                    mapInstanceRef.current = null;
                }
                const map = L.map(mapRef.current, { zoomControl: false }).setView([selectedJunction.lat, selectedJunction.lng], 13);
                
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    maxZoom: 19,
                    attribution: '&copy; OpenStreetMap contributors'
                }).addTo(map);
                
                L.control.zoom({ position: 'bottomright' }).addTo(map);
                mapInstanceRef.current = map;
            }
        }, 50);
        return () => {
            clearTimeout(timer);
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, [activeView]);

    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map) return;

        if (circleRef.current) {
            map.removeLayer(circleRef.current);
            circleRef.current = null;
        }

        if (isAreaAnalysisActive) {
            circleRef.current = L.circle([selectedJunction.lat, selectedJunction.lng], {
                radius: analysisRadiusKm * 1000,
                color: '#6366f1',
                fillColor: '#6366f1',
                fillOpacity: 0.15,
                weight: 2,
                dashArray: '4, 4'
            }).addTo(map);
        }

        Object.values(markersRef.current).forEach(m => map.removeLayer(m));
        markersRef.current = {};

        sortedJunctions.forEach(junction => {
            const matchesFilter = junction.types.some(t => activeFilters.includes(t));
            if (!matchesFilter) return;
            const score = junction.currentScore;
            const isSelected = selectedJunctionId === junction.id;
            
            const htmlIcon = `
                <div class="relative flex items-center justify-center cursor-pointer group">
                    <div class="absolute w-14 h-14 rounded-full bg-red-500/40 animate-ping"></div>
                    <div class="absolute w-20 h-20 rounded-full border border-red-500/50 animate-pulse"></div>
                    <div class="px-3 py-1.5 rounded-xl shadow-2xl flex items-center gap-1.5 border backdrop-blur-md transition-all transform ${
                        isSelected
                            ? 'bg-red-600 border-white text-white scale-125 z-50 shadow-[0_0_20px_#ef4444]'
                            : 'bg-red-500 text-white border-red-300 shadow-[0_0_12px_rgba(239,68,68,0.6)]'
                    }">
                        <div class="w-2.5 h-2.5 rounded-full bg-emerald-300 animate-ping"></div>
                        <span class="font-black text-xs tracking-wider">${score}</span>
                    </div>
                </div>
            `;
            const customMarker = L.divIcon({
                className: 'custom-div-icon',
                html: htmlIcon,
                iconSize: [60, 44],
                iconAnchor: [30, 22]
            });
            const marker = L.marker([junction.lat, junction.lng], { icon: customMarker }).addTo(map);
            marker.on('click', () => setSelectedJunctionId(junction.id));
            markersRef.current[junction.id] = marker;
        });
    }, [currentTimeMinutes, activeFilters, selectedJunctionId, sortedJunctions, activeView, trafficScenario, isAreaAnalysisActive, analysisRadiusKm]);

    const currentAuthority = authorities.find(a => a.id === selectedAuthorityId) || authorities[1];
    const currentScore = selectedJunction.currentScore;
    
    const totalReduction = Array.from(appliedInterventions).reduce((acc, id) => {
        const item = availableInterventions.find(i => i.id === id);
        return acc + (item ? item.reduction : 0);
    }, 0);
    const finalScore = Math.max(15, currentScore - totalReduction);

    const downloadPDFReport = async () => {
        if (!reportRef.current) return;
        try {
            setIsGeneratingPdf(true);
            const canvas = await html2canvas(reportRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`${selectedJunction.id}-${currentAuthority.id}-comprehensive-audit.pdf`);
        } catch (err) {
            console.error(err);
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    const allAccidents = sortedJunctions.flatMap(j => j.accidents.map(a => ({ ...a, junctionName: j.name, conflictScore: j.currentScore })));
    const sortedAccidents = [...allAccidents].sort((a, b) => b.conflictScore - a.conflictScore);

    const getBarColor = (val) => {
        if (val > 80) return 'bg-red-500 shadow-[0_0_8px_#ef4444]';
        if (val >= 60) return 'bg-amber-500 shadow-[0_0_8px_#f59e0b]';
        return 'bg-emerald-500 shadow-[0_0_8px_#10b981]';
    };
    if (!isAuthenticated) {
        return (
<div className="bg-slate-50 text-slate-900 h-screen w-screen flex flex-col items-center justify-center p-4 font-sans select-none">
    <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl shadow-xl p-8 flex flex-col items-center relative overflow-hidden">
        {/* Agency Logos */}
        <div className="flex items-center gap-4 mb-6 bg-slate-100 px-5 py-2.5 rounded-full border border-slate-200 shadow-inner">
            <img src="/ghmc.png" alt="GHMC Logo" className="w-8 h-8 object-contain drop-shadow" />
            <div className="w-px h-5 bg-slate-300"></div>
            <img src="/tspolice.png" alt="TS Police Logo" className="w-8 h-8 object-contain drop-shadow" />
            <div className="w-px h-5 bg-slate-300"></div>
            <img src="/tsrtc.png" alt="TSRTC Logo" className="w-8 h-8 object-contain drop-shadow" />
        </div>

        <h1 className="text-2xl font-black tracking-tight text-slate-900 mb-1">StreetSense Hyderabad</h1>
        <p className="text-[11px] font-bold tracking-widest text-indigo-600 uppercase mb-8">Cyberabad Official Agency Portal</p>

        <form onSubmit={handleLogin} className="w-full space-y-5">
            <div>
                <label className="block text-[10px] font-extrabold tracking-wider text-slate-600 uppercase mb-2">
                    Department Badge ID
                </label>
                <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <i className="fa-solid fa-id-card"></i>
                    </span>
                    <input
                        type="text"
                        value={badgeId}
                        onChange={(e) => setBadgeId(e.target.value)}
                        placeholder="Enter Badge ID"
                        required
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-indigo-600 transition-all"
                    />
                </div>
            </div>

            <div>
                <label className="block text-[10px] font-extrabold tracking-wider text-slate-600 uppercase mb-2">
                    Security Pin / Password
                </label>
                <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <i className="fa-solid fa-lock"></i>
                    </span>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-900 focus:outline-none focus:border-indigo-600 transition-all"
                    />
                </div>
            </div>

            <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
                <i className="fa-solid fa-right-to-bracket"></i> Secure Agency Access
            </button>
        </form>

        <p className="text-[11px] text-slate-500 text-center mt-6">
            Restricted access for authorized personnel of GHMC, Hyderabad Traffic Police & TSRTC only.
        </p>
    <p className="text-[11px] text-slate-500 text-center mt-6">
                        Restricted access for authorized personnel of GHMC, Hyderabad Traffic Police & TSRTC only.
                    </p>
                </div>
                <div className="text-[10px] text-slate-400 mt-6 tracking-wide">
                    Cyberabad Urban Traffic Intelligence Infrastructure • Secure SSL Session
                </div>
            </div>
        );
    }

    return (
        <div className="bg-slate-950 text-slate-100 h-screen w-screen flex flex-col overflow-hidden font-sans">
            <style>{`
                .leaflet-div-icon {
                .leaflet-div-icon {
                    background: transparent !important;
                    border: none !important;
                }
            `}</style>
            
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".pdf"
                className="hidden"
            />
            <input
                type="file"
                ref={excelInputRef}
                onChange={handleExcelUpload}
                accept=".xlsx, .xls, .csv"
                className="hidden"
            />

            {/* Top Navigation Bar */}
            <header className="bg-slate-900 border-b border-slate-800 px-5 py-2.5 flex items-center justify-between shrink-0 shadow-lg z-30">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-700 flex items-center justify-center p-1 shadow">
                        <img src={currentAuthority.logoUrl} alt="Authority Logo" className="w-full h-full object-contain" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-sm font-bold tracking-tight text-white">StreetSense Hyderabad</h1>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">{currentAuthority.badge}</span>
                        </div>
                        <p className="text-[10px] text-slate-400">Urban Traffic Conflict Analytics & Simulation Suite</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow transition-all flex items-center gap-1.5"
                    >
                        <i className="fa-solid fa-cloud-arrow-up"></i> Upload Accident PDF
                    </button>
                    <button
                        onClick={() => excelInputRef.current?.click()}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                        <i className="fa-solid fa-file-excel"></i> Upload Excel Data
                    </button>
                    <select
                        value={trafficScenario}
                        onChange={(e) => setTrafficScenario(e.target.value)}
                        className="bg-indigo-950/80 border border-indigo-500/50 text-xs font-semibold text-indigo-200 px-3 py-1.5 rounded-lg focus:outline-none shadow"
                    >
                        <option value="normal">Scenario: Normal Flow</option>
                        <option value="rain">Scenario: Heavy Rain / Waterlogging</option>
                        <option value="festival">Scenario: Festive Rush (Peak)</option>
                        <option value="vip">Scenario: VIP Convoy Corridor</option>
                    </select>
                    <select
                        value={selectedAuthorityId}
                        onChange={(e) => setSelectedAuthorityId(e.target.value)}
                        className="bg-slate-950 border border-slate-700 text-xs font-semibold text-white px-3 py-1.5 rounded-lg focus:outline-none focus:border-indigo-500 shadow"
                    >
                        {authorities.map(auth => (
                            <option key={auth.id} value={auth.id}>{auth.name}</option>
                        ))}
                    </select>
                    <button
                        onClick={() => setActiveView(activeView === 'report' ? 'dashboard' : 'report')}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow transition-all flex items-center gap-1.5"
                    >
                        <i className="fa-solid fa-file-lines"></i> {activeView === 'report' ? 'Back to Map' : 'Export Report View'}
                    </button>
                    <button
                        onClick={() => setActiveView(activeView === 'accidents' ? 'dashboard' : 'accidents')}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg border border-slate-700 transition-all flex items-center gap-1.5"
                    >
                        <i className="fa-solid fa-triangle-exclamation text-amber-400"></i> Priority Matrix
                    </button>
                </div>
            </header>

            {activeView === 'dashboard' ? (
                <div className="flex-1 relative flex overflow-hidden">
                    {/* Left Floating Control Panel */}
                    <div className="absolute top-4 left-4 z-20 w-72 bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-2xl p-4 shadow-2xl space-y-4 max-h-[calc(100vh-80px)] overflow-y-auto">
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Time Mode</span>
                                <button
                                    onClick={() => {
                                        setIsLiveMode(true);
                                        const now = new Date();
                                        setCurrentTimeMinutes(now.getHours() * 60 + now.getMinutes());
                                    }}
                                    className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${
                                        isLiveMode 
                                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                                    }`}
                                >
                                    <span className={`w-1.5 h-1.5 rounded-full ${isLiveMode ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`}></span> 
                                    {isLiveMode ? 'LIVE SYNC ACTIVE' : 'CLICK TO RESYNC'}
                                </button>
                            </div>
                            <div className="text-xs font-mono font-bold text-indigo-300 mb-2 flex justify-between">
                                <span>{String(currentHour).padStart(2, '0')}:{String(currentMinute).padStart(2, '0')} IST</span>
                                <span className="text-[10px] text-slate-400">{trafficScenario !== 'normal' ? `Scenario Active` : 'Standard'}</span>
                            </div>
                            <input
                                type="range" min="0" max="1439" step="15" value={currentTimeMinutes}
                                onChange={(e) => { setIsLiveMode(false); setCurrentTimeMinutes(parseInt(e.target.value)); }}
                                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                            />
                            <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-1">
                                <span>00:00</span>
                                <span>08:00</span>
                                <span>16:00</span>
                                <span>23:45</span>
                            </div>
                        </div>

                        {/* Area Analysis Module */}
                        <div className="pt-3 border-t border-slate-800 space-y-2.5">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Area Analysis</span>
                                <button
                                    onClick={() => setIsAreaAnalysisActive(!isAreaAnalysisActive)}
                                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-all ${
                                        isAreaAnalysisActive 
                                            ? 'bg-indigo-600 border-indigo-400 text-white shadow-[0_0_10px_rgba(99,102,241,0.5)]' 
                                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                                    }`}
                                >
                                    {isAreaAnalysisActive ? 'ACTIVE' : 'OFF'}
                                </button>
                            </div>
                            {isAreaAnalysisActive && (
                                <>
                                    <div className="text-[10px] text-slate-400 font-medium">Radius: <span className="text-indigo-300 font-bold">{analysisRadiusKm}km</span></div>
                                    <div className="grid grid-cols-2 gap-2">
                                        {[5, 10, 25, 50].map(km => (
                                            <button
                                                key={km}
                                                onClick={() => setAnalysisRadiusKm(km)}
                                                className={`py-1.5 rounded-xl border text-xs font-bold transition-all ${
                                                    analysisRadiusKm === km 
                                                        ? 'bg-indigo-600 border-indigo-400 text-white shadow' 
                                                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800/60'
                                                }`}
                                            >
                                                {km}km
                                            </button>
                                        ))}
                                    </div>
                                    <div className="text-[9px] text-slate-500 italic">Centered on: {selectedJunction.name}</div>
                                </>
                            )}
                        </div>

                        {/* Conflict Filters */}
                        <div className="pt-3 border-t border-slate-800">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">Conflict Filters</span>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { id: 'crossing', label: 'Crossing' },
                                    { id: 'bus', label: 'Bus Bay' },
                                    { id: 'turning', label: 'Turning' },
                                    { id: 'junction', label: 'Junction' },
                                    { id: 'informal', label: 'Informal' },
                                    { id: 'crash', label: 'Crash' }
                                ].map(f => {
                                    const active = activeFilters.includes(f.id);
                                    return (
                                        <button
                                            key={f.id}
                                            onClick={() => toggleFilter(f.id)}
                                            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all ${
                                                active 
                                                    ? 'bg-indigo-600/20 border-indigo-500/60 text-white shadow' 
                                                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                                            }`}
                                        >
                                            <div className={`w-3 h-3 rounded-md flex items-center justify-center text-[9px] ${active ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-transparent'}`}>✓</div>
                                            <span className="truncate">{f.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Risk Index Legend */}
                        <div className="pt-3 border-t border-slate-800 space-y-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Risk Index Legend</span>
                            <div className="space-y-1.5 text-xs">
                                <div className="flex items-center justify-between bg-slate-950/60 p-2 rounded-xl border border-slate-800/80">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></div>
                                        <span className="text-slate-300 font-medium">Hotspots (&gt;75)</span>
                                    </div>
                                    <span className="font-mono font-bold text-red-400">{hotspotsCount}</span>
                                </div>
                                <div className="flex items-center justify-between bg-slate-950/60 p-2 rounded-xl border border-slate-800/80">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                                        <span className="text-slate-300 font-medium">Emerging Risk (50-75)</span>
                                    </div>
                                    <span className="font-mono font-bold text-amber-400">{emergingCount}</span>
                                </div>
                                <div className="flex items-center justify-between bg-slate-950/60 p-2 rounded-xl border border-slate-800/80">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                                        <span className="text-slate-300 font-medium">Safer (&lt;50)</span>
                                    </div>
                                    <span className="font-mono font-bold text-emerald-400">{saferCount}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Central Map Canvas */}
                    <div className="flex-1 relative w-full h-full">
                        <div ref={mapRef} className="absolute inset-0 w-full h-full z-10" />
                    </div>

                    {/* Right Inspection Panel */}
                    <div className="absolute top-4 right-4 z-20 w-80 bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-2xl p-4 shadow-2xl space-y-4 max-h-[calc(100vh-80px)] overflow-y-auto">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                            <div>
                                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                                    {isAreaAnalysisActive ? 'Regional Safety Audit' : 'Junction Deep Dive'}
                                </span>
                                <h3 className="text-sm font-black text-white">
                                    {isAreaAnalysisActive ? `${analysisRadiusKm}km Radius Scan` : selectedJunction.name}
                                </h3>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/40 uppercase animate-pulse">
                                {regionalRiskScore > 75 ? 'HOTSPOT' : 'MODERATE'}
                            </span>
                        </div>

                        {/* Regional / Junction Score Card */}
                        <div className="grid grid-cols-2 gap-2">
                            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                    {isAreaAnalysisActive ? 'Regional Risk' : 'Conflict Score'}
                                </span>
                                <span className="text-2xl font-black text-white">{regionalRiskScore} <span className="text-xs text-slate-400 font-normal">/ 100</span></span>
                            </div>
                            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                    {isAreaAnalysisActive ? 'Junctions Found' : 'Severity Level'}
                                </span>
                                <span className="text-2xl font-black text-indigo-300">
                                    {isAreaAnalysisActive ? junctionsInRadius.length : (currentScore > 75 ? 'Critical' : 'Moderate')}
                                </span>
                            </div>
                        </div>

                        {/* Regional Contributors or Risk Factor Breakdown */}
                        {isAreaAnalysisActive ? (
                            <div className="space-y-2.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Regional Contributors</span>
                                    <span className="text-[9px] font-mono text-indigo-400">{analysisRadiusKm}km Buffer</span>
                                </div>
                                <div className="space-y-2">
                                    {junctionsInRadius.map(j => (
                                        <div 
                                            key={j.id} 
                                            onClick={() => setSelectedJunctionId(j.id)}
                                            className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between cursor-pointer hover:border-indigo-500 transition-all"
                                        >
                                            <div>
                                                <div className="text-xs font-bold text-white">{j.name}</div>
                                                <div className="text-[10px] text-slate-400">{j.category}</div>
                                            </div>
                                            <span className="font-mono font-bold text-red-400">{j.currentScore}/100</span>
                                        </div>
                                    ))}
                                    {junctionsInRadius.length === 0 && (
                                        <p className="text-xs text-slate-500 text-center py-4">No junctions found within this radius.</p>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3 pt-1">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Risk Factor Breakdown</span>
                                    <span className="text-[9px] font-mono text-slate-500">Scale 0-100</span>
                                </div>
                                <div className="space-y-2.5 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                                    {[
                                        { label: 'Pedestrian', val: selectedJunction.baseScores.pedestrian },
                                        { label: 'Vehicle', val: selectedJunction.baseScores.vehicle },
                                        { label: 'Infrastructure', val: selectedJunction.baseScores.infrastructure },
                                        { label: 'Speed', val: selectedJunction.baseScores.speed },
                                        { label: 'Bus Proximity', val: selectedJunction.baseScores.busProximity },
                                        { label: 'Crashes', val: selectedJunction.baseScores.crashes }
                                    ].map(rf => (
                                        <div key={rf.label} className="space-y-1">
                                            <div className="flex justify-between text-xs">
                                                <span className="text-slate-300 font-medium">{rf.label}</span>
                                                <span className="font-mono font-bold text-white">{rf.val}%</span>
                                            </div>
                                            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                                <div className={`h-full rounded-full ${getBarColor(rf.val)}`} style={{ width: `${rf.val}%` }}></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {!isAreaAnalysisActive && (
                            <div className="space-y-2 pt-2 border-t border-slate-800">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">AI Diagnostic Summary</span>
                                <p className="text-[11px] leading-relaxed text-slate-300 bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                                    {selectedJunction.explanation}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            ) : activeView === 'report' ? (
                <div className="flex-1 p-6 overflow-y-auto bg-slate-950 flex flex-col items-center">
                    <div className="w-full max-w-4xl flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">Select Junction Brief:</span>
                            <select
                                value={selectedJunctionId}
                                onChange={(e) => setSelectedJunctionId(e.target.value)}
                                className="bg-slate-900 border border-slate-700 text-xs text-white rounded-lg px-3 py-1.5 font-semibold focus:outline-none"
                            >
                                {sortedJunctions.map(j => (
                                    <option key={j.id} value={j.id}>{j.name} ({j.currentScore})</option>
                                ))}
                            </select>
                        </div>
                        <button
                            onClick={downloadPDFReport}
                            disabled={isGeneratingPdf}
                            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow transition-all flex items-center gap-1.5"
                        >
                            <i className="fa-solid fa-download"></i> {isGeneratingPdf ? 'Exporting PDF...' : 'Download Official PDF'}
                        </button>
                    </div>

                    {/* PDF Report Container */}
                    <div ref={reportRef} className="w-full max-w-4xl bg-white text-slate-900 p-10 rounded-xl shadow-2xl space-y-8 font-sans border border-slate-300">
                        <div className="flex justify-between items-center border-b-2 border-slate-900 pb-6">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-xl bg-white border border-slate-300 p-1.5 flex items-center justify-center shadow">
                                    <img src={currentAuthority.logoUrl} alt="Report Logo" className="w-full h-full object-contain" />
                                </div>
                                <div>
                                    <h1 className="text-base font-black uppercase tracking-wider text-slate-900">{currentAuthority.name}</h1>
                                    <p className="text-xs font-semibold text-slate-600">Urban Traffic Safety & Operations Directorate</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-[11px] font-mono font-bold text-slate-700">Ref: AUDIT-{selectedJunction.id.toUpperCase()}</div>
                                <div className="text-[11px] font-medium text-slate-500">Date: 9/18/2026</div>
                                <div className="text-[10px] uppercase font-bold text-red-600 mt-1 tracking-widest">Confidential / Official Audit</div>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <div className="text-xs font-bold uppercase tracking-widest text-indigo-700">Junction Safety & Incident Audit Brief</div>
                            <h2 className="text-2xl font-black text-slate-900">{selectedJunction.name}</h2>
                            <p className="text-xs font-semibold text-slate-500">Category: {selectedJunction.category} | Coordinates: {selectedJunction.lat}, {selectedJunction.lng}</p>
                        </div>

                        <div className="grid grid-cols-3 gap-6 bg-slate-50 border border-slate-200 p-5 rounded-xl">
                            <div className="col-span-2 space-y-2">
                                <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">Primary Safety Hazard Analysis</h3>
                                <p className="text-xs leading-relaxed text-slate-700 font-medium">
                                    {selectedJunction.explanation}
                                </p>
                            </div>
                            <div className="border-l border-slate-200 pl-6 flex flex-col justify-center">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Current Risk Index</span>
                                <div className="text-3xl font-black text-red-600 mt-1">{finalScore} / 100</div>
                                <span className="text-[10px] text-slate-500 mt-1">Simulated / Live Flow</span>
                            </div>
                        </div>

                        {/* Recorded Incidents Table */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">Historical Incidents & Crash Records</h3>
                            <div className="border border-slate-200 rounded-xl overflow-hidden">
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                        <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                                            <th className="p-3">Incident ID</th>
                                            <th className="p-3">Date & Time</th>
                                            <th className="p-3">Type</th>
                                            <th className="p-3">Severity</th>
                                            <th className="p-3">Vehicle Involved</th>
                                            <th className="p-3">Casualties</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 text-slate-800">
                                        {selectedJunction.accidents.map(acc => (
                                            <tr key={acc.id} className="hover:bg-slate-50">
                                                <td className="p-3 font-mono font-bold text-indigo-700">{acc.id}</td>
                                                <td className="p-3">{acc.date} {acc.time}</td>
                                                <td className="p-3 font-medium">{acc.type}</td>
                                                <td className="p-3">
                                                    <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${acc.severity === 'Fatal' ? 'bg-red-100 text-red-700 border border-red-300' : 'bg-amber-100 text-amber-700 border border-amber-300'}`}>
                                                        {acc.severity}
                                                    </span>
                                                </td>
                                                <td className="p-3">{acc.vehicle}</td>
                                                <td className="p-3 font-mono font-bold">{acc.casualties}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Proposed Countermeasures */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">Recommended Countermeasures & Mitigation Plan</h3>
                            <div className="grid grid-cols-2 gap-3">
                                {availableInterventions.map(item => {
                                    const isApplied = appliedInterventions.has(item.id);
                                    return (
                                        <div key={item.id} className={`p-3 rounded-xl border flex items-center justify-between ${isApplied ? 'bg-indigo-50 border-indigo-300 text-indigo-950' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                                            <div className="space-y-1">
                                                <div className="text-xs font-bold">{item.label}</div>
                                                <div className="text-[10px] text-slate-500 font-medium">Est. Risk Reduction: <span className="text-emerald-600 font-bold">-{item.reduction}%</span> | Cost: ₹{(item.cost).toLocaleString()}</div>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    setAppliedInterventions(prev => {
                                                        const next = new Set(prev);
                                                        if (next.has(item.id)) next.delete(item.id);
                                                        else next.add(item.id);
                                                        return next;
                                                    });
                                                }}
                                                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${isApplied ? 'bg-indigo-600 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'}`}
                                            >
                                                {isApplied ? 'Applied' : 'Apply'}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="pt-6 border-t border-slate-200 flex justify-between items-center text-[11px] text-slate-500">
                            <div>Authorized by: <span className="font-bold text-slate-800">{currentAuthority.name}</span></div>
                            <div>StreetSense AI Infrastructure GIS System v3.4</div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex-1 p-6 overflow-y-auto bg-slate-950 flex flex-col items-center">
                    <div className="w-full max-w-5xl space-y-6">
                        <div className="flex justify-between items-center">
                            <div>
                                <h2 className="text-lg font-black text-white">City-Wide Priority Accident Matrix</h2>
                                <p className="text-xs text-slate-400">Aggregated incident records across all monitored Hyderabad junctions</p>
                            </div>
                            <button
                                onClick={() => setActiveView('dashboard')}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow transition-all"
                            >
                                Back to Map View
                            </button>
                        </div>
                        <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-900 shadow-xl">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                                        <th className="p-4">Junction Name</th>
                                        <th className="p-4">Conflict Score</th>
                                        <th className="p-4">Incident ID</th>
                                        <th className="p-4">Date & Time</th>
                                        <th className="p-4">Type</th>
                                        <th className="p-4">Severity</th>
                                        <th className="p-4">Vehicle</th>
                                        <th className="p-4">Casualties</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800 text-slate-200">
                                    {sortedAccidents.map((acc, idx) => (
                                        <tr key={`${acc.id}-${idx}`} className="hover:bg-slate-800/50">
                                            <td className="p-4 font-bold text-indigo-300">{acc.junctionName}</td>
                                            <td className="p-4 font-mono font-bold text-red-400">{acc.conflictScore}</td>
                                            <td className="p-4 font-mono text-slate-400">{acc.id}</td>
                                            <td className="p-4">{acc.date} {acc.time}</td>
                                            <td className="p-4 font-medium">{acc.type}</td>
                                            <td className="p-4">
                                                <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${acc.severity === 'Fatal' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
                                                    {acc.severity}
                                                </span>
                                            </td>
                                            <td className="p-4">{acc.vehicle}</td>
                                            <td className="p-4 font-mono font-bold">{acc.casualties}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}