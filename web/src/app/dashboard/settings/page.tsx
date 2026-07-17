'use client';

import React, { useEffect, useState } from 'react';

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [nvidiaKey, setNvidiaKey] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        setUser({ email: 'developer@nexus.ai', name: 'Nexus Developer' });
      }
    }
    // Set a placeholder or retrieve local config
    const key = localStorage.getItem('NVIDIA_API_KEY') || '••••••••••••••••••••••••••••••••';
    setNvidiaKey(key);
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (nvidiaKey !== '••••••••••••••••••••••••••••••••') {
      localStorage.setItem('NVIDIA_API_KEY', nvidiaKey);
    }
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  if (!user) return null;

  return (
    <div className="flex flex-col gap-6 w-full relative z-10">
      {/* Header */}
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold text-white tracking-tight">Account Settings</h1>
        <p className="text-on-surface-variant">Manage your AI credentials, project preferences, and personal details.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left pane: Profile & credentials form */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <form onSubmit={handleSave} className="glass-panel rounded-xl p-6 flex flex-col gap-4">
            <h3 className="font-bold text-white text-base flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-primary text-base">manage_accounts</span>
              Personal Profile
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-on-surface-variant font-mono-code">Full Name</label>
                <input
                  type="text"
                  disabled
                  value={user.name || ''}
                  className="w-full bg-surface-container-lowest/50 border border-outline-glass rounded-lg py-2.5 px-4 text-on-surface-variant cursor-not-allowed opacity-70 text-sm h-11"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-on-surface-variant font-mono-code">Email Address</label>
                <input
                  type="email"
                  disabled
                  value={user.email || ''}
                  className="w-full bg-surface-container-lowest/50 border border-outline-glass rounded-lg py-2.5 px-4 text-on-surface-variant cursor-not-allowed opacity-70 text-sm h-11"
                />
              </div>
            </div>

            <div className="h-px bg-outline-glass my-2" />

            {saveSuccess && (
              <div className="bg-success/10 border border-success/30 text-success text-xs rounded-lg px-4 py-3 flex items-center gap-2 transition-all">
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                Settings updated successfully.
              </div>
            )}

            <div className="flex justify-end mt-2">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-lg bg-primary-container text-white text-xs font-semibold tracking-widest uppercase shadow-[0_0_15px_rgba(124,58,237,0.3)] hover:shadow-[0_0_25px_rgba(124,58,237,0.5)] transition-all active:scale-95 flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">save</span>
                Save Preferences
              </button>
            </div>
          </form>
        </div>

        {/* Right pane: Quick stats card */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="glass-panel rounded-xl p-4 flex flex-col gap-2.5">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[18px]">verified_user</span>
              Active Session Details
            </h3>
            <div className="flex flex-col gap-2 text-xs">
              <div className="flex justify-between border-b border-outline-glass/30 pb-2">
                <span className="text-on-surface-variant">OAuth Method</span>
                <span className="text-white font-mono-code font-bold">{user.email?.includes('@gmail.com') ? 'Google OAuth' : 'Email/Password'}</span>
              </div>
              <div className="flex justify-between border-b border-outline-glass/30 pb-2">
                <span className="text-on-surface-variant">JWT Token</span>
                <span className="text-success font-semibold">Active</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Node Environment</span>
                <span className="text-white font-mono-code">production</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
