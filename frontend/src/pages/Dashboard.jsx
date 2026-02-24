import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
    Plus, Search, Folder, Clock, MoreVertical, LogOut, Code2,
    LayoutDashboard, Settings, User, Users, Zap, Trash2, X, ChevronRight, Hash, Loader2,
    ArrowUpDown, Mail, Shield, Calendar, ExternalLink, Activity, LogIn
} from 'lucide-react';
import axiosInstance from '../api/axiosInstance';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';

const LANG_COLORS = {
    javascript: '#f7df1e',
    python: '#3776ab',
    cpp: '#00599c',
    java: '#e76f00',
    html: '#e34c26',
    css: '#563d7c',
};

const Dashboard = () => {
    const { user, logout } = useAuth();
    const [rooms, setRooms] = useState([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
    const [newRoomName, setNewRoomName] = useState('');
    const [joinRoomId, setJoinRoomId] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [openMenuId, setOpenMenuId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isJoining, setIsJoining] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [currentView, setCurrentView] = useState('Dashboard');
    const [sortBy, setSortBy] = useState('newest');
    const navigate = useNavigate();

    const handleJoinRoom = async (e) => {
        e.preventDefault();
        let roomId = joinRoomId.trim();

        if (roomId.includes('/room/')) {
            try {
                const parts = roomId.split('/room/');
                roomId = parts[1].split(/[/?#]/)[0];
            } catch (err) {
                console.error("Link parsing error:", err);
            }
        }

        if (!roomId) {
            toast.error("Please enter a valid Room ID or link.");
            return;
        }

        setIsJoining(true);
        try {
            const userId = user.id || user._id || user.uid;
            await axiosInstance.post('/api/room/join', { roomId, userId });
            toast.success("Joined room successfully!");
            setIsJoinModalOpen(false);
            setJoinRoomId('');
            navigate(`/room/${roomId}`);
        } catch (err) {
            const message = err.response?.data?.message || "Room not found or invalid code.";
            toast.error(message);
        } finally {
            setIsJoining(false);
        }
    };

    useEffect(() => {
        if (user) fetchRooms();
    }, [user]);

    const fetchRooms = async () => {
        setIsLoading(true);
        try {
            const userId = user.id || user._id || user.uid;
            if (!userId) return;
            const res = await axiosInstance.get(`/api/room/user/${userId}`);
            setRooms(res.data);
        } catch (err) {
            console.error("Error fetching rooms", err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateRoom = async (e) => {
        e.preventDefault();
        const userId = user._id || user.id || user.uid;
        if (!newRoomName.trim()) return;
        setIsCreating(true);
        try {
            const res = await axiosInstance.post('/api/room/create', {
                name: newRoomName.trim(),
                userId,
            });
            toast.success("Room created!");
            setIsCreateModalOpen(false);
            setNewRoomName('');
            navigate(`/room/${res.data.roomId}`);
        } catch (err) {
            toast.error("Failed to create room.");
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeleteRoom = async (e, roomId) => {
        e.stopPropagation();
        setOpenMenuId(null);
        if (!window.confirm("Are you sure you want to delete this room?")) return;
        try {
            await axiosInstance.delete(`/api/room/${roomId}`);
            setRooms(prev => prev.filter(r => r.roomId !== roomId));
            toast.success("Room deleted");
        } catch (err) {
            toast.error("Failed to delete room");
        }
    };

    const handleCollabRoleChange = async (roomId, targetUserId, newRole) => {
        try {
            await axiosInstance.put(`/api/room/${roomId}/collab-role`, {
                userId: targetUserId,
                role: newRole,
            });
            toast.success(`Role updated to ${newRole}`);
            fetchRooms();
        } catch (err) {
            toast.error("Failed to update role");
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const getSortedRooms = (roomList) => {
        const list = [...roomList];
        if (sortBy === 'alphabetical') return list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        if (sortBy === 'oldest') return list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        return list.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
    };

    const displayRooms = rooms.filter(r => r.name?.toLowerCase().includes(searchQuery.toLowerCase()));
    const sortedRoomsList = getSortedRooms(displayRooms);

    const recentRooms = rooms.filter(r => {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 7);
        return new Date(r.updatedAt || r.createdAt) > cutoff;
    }).slice(0, 6);

    const uniqueCollaborators = Array.from(new Map(
        rooms.flatMap(r => (r.collaborators || []).map(c => {
            const u = c.user;
            if (!u || u._id === (user.id || user._id || user.uid)) return null;
            return [u._id || u.id, { ...u, role: c.role, roomName: r.name, roomId: r.roomId, lastActiveAt: r.updatedAt || r.createdAt }];
        })).filter(Boolean)
    ).values());

    return (
        <div className="flex h-screen bg-zinc-950 text-white overflow-hidden">
            {/* Sidebar */}
            <aside className="w-56 border-r border-zinc-900 bg-zinc-950/60 backdrop-blur-xl flex flex-col px-4 py-5 shrink-0 z-20">
                <div className="flex items-center gap-2.5 mb-8 px-1">
                    <div className="p-1.5 bg-primary rounded-lg shadow-lg shadow-primary/20">
                        <Code2 size={16} className="text-white" />
                    </div>
                    <span className="font-bold text-base tracking-tight">CodeSync</span>
                </div>

                <nav className="flex-1 space-y-0.5">
                    <SidebarLink icon={<LayoutDashboard size={15} />} label="Dashboard" active={currentView === 'Dashboard'} onClick={() => setCurrentView('Dashboard')} />
                    <SidebarLink icon={<Folder size={15} />} label="Projects" active={currentView === 'Projects'} onClick={() => setCurrentView('Projects')} />
                    <SidebarLink icon={<Clock size={15} />} label="Recent" active={currentView === 'Recent'} onClick={() => setCurrentView('Recent')} />
                    <SidebarLink icon={<Users size={15} />} label="Collaborators" active={currentView === 'Collaborators'} onClick={() => setCurrentView('Collaborators')} />
                    <div className="py-3"><div className="h-px bg-zinc-900" /></div>
                    <SidebarLink icon={<Settings size={15} />} label="Settings" active={currentView === 'Settings'} onClick={() => setCurrentView('Settings')} />
                </nav>

                <div className="mt-auto space-y-2">
                    <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/60">
                        <div className="flex items-center gap-2.5">
                            <img
                                src={user?.photoURL || `https://ui-avatars.com/api/?name=${user?.name}&background=3b82f6&color=fff`}
                                alt=""
                                className="w-8 h-8 rounded-lg object-cover ring-1 ring-zinc-700"
                            />
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold truncate">{user?.name}</p>
                                <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Admin</p>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={logout}
                        className="w-full flex items-center gap-2.5 text-zinc-500 hover:text-red-400 px-3 py-2 rounded-lg hover:bg-red-500/5 text-xs font-medium transition-all"
                    >
                        <LogOut size={14} />
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col relative overflow-hidden">
                <div className="absolute top-[-10%] left-[20%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
                <div className="absolute bottom-[-10%] right-[10%] w-[30%] h-[30%] bg-blue-600/5 rounded-full blur-[100px] pointer-events-none" />

                {/* Header */}
                <header className="h-16 shrink-0 flex items-center justify-between px-8 border-b border-zinc-900 z-10 sticky top-0 bg-zinc-950/30 backdrop-blur-md">
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">{currentView}</h1>
                        <p className="text-zinc-600 text-[10px] font-medium uppercase tracking-widest">Workspace Manager</p>
                    </div>

                    <div className="flex items-center gap-2.5">
                        {/* Search */}
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-zinc-400 transition-colors" size={13} />
                            <input
                                type="text"
                                placeholder="Search rooms..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="bg-zinc-900/60 border border-zinc-800 rounded-lg pl-9 pr-4 py-2 text-xs focus:ring-1 focus:ring-primary/30 focus:border-zinc-700 outline-none w-56 transition-all"
                            />
                        </div>

                        <div className="h-6 w-px bg-zinc-800" />

                        {/* Join Room Button */}
                        <button
                            onClick={() => setIsJoinModalOpen(true)}
                            className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white px-3.5 py-2 rounded-lg transition-all font-medium text-xs border border-zinc-700/50"
                        >
                            <LogIn size={13} />
                            <span>Join Room</span>
                        </button>

                        {/* Create Room Button */}
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-white px-3.5 py-2 rounded-lg shadow-lg shadow-primary/20 transition-all font-medium text-xs active:scale-95"
                        >
                            <Plus size={13} />
                            <span>Create Room</span>
                        </button>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto px-8 py-8 custom-scrollbar">
                    <AnimatePresence mode="wait">
                        {isLoading ? (
                            <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col items-center justify-center gap-3">
                                <Activity className="animate-pulse text-primary" size={32} />
                                <p className="text-zinc-600 font-medium text-xs uppercase tracking-widest">Loading workspace...</p>
                            </motion.div>
                        ) : (
                            <motion.div key={currentView} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto w-full">
                                {currentView === 'Dashboard' && <DashboardView rooms={rooms} recentRooms={recentRooms} uniqueCollaborators={uniqueCollaborators} formatDate={formatDate} navigate={navigate} onJoin={() => setIsJoinModalOpen(true)} onCreate={() => setIsCreateModalOpen(true)} />}
                                {currentView === 'Projects' && <ProjectsView rooms={sortedRoomsList} sortBy={sortBy} setSortBy={setSortBy} formatDate={formatDate} navigate={navigate} handleDeleteRoom={handleDeleteRoom} openMenuId={openMenuId} setOpenMenuId={setOpenMenuId} />}
                                {currentView === 'Recent' && <RecentView rooms={recentRooms} formatDate={formatDate} navigate={navigate} />}
                                {currentView === 'Collaborators' && <CollaboratorsView collaborators={uniqueCollaborators} formatDate={formatDate} onRoleChange={handleCollabRoleChange} />}
                                {currentView === 'Settings' && <SettingsView user={user} roomsCount={rooms.length} colabsCount={uniqueCollaborators.length} />}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </main>

            {/* Modals */}
            <AnimatePresence>
                {isCreateModalOpen && <CreateRoomModal isCreating={isCreating} onCreate={handleCreateRoom} onClose={() => { setIsCreateModalOpen(false); setNewRoomName(''); }} newRoomName={newRoomName} setNewRoomName={setNewRoomName} />}
                {isJoinModalOpen && <JoinRoomModal isJoining={isJoining} onJoin={handleJoinRoom} onClose={() => { setIsJoinModalOpen(false); setJoinRoomId(''); }} joinRoomId={joinRoomId} setJoinRoomId={setJoinRoomId} />}
            </AnimatePresence>
        </div>
    );
};

// --- Views ---

const DashboardView = ({ rooms, recentRooms, uniqueCollaborators, formatDate, navigate, onJoin, onCreate }) => (
    <div className="space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard label="Total Rooms" value={rooms.length} icon={<Folder size={18} className="text-blue-400" />} />
            <StatCard label="Active Teammates" value={uniqueCollaborators.length} icon={<Users size={18} className="text-emerald-400" />} />
            <StatCard label="Active This Week" value={recentRooms.length} icon={<Zap size={18} className="text-orange-400" />} />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
                onClick={onCreate}
                className="flex items-center gap-4 p-5 bg-primary/10 border border-primary/20 rounded-2xl hover:bg-primary/20 hover:border-primary/40 transition-all group text-left"
            >
                <div className="p-2.5 bg-primary/20 rounded-xl group-hover:bg-primary/30 transition-colors">
                    <Plus size={18} className="text-primary" />
                </div>
                <div>
                    <p className="text-sm font-semibold text-white">Create a Room</p>
                    <p className="text-xs text-zinc-500 mt-0.5">Start a new collaborative coding session</p>
                </div>
                <ChevronRight size={16} className="ml-auto text-zinc-700 group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </button>

            <button
                onClick={onJoin}
                className="flex items-center gap-4 p-5 bg-zinc-900/60 border border-zinc-800 rounded-2xl hover:bg-zinc-800/60 hover:border-zinc-700 transition-all group text-left"
            >
                <div className="p-2.5 bg-zinc-800 rounded-xl group-hover:bg-zinc-700 transition-colors">
                    <LogIn size={18} className="text-zinc-300" />
                </div>
                <div>
                    <p className="text-sm font-semibold text-white">Join a Room</p>
                    <p className="text-xs text-zinc-500 mt-0.5">Enter a Room ID or invite link to join</p>
                </div>
                <ChevronRight size={16} className="ml-auto text-zinc-700 group-hover:text-zinc-400 group-hover:translate-x-1 transition-all" />
            </button>
        </div>

        {/* Recent Activity */}
        <section>
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold tracking-tight">Recent Activity</h2>
                <span className="text-zinc-600 text-xs">{recentRooms.length} this week</span>
            </div>
            {recentRooms.length === 0 ? (
                <div className="p-12 border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/10 flex flex-col items-center gap-3">
                    <Zap size={28} className="text-zinc-800" />
                    <p className="text-zinc-600 text-sm">No recent activity. Create or join a room to get started.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {recentRooms.slice(0, 4).map(room => (
                        <RoomCardLarge key={room.roomId} room={room} formatDate={formatDate} onClick={() => navigate(`/room/${room.roomId}`)} />
                    ))}
                </div>
            )}
        </section>
    </div>
);

const ProjectsView = ({ rooms, sortBy, setSortBy, formatDate, navigate, handleDeleteRoom, openMenuId, setOpenMenuId }) => (
    <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900/30 p-5 rounded-2xl border border-zinc-900">
            <div>
                <h2 className="text-base font-semibold">All Projects</h2>
                <p className="text-zinc-500 text-xs mt-0.5">{rooms.length} rooms found</p>
            </div>
            <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2">
                <ArrowUpDown size={12} className="text-zinc-600" />
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="bg-transparent text-xs outline-none cursor-pointer text-zinc-300 font-medium">
                    <option value="newest" className="bg-zinc-900">Recently Updated</option>
                    <option value="alphabetical" className="bg-zinc-900">Alphabetical (A–Z)</option>
                    <option value="oldest" className="bg-zinc-900">Oldest First</option>
                </select>
            </div>
        </div>

        {rooms.length === 0 ? (
            <div className="py-20 text-center">
                <Folder size={40} className="mx-auto text-zinc-800 mb-3" />
                <p className="text-zinc-600 text-sm">No projects found</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {rooms.map(room => (
                    <RoomCard
                        key={room.roomId}
                        room={room}
                        formatDate={formatDate}
                        onClick={() => navigate(`/room/${room.roomId}`)}
                        onDelete={(e) => handleDeleteRoom(e, room.roomId)}
                        isMenuOpen={openMenuId === room.roomId}
                        toggleMenu={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === room.roomId ? null : room.roomId); }}
                    />
                ))}
            </div>
        )}
    </div>
);

const RecentView = ({ rooms, formatDate, navigate }) => (
    <div className="space-y-6">
        <div className="bg-gradient-to-r from-zinc-900 to-transparent p-6 rounded-2xl border border-zinc-900">
            <h2 className="text-base font-semibold mb-1">Recently Accessed</h2>
            <p className="text-zinc-500 text-xs">Continue work on rooms from the last 7 days.</p>
        </div>

        {rooms.length === 0 ? (
            <div className="py-20 text-center border border-dashed border-zinc-800 rounded-2xl">
                <Clock size={40} className="mx-auto text-zinc-800 mb-3" />
                <p className="text-zinc-600 text-sm">No recent activity</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {rooms.map(room => (
                    <RoomCardLarge key={room.roomId} room={room} formatDate={formatDate} onClick={() => navigate(`/room/${room.roomId}`)} />
                ))}
            </div>
        )}
    </div>
);

const CollaboratorsView = ({ collaborators, formatDate, onRoleChange }) => (
    <div className="space-y-6">
        <div className="mb-4">
            <h2 className="text-base font-semibold mb-1">Collaborators</h2>
            <p className="text-zinc-500 text-xs">Manage permissions and view team members.</p>
        </div>

        {collaborators.length === 0 ? (
            <div className="py-20 text-center bg-zinc-900/20 border border-dashed border-zinc-800 rounded-2xl">
                <Users size={40} className="mx-auto text-zinc-800 mb-3" />
                <p className="text-zinc-600 text-sm">Invite people to your rooms to see them here.</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {collaborators.map(collab => {
                    const isViewer = (collab.role || 'editor') === 'viewer';
                    return (
                        <div key={collab._id || collab.id} className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl hover:border-zinc-700 transition-all">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="relative shrink-0">
                                    <img src={collab.photoURL || `https://ui-avatars.com/api/?name=${collab.name}&background=random&color=fff`} className="w-10 h-10 rounded-xl object-cover" alt="" />
                                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-zinc-900 rounded-full" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-sm text-white truncate">{collab.name}</h3>
                                    <p className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5 truncate">
                                        <Mail size={10} className="shrink-0" /> {collab.email}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => onRoleChange(collab.roomId, collab._id || collab.id, 'editor')}
                                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-all ${!isViewer ? 'bg-primary text-white' : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'}`}
                                    >
                                        <Shield size={9} /> Editor
                                    </button>
                                    <button
                                        onClick={() => onRoleChange(collab.roomId, collab._id || collab.id, 'viewer')}
                                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-all ${isViewer ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'}`}
                                    >
                                        <User size={9} /> Viewer
                                    </button>
                                </div>
                                <span className="text-[10px] text-zinc-600">in <span className="text-zinc-400">"{collab.roomName}"</span></span>
                            </div>
                        </div>
                    );
                })}
            </div>
        )}
    </div>
);

const SettingsView = ({ user, roomsCount, colabsCount }) => (
    <div className="max-w-2xl">
        <div className="mb-6">
            <h2 className="text-base font-semibold mb-1">Account Settings</h2>
            <p className="text-zinc-500 text-xs">Manage your profile and application preferences.</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-6 bg-gradient-to-br from-zinc-800/30 to-transparent border-b border-zinc-800">
                <div className="flex items-center gap-5">
                    <img src={user?.photoURL || `https://ui-avatars.com/api/?name=${user?.name}&background=3b82f6&color=fff`} className="w-16 h-16 rounded-2xl border-2 border-zinc-700 object-cover shadow-xl" alt="" />
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                            <h3 className="text-base font-bold truncate">{user?.name}</h3>
                            <span className="px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded-full text-[10px] font-semibold uppercase tracking-wider">Admin</span>
                        </div>
                        <p className="text-zinc-400 text-sm flex items-center gap-2">
                            <Mail size={13} className="text-zinc-600" /> {user?.email}
                        </p>
                        <div className="flex gap-6 mt-3">
                            <div>
                                <p className="text-lg font-bold">{roomsCount}</p>
                                <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Rooms</p>
                            </div>
                            <div>
                                <p className="text-lg font-bold">{colabsCount}</p>
                                <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Teammates</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl">
                        <div className="flex items-center gap-2.5 mb-2 font-semibold text-sm">
                            <Shield size={15} className="text-blue-400" /> Security Status
                        </div>
                        <p className="text-xs text-zinc-500">Encrypted via Firebase Auth. MFA disabled.</p>
                    </div>
                    <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl">
                        <div className="flex items-center gap-2.5 mb-2 font-semibold text-sm">
                            <Activity size={15} className="text-emerald-400" /> Platform Usage
                        </div>
                        <p className="text-xs text-zinc-500">Standard Cloud Plan. 5GB/month sync.</p>
                    </div>
                </div>
                <button className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-xl transition-all border border-zinc-700/50 text-sm">
                    Update Profile Details
                </button>
            </div>
        </div>
    </div>
);

// --- Components ---

const SidebarLink = ({ icon, label, active, onClick }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${active ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
    >
        {icon}
        {label}
    </button>
);

const StatCard = ({ label, value, icon }) => (
    <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center gap-4 hover:border-zinc-700 transition-all">
        <div className="p-2.5 bg-zinc-950 rounded-xl border border-zinc-800">
            {icon}
        </div>
        <div>
            <p className="text-2xl font-bold leading-none mb-0.5">{value}</p>
            <p className="text-[10px] text-zinc-600 uppercase tracking-widest">{label}</p>
        </div>
    </div>
);

const RoomCard = ({ room, formatDate, onClick, onDelete, isMenuOpen, toggleMenu }) => (
    <div onClick={onClick} className="p-5 rounded-2xl border border-zinc-800/60 bg-zinc-900/40 hover:bg-zinc-900/70 hover:border-zinc-700 transition-all cursor-pointer group relative overflow-hidden active:scale-[0.98]">
        <div className="absolute top-3 right-3 z-10">
            <button onClick={toggleMenu} className="p-1.5 text-zinc-700 hover:text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-zinc-800">
                <MoreVertical size={14} />
            </button>
            {isMenuOpen && (
                <div className="absolute right-0 top-8 w-40 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-50 overflow-hidden py-1.5 backdrop-blur-xl">
                    <button onClick={onDelete} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-red-400 hover:bg-red-500/10 font-medium transition-colors">
                        <Trash2 size={13} /> Delete Project
                    </button>
                </div>
            )}
        </div>

        <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl w-fit mb-4 group-hover:border-primary/30 transition-all">
            <Code2 size={20} className="text-zinc-600 group-hover:text-primary transition-colors" />
        </div>

        <h3 className="font-semibold text-sm mb-1 truncate">{room.name}</h3>
        <p className="text-[10px] text-zinc-600 flex items-center gap-1.5 mb-4">
            <Clock size={10} /> {formatDate(room.updatedAt)}
        </p>

        <div className="flex items-center justify-between pt-3 border-t border-zinc-800/50">
            <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: LANG_COLORS[room.language] || '#444' }} />
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider">{room.language || 'Code'}</span>
            </div>
            <ChevronRight size={14} className="text-zinc-700 group-hover:translate-x-1 group-hover:text-primary transition-all" />
        </div>
    </div>
);

const RoomCardLarge = ({ room, formatDate, onClick }) => (
    <div onClick={onClick} className="p-4 rounded-2xl border border-zinc-800/60 bg-zinc-900/40 hover:bg-zinc-900/70 hover:border-zinc-700 transition-all cursor-pointer group flex items-center gap-4 active:scale-[0.99]">
        <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl group-hover:border-primary/30 transition-all shrink-0">
            <Code2 size={22} className="text-zinc-700 group-hover:text-primary transition-colors" />
        </div>
        <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold truncate group-hover:text-white transition-colors">{room.name}</h3>
            <div className="flex items-center gap-3 mt-1 text-[10px] text-zinc-600">
                <span className="flex items-center gap-1"><Clock size={10} /> {formatDate(room.updatedAt)}</span>
                <span className="w-1 h-1 bg-zinc-700 rounded-full" />
                <span className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: LANG_COLORS[room.language] || '#444' }} />
                    {room.language}
                </span>
            </div>
        </div>
        <ChevronRight size={16} className="text-zinc-800 group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
    </div>
);

const CreateRoomModal = ({ isCreating, onCreate, onClose, newRoomName, setNewRoomName }) => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
        <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-7 shadow-2xl"
        >
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-xl border border-primary/20">
                        <Plus size={18} className="text-primary" />
                    </div>
                    <div>
                        <h2 className="text-base font-bold">Create Room</h2>
                        <p className="text-zinc-500 text-xs mt-0.5">Start a new workspace</p>
                    </div>
                </div>
                <button onClick={onClose} className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-white transition-colors">
                    <X size={16} />
                </button>
            </div>

            <form onSubmit={onCreate} className="space-y-5">
                <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Room Name</label>
                    <input
                        type="text"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all text-white placeholder:text-zinc-700"
                        placeholder="e.g. My Project"
                        value={newRoomName}
                        onChange={(e) => setNewRoomName(e.target.value)}
                        required
                        autoFocus
                    />
                </div>
                <div className="flex gap-2.5 pt-1">
                    <button type="button" onClick={onClose} className="flex-1 py-2.5 text-zinc-500 hover:text-white text-xs font-medium transition-all rounded-xl hover:bg-zinc-800">
                        Cancel
                    </button>
                    <button
                        disabled={isCreating}
                        className="flex-1 py-2.5 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 text-sm flex items-center justify-center gap-2"
                    >
                        {isCreating ? <><Loader2 size={13} className="animate-spin" /> Creating...</> : 'Create Room'}
                    </button>
                </div>
            </form>
        </motion.div>
    </div>
);

const JoinRoomModal = ({ isJoining, onJoin, onClose, joinRoomId, setJoinRoomId }) => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
        <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-7 shadow-2xl"
        >
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-zinc-800 rounded-xl border border-zinc-700">
                        <LogIn size={18} className="text-zinc-300" />
                    </div>
                    <div>
                        <h2 className="text-base font-bold">Join Room</h2>
                        <p className="text-zinc-500 text-xs mt-0.5">Enter a Room ID or invite link</p>
                    </div>
                </div>
                <button onClick={onClose} className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-white transition-colors">
                    <X size={16} />
                </button>
            </div>

            <form onSubmit={onJoin} className="space-y-5">
                <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Room ID / Invite Link</label>
                    <input
                        type="text"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm font-mono focus:border-zinc-600 focus:ring-2 focus:ring-white/5 outline-none transition-all text-white placeholder:text-zinc-700"
                        placeholder="Paste Room ID or link..."
                        value={joinRoomId}
                        onChange={(e) => setJoinRoomId(e.target.value)}
                        required
                        autoFocus
                    />
                    <p className="text-[10px] text-zinc-600 pl-1">
                        Accepts a direct Room ID or a full invite URL like <span className="text-zinc-500 font-mono">/room/abc123</span>
                    </p>
                </div>
                <div className="flex gap-2.5 pt-1">
                    <button type="button" onClick={onClose} className="flex-1 py-2.5 text-zinc-500 hover:text-white text-xs font-medium transition-all rounded-xl hover:bg-zinc-800">
                        Cancel
                    </button>
                    <button
                        disabled={isJoining}
                        className="flex-1 py-2.5 bg-white text-zinc-950 rounded-xl font-semibold hover:bg-zinc-200 transition-all shadow-lg disabled:opacity-50 text-sm flex items-center justify-center gap-2"
                    >
                        {isJoining ? <><Loader2 size={13} className="animate-spin" /> Joining...</> : 'Join Room'}
                    </button>
                </div>
            </form>
        </motion.div>
    </div>
);

export default Dashboard;
