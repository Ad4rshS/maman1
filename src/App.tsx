import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Home, Trophy, Users, User, Plus, ChevronLeft, LayoutGrid, Zap, Wallet, Settings, LogOut, Shield } from 'lucide-react';
import { AppProvider, useApp } from './context/AppContext';
import { Match, Player, PlayerPosition, UserTeam } from './types';
import { cn } from './lib/utils';
import { cleanupOldMatches } from './services/cleanupService';

// Components
import MatchList from './components/MatchList';
import MatchDetails from './components/MatchDetails';
import CreateTeam from './components/CreateTeam';
import CreateContest from './components/CreateContest';
import AdminPanel from './components/AdminPanel';

function AppContent() {
  const { user, loading, userTeams, matches, logout, signIn } = useApp();
  const [activeTab, setActiveTab] = useState('home');
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);
  const [isCreatingContest, setIsCreatingContest] = useState(false);
  const [editingTeam, setEditingTeam] = useState<UserTeam | null>(null);
  const [showSplash, setShowSplash] = useState(true);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [showAdminAuth, setShowAdminAuth] = useState(false);
  const [adminPass, setAdminPass] = useState('');
  const [authError, setAuthError] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  // Trigger match cleanup every time the app loads for the admin user
  useEffect(() => {
    if (user?.email === 'avengers1535@gmail.com') {
      cleanupOldMatches();
    }
  }, [user]);

  if (loading || showSplash) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-dark-bg relative overflow-hidden">
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ repeat: Infinity, duration: 4 }}
          className="absolute w-96 h-96 dream11-gradient blur-[100px] rounded-full opacity-30 -top-20 -left-20" 
        />
        <motion.div 
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.4, 0.2] }}
          transition={{ repeat: Infinity, duration: 5 }}
          className="absolute w-96 h-96 bg-blue-600 blur-[100px] rounded-full opacity-20 -bottom-20 -right-20" 
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="z-10 flex flex-col items-center gap-8"
        >
          <div className="relative group">
            <motion.div 
              animate={{ 
                boxShadow: ["0 0 20px rgba(255, 77, 77, 0.2)", "0 0 40px rgba(255, 77, 77, 0.4)", "0 0 20px rgba(255, 77, 77, 0.2)"] 
              }}
              transition={{ repeat: Infinity, duration: 3 }}
              className="w-64 h-64 rounded-full flex items-center justify-center relative z-10 overflow-hidden"
            >
              <img src="/logo.png" alt="Mamangam Logo" className="w-full h-full object-contain" />
            </motion.div>
            
            {/* Animated Glow Rings */}
            <motion.div 
              animate={{ rotate: 360, scale: [1, 1.1, 1] }}
              transition={{ 
                rotate: { repeat: Infinity, duration: 10, ease: "linear" },
                scale: { repeat: Infinity, duration: 4, ease: "easeInOut" }
              }}
              className="absolute inset-[-20px] border border-brand-red/20 rounded-full blur-sm" 
            />
            <motion.div 
              animate={{ rotate: -360, scale: [1.1, 1, 1.1] }}
              transition={{ 
                rotate: { repeat: Infinity, duration: 15, ease: "linear" },
                scale: { repeat: Infinity, duration: 5, ease: "easeInOut" }
              }}
              className="absolute inset-[-40px] border border-white/5 rounded-full blur-[2px]" 
            />
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="absolute bottom-12 flex flex-col items-center gap-4"
        >
           <div className="flex items-center gap-2">
             <div className="w-1.5 h-1.5 rounded-full bg-brand-red animate-bounce" />
             <div className="w-1.5 h-1.5 rounded-full bg-brand-red animate-bounce [animation-delay:0.2s]" />
             <div className="w-1.5 h-1.5 rounded-full bg-brand-red animate-bounce [animation-delay:0.4s]" />
           </div>
           <motion.span 
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="text-[10px] text-gray-600 font-bold uppercase tracking-widest"
            >
              Setting the Field...
            </motion.span>
        </motion.div>
      </div>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'home':
        return <MatchList onMatchSelect={setSelectedMatch} />;
      case 'teams':
        return (
          <div className="p-4 space-y-4">
             <h2 className="text-sm font-bold text-gray-400 uppercase mb-4 tracking-widest">My Teams ({userTeams.length})</h2>
             {userTeams.length === 0 ? (
               <div className="bg-dark-card p-12 rounded-2xl border border-dark-border text-center flex flex-col items-center gap-4 mt-10">
                  <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center text-gray-700">
                    <LayoutGrid className="w-10 h-10" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-white">No teams yet</p>
                    <p className="text-xs text-gray-500 max-w-[200px]">Create your first team and join a league to win bragging rights!</p>
                  </div>
                  <button onClick={() => setActiveTab('home')} className="mt-2 bg-white/10 hover:bg-white/20 px-6 py-2 rounded-full text-xs font-bold uppercase transition-colors">Find Matches</button>
               </div>
             ) : (
               <div className="space-y-3">
                 {userTeams.map(team => {
                   const match = matches.find(m => m.id === team.matchId);
                   return (
                     <div key={team.id} className="bg-dark-card border border-dark-border rounded-xl p-4 flex items-center justify-between shadow-lg">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                             <h3 className="font-bold text-sm">{team.name}</h3>
                          </div>
                          <p className="text-[10px] text-gray-400 font-medium">{match?.team1} vs {match?.team2} • {match?.series}</p>
                        </div>
                        <div className="flex items-center gap-3">
                           <div className="flex -space-x-2">
                              {team.players.slice(0, 3).map((pId) => (
                                <div key={pId} className="w-7 h-7 rounded-full bg-dark-bg border-2 border-dark-card flex items-center justify-center overflow-hidden">
                                  <User className="w-4 h-4 text-gray-600" />
                                </div>
                              ))}
                           </div>
                           <button className="text-brand-red p-1"><ChevronLeft className="w-5 h-5 rotate-180" /></button>
                        </div>
                     </div>
                   );
                 })}
               </div>
             )}
          </div>
        );
      case 'profile':
        return (
          <div className="p-6 pb-24 space-y-6">
             <div className="flex flex-col items-center gap-4">
                <div className="w-24 h-24 rounded-full border-4 border-white/5 p-1 relative">
                   <div className="w-full h-full rounded-full dream11-gradient flex items-center justify-center shadow-xl overflow-hidden">
                      {user?.photoURL ? (
                        <img src={user.photoURL} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <User className="w-12 h-12 text-white" />
                      )}
                   </div>
                   <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-green-500 border-4 border-dark-bg flex items-center justify-center">
                     <Zap className="w-4 h-4 text-white fill-current" />
                   </div>
                </div>
                <div className="text-center">
                   <h2 className="text-xl font-display font-bold italic tracking-tight">{user ? user.name : 'Welcome to MamanGam'}</h2>
                   <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1">
                     {user ? (user.email === 'avengers1535@gmail.com' ? 'System Administrator' : 'Kerala Festival Mode • Lev 14') : 'Sign in to sync your teams'}
                   </p>
                </div>
             </div>

             {!user && (
               <button 
                 onClick={signIn}
                 className="w-full bg-brand-red p-4 rounded-2xl flex items-center justify-center gap-3 font-display font-bold italic tracking-tight shadow-xl shadow-brand-red/20 active:scale-95 transition-all"
               >
                 <Zap className="w-5 h-5 fill-current" />
                 SIGN IN WITH GOOGLE
               </button>
             )}

             <div className="grid grid-cols-2 gap-4">
                <div className="bg-dark-card p-4 rounded-2xl border border-dark-border shadow-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-brand-red fill-current">
                      <path d="M17,21 L14,21 L14,14 L10,14 L10,21 L7,21 L7,11 L12,11 L13,6 L15,6 L15,11 L17,11 L17,21 Z M12,2 C13.1,2 14,2.9 14,4 C14,5.1 13.1,6 12,6 C10.9,6 10,5.1 10,4 C10,2.9 10.9,2 12,2 Z" />
                    </svg>
                    <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Global Rank</span>
                  </div>
                  <p className="text-xl font-display font-bold italic">#42,910</p>
                </div>
                <div className="bg-dark-card p-4 rounded-2xl border border-dark-border shadow-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Wallet className="w-3.5 h-3.5 text-green-500" />
                    <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Balance</span>
                  </div>
                  <p className="text-xl font-display font-bold italic">₹{user?.balance || 0}.00 <span className="text-[9px] text-green-500 block text-right">ALWAYS FREE</span></p>
                </div>
             </div>

             <div className="space-y-2 mt-4">
                <ProfileItem 
                  icon={
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                      <path d="M17,21 L14,21 L14,14 L10,14 L10,21 L7,21 L7,11 L12,11 L13,6 L15,6 L15,11 L17,11 L17,21 Z M12,2 C13.1,2 14,2.9 14,4 C14,5.1 13.1,6 12,6 C10.9,6 10,5.1 10,4 C10,2.9 10.9,2 12,2 Z" />
                    </svg>
                  } 
                  label="My Rewards" 
                />
                <ProfileItem icon={<Users />} label="Refer Friends" />
                <ProfileItem icon={<Zap />} label="Points System" />
                <ProfileItem icon={<Settings />} label="Settings" />
                {user && (
                  <ProfileItem 
                    icon={<LogOut />} 
                    label="Log Out" 
                    className="text-brand-red border-brand-red/20 mt-4" 
                    onClick={logout}
                  />
                )}
             </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto relative bg-dark-bg overflow-hidden shadow-2xl">
      {/* Header */}
      {!selectedMatch && !isCreatingTeam && (
        <header className="p-4 flex items-center justify-between border-b border-dark-border bg-dark-bg/80 backdrop-blur-md sticky top-0 z-50">
          <div className="flex items-center gap-2">
            <div 
              className="w-12 h-12 flex items-center justify-center relative group cursor-pointer active:scale-95 transition-transform"
              onClick={() => setShowAdminAuth(true)}
            >
              <img src="/logo.png" alt="Mamangam Logo" className="w-full h-full object-contain" />
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                className="absolute inset-[-2px] border border-brand-red/30 rounded-full"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white/5 px-3 py-1 rounded-full text-xs font-medium border border-white/10 flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              IPL 2026
            </div>
            <button 
              onClick={() => setActiveTab('profile')} 
              className={cn(
                "w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden transition-all active:scale-90",
                activeTab === 'profile' ? "border-brand-red bg-brand-red/10" : ""
              )}
            >
               <User className={cn("w-5 h-5", activeTab === 'profile' ? "text-brand-red" : "text-gray-400")} />
            </button>
          </div>
        </header>
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pb-24 relative">
        <AnimatePresence mode="wait">
          {showAdminAuth && (
            <motion.div 
              key="admin-auth"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[300] bg-dark-bg/95 backdrop-blur-xl flex items-center justify-center p-6"
            >
              <div className="w-full max-w-xs space-y-4 text-center">
                <div className="w-16 h-16 dream11-gradient rounded-2xl flex items-center justify-center mx-auto rotate-12 shadow-xl mb-6">
                  <Shield className="w-8 h-8 text-white fill-current" />
                </div>
                <h3 className="text-xl font-display font-bold italic tracking-tight">ADMIN ACCESS</h3>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Enter the festival access code</p>
                
                {(!user || user.email !== 'avengers1535@gmail.com') && (
                  <div className="bg-brand-red/10 border border-brand-red/20 p-4 rounded-xl text-left space-y-2 mb-2">
                    <p className="text-[9px] font-black text-brand-red uppercase tracking-widest">Firebase Auth Required</p>
                    <p className="text-[10px] text-gray-400 leading-relaxed font-bold italic">
                      You must be signed in as <span className="text-white">avengers1535@gmail.com</span> to perform database writes.
                    </p>
                    {!user && (
                      <button 
                        onClick={signIn}
                        className="w-full bg-brand-red py-2 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] shadow-lg shadow-brand-red/20"
                      >
                        Sign in now
                      </button>
                    )}
                  </div>
                )}

                <input 
                  type="password" 
                  autoFocus
                  placeholder="Code..."
                  value={adminPass}
                  onChange={(e) => {
                    setAdminPass(e.target.value);
                    setAuthError(false);
                  }}
                  className={cn(
                    "w-full bg-white/5 border rounded-xl p-4 text-center text-white focus:outline-none transition-all",
                    authError ? "border-brand-red animate-shake" : "border-white/10 focus:border-brand-red"
                  )}
                />
                {authError && <p className="text-brand-red text-[10px] font-bold uppercase animate-pulse">Invalid Code</p>}
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      setShowAdminAuth(false);
                      setAdminPass('');
                      setAuthError(false);
                    }}
                    className="flex-1 bg-white/5 p-3 rounded-xl text-xs font-bold uppercase tracking-widest"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => {
                      if (adminPass === 'qwe') {
                        setIsAdminMode(true);
                        setShowAdminAuth(false);
                        setAdminPass('');
                        setAuthError(false);
                      } else {
                        setAuthError(true);
                        setAdminPass('');
                      }
                    }}
                    className="flex-1 bg-brand-red p-3 rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-brand-red/20"
                  >
                    Enter
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {isAdminMode ? (
            <motion.div
              key="admin-panel"
              initial={{ opacity: 0, x: -100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              className="h-full absolute inset-0 z-[200] bg-dark-bg"
            >
              <AdminPanel onBack={() => setIsAdminMode(false)} />
            </motion.div>
          ) : !selectedMatch && !isCreatingTeam ? (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="h-full"
            >
              {renderTabContent()}
            </motion.div>
          ) : selectedMatch && !isCreatingTeam && !isCreatingContest ? (
            <motion.div
              key="match-details"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="h-full"
            >
              <MatchDetails 
                match={selectedMatch} 
                onBack={() => setSelectedMatch(null)} 
                onCreateTeam={() => {
                  setEditingTeam(null);
                  setIsCreatingTeam(true);
                }}
                onCreateContest={() => setIsCreatingContest(true)}
                onEditTeam={(team) => {
                  setEditingTeam(team);
                  setIsCreatingTeam(true);
                }}
              />
            </motion.div>
          ) : selectedMatch && isCreatingTeam ? (
            <motion.div
              key="create-team"
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="h-full absolute inset-0 z-[100] bg-dark-bg"
            >
              <CreateTeam 
                match={selectedMatch} 
                onClose={() => {
                  setIsCreatingTeam(false);
                  setEditingTeam(null);
                }} 
                editTeam={editingTeam || undefined}
              />
            </motion.div>
          ) : selectedMatch && isCreatingContest ? (
            <motion.div
              key="create-contest"
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="h-full absolute inset-0 z-[100] bg-dark-bg"
            >
              <CreateContest 
                match={selectedMatch} 
                onClose={() => setIsCreatingContest(false)} 
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </main>

      {/* Bottom Nav */}
      {!selectedMatch && !isCreatingTeam && (
        <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-dark-card border-t border-dark-border px-8 py-3 flex justify-between items-center z-50">
          <NavButton active={activeTab === 'home'} icon={<Home />} label="Home" onClick={() => setActiveTab('home')} />
          <NavButton active={activeTab === 'teams'} icon={<LayoutGrid />} label="Teams" onClick={() => setActiveTab('teams')} />
          <NavButton 
            active={activeTab === 'leagues'} 
            icon={
              <svg viewBox="0 0 24 24" className="fill-current">
                <path d="M17,21 L14,21 L14,14 L10,14 L10,21 L7,21 L7,11 L12,11 L13,6 L15,6 L15,11 L17,11 L17,21 Z M12,2 C13.1,2 14,2.9 14,4 C14,5.1 13.1,6 12,6 C10.9,6 10,5.1 10,4 C10,2.9 10.9,2 12,2 Z" />
              </svg>
            } 
            label="Wins" 
            onClick={() => setActiveTab('leagues')} 
          />
          <NavButton active={activeTab === 'profile'} icon={<User />} label="Me" onClick={() => setActiveTab('profile')} />
        </nav>
      )}
    </div>
  );
}

function ProfileItem({ icon, label, className, onClick }: { icon: React.ReactNode, label: string, className?: string, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn("w-full bg-white/5 border border-white/5 p-4 rounded-xl flex items-center justify-between hover:bg-white/10 transition-all", className)}
    >
      <div className="flex items-center gap-3">
        <div className="text-gray-400">{icon}</div>
        <span className="text-[13px] font-bold">{label}</span>
      </div>
      <ChevronLeft className="w-4 h-4 text-gray-700 rotate-180" />
    </button>
  );
}

function NavButton({ active, icon, label, onClick }: { active: boolean, icon: React.ReactNode, label: string, onClick: () => void }) {
  return (
    <button onClick={onClick} className={cn("flex flex-col items-center gap-1 transition-all", active ? "text-brand-red scale-110" : "text-gray-500")}>
      {React.cloneElement(icon as React.ReactElement, { className: "w-6 h-6" })}
      <span className="text-[10px] font-bold tracking-widest uppercase">{label}</span>
    </button>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
