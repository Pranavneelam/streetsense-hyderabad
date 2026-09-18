import React, { useState } from 'react';

export default function Login({ onLoginSuccess }) {
    const [badgeId, setBadgeId] = useState('GHMC-UP-GIS');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = (e) => {
        e.preventDefault();
        setIsLoading(true);
        setTimeout(() => {
            setIsLoading(false);
            onLoginSuccess();
        }, 1000);
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-6 font-sans text-slate-900">
            {/* Top Branding Header */}
            <div className="mb-8 text-center space-y-2">
                <div className="flex justify-center items-center gap-3 mb-3">
                    <img src="/ghmc.png" alt="GHMC" className="w-10 h-10 object-contain drop-shadow" />
                    <img src="/tspolice.png" alt="Police" className="w-10 h-10 object-contain drop-shadow" />
                    <img src="/tsrtc.png" alt="TSRTC" className="w-10 h-10 object-contain drop-shadow" />
                </div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900">StreetSense Hyderabad</h1>
                <p className="text-xs font-semibold text-indigo-600 uppercase tracking-widest">Cyberabad Official Agency Portal</p>
            </div>

            {/* Login Card */}
            <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-3xl shadow-xl shadow-slate-200/50 p-8 space-y-6">
                <div className="space-y-1">
                    <h2 className="text-lg font-bold text-slate-900">Authorized Personnel Sign-In</h2>
                    <p className="text-xs text-slate-500">Enter your official departmental badge ID and security PIN to access the GIS analytics dashboard.</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Department Badge ID</label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                <i className="fa-solid fa-id-card text-xs"></i>
                            </span>
                            <input
                                type="text"
                                required
                                value={badgeId}
                                onChange={(e) => setBadgeId(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 transition-all"
                                placeholder="e.g. GHMC-UP-GIS"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Security PIN / Password</label>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                <i className="fa-solid fa-lock text-xs"></i>
                            </span>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 transition-all"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <i className="fa-solid fa-spinner animate-spin"></i> Authenticating...
                            </>
                        ) : (
                            <>
                                <i className="fa-solid fa-right-to-bracket"></i> Secure Agency Access
                            </>
                        )}
                    </button>
                </form>

                <div className="pt-4 border-t border-slate-100 text-center">
                    <p className="text-[11px] text-slate-400">Restricted access for authorized personnel of GHMC, Hyderabad Traffic Police & TSRTC only.</p>
                </div>
            </div>

            {/* Footer */}
            <div className="mt-8 text-center text-[11px] text-slate-400 font-mono">
                Cyberabad Urban Traffic Intelligence Infrastructure &bull; Secure SSL Session
            </div>
        </div>
    );
}