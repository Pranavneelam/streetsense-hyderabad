import React, { useState, useEffect } from 'react';

export default function TimeTracker() {
  const [logs, setLogs] = useState(() => {
    const saved = localStorage.getItem('time_tracker_logs');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [timerTaskName, setTimerTaskName] = useState('');
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  const [manualTaskName, setManualTaskName] = useState('');
  const [manualHours, setManualHours] = useState(0);
  const [manualMinutes, setManualMinutes] = useState(30);

  // Live Timer Effect
  useEffect(() => {
    let interval = null;
    if (isRunning) {
      interval = setInterval(() => {
        setSecondsElapsed(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  // Persist logs
  useEffect(() => {
    localStorage.setItem('time_tracker_logs', JSON.stringify(logs));
  }, [logs]);

  const formatTime = (totalSeconds) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSaveTimer = () => {
    if (secondsElapsed === 0) {
      alert('Timer has not run long enough to save.');
      return;
    }
    const totalMinutes = Math.max(1, Math.round(secondsElapsed / 60));
    const newEntry = {
      id: Date.now(),
      name: timerTaskName.trim() || 'Untitled Live Task',
      type: 'Timer',
      minutes: totalMinutes,
      timestamp: new Date().toLocaleString()
    };
    setLogs([newEntry, ...logs]);
    setSecondsElapsed(0);
    setIsRunning(false);
    setTimerTaskName('');
  };

  const handleSaveManual = () => {
    const hours = parseInt(manualHours) || 0;
    const minutes = parseInt(manualMinutes) || 0;
    const totalMinutes = (hours * 60) + minutes;

    if (totalMinutes <= 0) {
      alert('Please enter a valid duration greater than 0 minutes.');
      return;
    }

    const newEntry = {
      id: Date.now(),
      name: manualTaskName.trim() || 'Untitled Manual Task',
      type: 'Manual Override',
      minutes: totalMinutes,
      timestamp: new Date().toLocaleString()
    };
    setLogs([newEntry, ...logs]);
    setManualTaskName('');
    setManualHours(0);
    setManualMinutes(30);
  };

  const deleteEntry = (id) => {
    setLogs(logs.filter(item => item.id !== id));
  };

  const clearLogs = () => {
    if (confirm('Are you sure you want to clear all report entries?')) {
      setLogs([]);
    }
  };

  const grandTotalMinutes = logs.reduce((acc, curr) => acc + curr.minutes, 0);
  const totalHrs = Math.floor(grandTotalMinutes / 60);
  const totalMins = grandTotalMinutes % 60;

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6 bg-slate-50 min-h-screen text-slate-800 font-sans">
      {/* Header */}
      <header className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">⏱️ Precision Time Tracker</h1>
          <p className="text-sm text-slate-500">Track tasks via live timer or manual entry with unified reporting.</p>
        </div>
        <div className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-xl font-semibold text-sm border border-indigo-100">
          Total Logged: {totalHrs > 0 ? `${totalHrs}h ` : ''}{totalMins}m
        </div>
      </header>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Live Timer */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2"><span>▶️</span> Live Timer</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Task Name</label>
                <input 
                  type="text" 
                  value={timerTaskName} 
                  onChange={(e) => setTimerTaskName(e.target.value)} 
                  placeholder="e.g., Frontend Development" 
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>
              <div className="text-center py-6 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-4xl font-mono font-bold text-slate-700">{formatTime(secondsElapsed)}</span>
                <div className="text-xs text-slate-400 mt-1">Hours : Minutes : Seconds</div>
              </div>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button 
              onClick={() => setIsRunning(!isRunning)} 
              className={`flex-1 font-medium py-2.5 px-4 rounded-xl transition text-sm shadow-sm text-white ${isRunning ? 'bg-amber-600 hover:bg-amber-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
            >
              {isRunning ? 'Pause Timer' : 'Start Timer'}
            </button>
            <button onClick={handleSaveTimer} className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 px-4 rounded-xl transition text-sm shadow-sm">
              Save Log
            </button>
          </div>
        </div>

        {/* Manual Entry */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2"><span>✍️</span> Manual Time Entry</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Task Name</label>
                <input 
                  type="text" 
                  value={manualTaskName} 
                  onChange={(e) => setManualTaskName(e.target.value)} 
                  placeholder="e.g., Client Meeting" 
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Hours</label>
                  <input 
                    type="number" 
                    min="0" 
                    value={manualHours} 
                    onChange={(e) => setManualHours(e.target.value)} 
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Minutes (Exact)</label>
                  <input 
                    type="number" 
                    min="0" 
                    max="59" 
                    value={manualMinutes} 
                    onChange={(e) => setManualMinutes(e.target.value)} 
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="mt-6">
            <button onClick={handleSaveManual} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-2.5 px-4 rounded-xl transition text-sm shadow-sm">
              Add Manual Time
            </button>
          </div>
        </div>
      </div>

      {/* Reports Section */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-slate-900">📊 Activity Report</h2>
          {logs.length > 0 && (
            <button onClick={clearLogs} className="text-xs text-rose-600 hover:text-rose-700 font-medium">Clear All</button>
          )}
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-medium text-xs uppercase tracking-wider">
                <th className="py-3 px-4">Task Name</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">Logged At</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((item) => {
                const hrs = Math.floor(item.minutes / 60);
                const mins = item.minutes % 60;
                const badgeColor = item.type === 'Timer' 
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-100' 
                  : 'bg-amber-50 text-amber-700 border-amber-100';

                return (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3 px-4 font-medium text-slate-900">{item.name}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium border ${badgeColor}`}>
                        {item.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-mono">
                      {hrs > 0 ? `${hrs} hr ` : ''}{mins} min
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-xs">{item.timestamp}</td>
                    <td className="py-3 px-4 text-right">
                      <button onClick={() => deleteEntry(item.id)} className="text-slate-400 hover:text-rose-600 transition p-1">
                        🗑️
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {logs.length === 0 && (
            <div className="text-center py-8 text-slate-400 text-sm">
              No time entries recorded yet. Use the live timer or manual entry above!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}