import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
    Plus, Search, Folder, Clock, MoreVertical, LogOut, Code2,
    LayoutDashboard, Settings, User, Users, Zap, Trash2, X, ChevronRight, Hash
} from 'lucide-react';
import axiosInstance from '../api/axiosInstance';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

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
    const navigate = useNavigate();

    const handleJoinRoom = (e) => {
        e.preventDefault();
        if (joinRoomId.trim()) {
            navigate(`/room/${joinRoomId.trim()}`);
        }
    };

    useEffect(() => {
        if (user) {
            fetchRooms();
        }
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
        try {
            const res = await axiosInstance.post('/api/room/create', {
                name: newRoomName,
                userId: userId
            });
            navigate(`/room/${res.data.roomId}`);
        } catch (err) {
            console.error("Error creating room", err.response?.data || err.message);
        }
    };

    const handleDeleteRoom = async (e, roomId) => {
        e.stopPropagation();
        setOpenMenuId(null);
        try {
            await axiosInstance.delete(`/api/room/${roomId}`);
            setRooms(prev => prev.filter(r => r.roomId !== roomId));
        } catch (err) {
            console.error("Error deleting room", err);
        }
    };

    const filteredRooms = rooms.filter(room =>
        room.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now - date;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        if (days === 0) return 'Today';
        if (days === 1) return 'Yesterday';
        if (days < 7) return `${days} days ago`;
        return date.toLocaleDateString();
    };

    return (
        <div className="flex h-screen bg-background">
            {/* Sidebar */}
            <aside className="w-64 border-r border-zinc-800 flex flex-col p-5 shrink-0">
                <div className="flex items-center gap-2.5 mb-8">
                    <div className="p-2 bg-primary rounded-lg shadow-lg shadow-primary/20">
                        <Code2 size={18} className="text-white" />
                    </div>
                    <span className="font-bold text-lg tracking-tight">CodeSync</span>
                </div>

                <nav className="flex-1 space-y-1">
                    <SidebarLink icon={<LayoutDashboard size={18} />} label="Dashboard" active />
                    <SidebarLink icon={<Folder size={18} />} label="Projects" />
                    <SidebarLink icon={<Clock size={18} />} label="Recent" />
                    <SidebarLink icon={<Users size={18} />} label="Collaborators" />
                    <SidebarLink icon={<Settings size={18} />} label="Settings" />
                </nav>

                {/* User Profile */}
                <div className="border-t border-zinc-800 pt-4 mt-4">
                    <div className="flex items-center gap-3 mb-3">
                        <img
                            src={user?.photoURL || `https://ui-avatars.com/api/?name=${user?.name}&background=3b82f6&color=fff`}
                            alt="Avatar"
                            className="w-8 h-8 rounded-full border border-zinc-700"
                        />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">{user?.name}</p>
                            <p className="text-xs text-zinc-500 truncate">{user?.email}</p>
                        </div>
                    </div>
                    <button
                        onClick={logout}
                        className="w-full flex items-center gap-2.5 text-zinc-500 hover:text-white transition-colors p-2 rounded-lg hover:bg-zinc-800/50 text-sm"
                    >
                        <LogOut size={16} />
                        <span>Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto bg-zinc-950/50 flex flex-col">
                {/* Header */}
                <header className="p-6 flex items-center justify-between border-b border-zinc-900 bg-background/50 backdrop-blur-sm sticky top-0 z-10 shrink-0">
                    <div>
                        <h1 className="text-2xl font-bold">
                            Welcome back, <span className="text-primary">{user?.name?.split(' ')[0]}</span>!
                        </h1>
                        <p className="text-zinc-500 text-sm mt-0.5">
                            {rooms.length > 0 ? `You have ${rooms.length} active project${rooms.length !== 1 ? 's' : ''}.` : 'Start by creating your first room.'}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                            <input
                                type="text"
                                placeholder="Search projects..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-4 py-2 text-sm focus:ring-1 focus:ring-primary outline-none w-56 transition-all"
                            />
                        </div>
                    </div>
                </header>

                <div className="p-6 max-w-7xl mx-auto w-full flex-1">
                    {/* Stats Row */}
                    <div className="grid grid-cols-3 gap-4 mb-8">
                        <StatCard label="Total Rooms" value={rooms.length} icon={<Folder size={18} className="text-primary" />} color="primary" />
                        <StatCard label="Active Today" value={rooms.filter(r => formatDate(r.updatedAt || r.createdAt) === 'Today').length} icon={<Zap size={18} className="text-yellow-400" />} color="yellow" />
                        <StatCard label="Collaborators" value="—" icon={<Users size={18} className="text-green-400" />} color="green" />
                    </div>

                    {/* Rooms Section */}
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="text-lg font-semibold">Your Projects</h2>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setIsJoinModalOpen(true)}
                                className="btn-secondary px-4 py-2 text-sm"
                            >
                                <Hash size={15} />
                                Join Room
                            </button>
                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="btn-primary px-4 py-2 text-sm"
                            >
                                <Plus size={15} />
                                New Room
                            </button>
                        </div>
                    </div>

                    {/* Rooms Grid */}
                    {isLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-44 rounded-xl bg-zinc-900/50 border border-zinc-800/50 animate-pulse" />
                            ))}
                        </div>
                    ) : filteredRooms.length === 0 ? (
                        <EmptyState
                            hasRooms={rooms.length > 0}
                            onCreateRoom={() => setIsCreateModalOpen(true)}
                        />
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            <AnimatePresence>
                                {filteredRooms.map((room, idx) => (
                                    <motion.div
                                        key={room.roomId}
                                        initial={{ opacity: 0, y: 16 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ delay: idx * 0.05 }}
                                        whileHover={{ y: -3 }}
                                        onClick={() => navigate(`/room/${room.roomId}`)}
                                        className="p-5 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800/80 hover:border-zinc-700 transition-all cursor-pointer group relative"
                                    >
                                        {/* Menu Button */}
                                        <div className="absolute top-4 right-4 z-10">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setOpenMenuId(openMenuId === room.roomId ? null : room.roomId);
                                                }}
                                                className="p-1.5 text-zinc-600 hover:text-white hover:bg-zinc-700 rounded-md transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                <MoreVertical size={16} />
                                            </button>
                                            <AnimatePresence>
                                                {openMenuId === room.roomId && (
                                                    <motion.div
                                                        initial={{ opacity: 0, scale: 0.95, y: -5 }}
                                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                                        exit={{ opacity: 0, scale: 0.95, y: -5 }}
                                                        className="absolute right-0 top-full mt-1 w-40 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden z-50 py-1"
                                                    >
                                                        <button
                                                            onClick={(e) => handleDeleteRoom(e, room.roomId)}
                                                            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                                                        >
                                                            <Trash2 size={14} />
                                                            Delete Room
                                                        </button>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>

                                        {/* Room Icon */}
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="p-2.5 bg-zinc-800 rounded-lg group-hover:bg-primary/20 transition-colors border border-zinc-700 group-hover:border-primary/30">
                                                <Code2 size={20} className="text-zinc-400 group-hover:text-primary transition-colors" />
                                            </div>
                                        </div>

                                        <h3 className="font-bold text-base mb-1 group-hover:text-white transition-colors">{room.name}</h3>

                                        <div className="flex items-center gap-1.5 text-zinc-500 text-xs mb-4">
                                            <Clock size={12} />
                                            <span>{formatDate(room.updatedAt || room.createdAt)}</span>
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <div className="flex flex-wrap gap-1.5">
                                                <span className="px-2 py-0.5 bg-zinc-800 rounded-full text-xs text-zinc-400 border border-zinc-700/50">Owner</span>
                                                <span className="flex items-center gap-1 px-2 py-0.5 bg-zinc-800 rounded-full text-xs text-zinc-400 border border-zinc-700/50">
                                                    <span
                                                        className="w-1.5 h-1.5 rounded-full"
                                                        style={{ backgroundColor: LANG_COLORS[room.language] || '#71717a' }}
                                                    />
                                                    {room.language || 'JavaScript'}
                                                </span>
                                            </div>
                                            <ChevronRight size={16} className="text-zinc-600 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </main>

            {/* Click-away for menu */}
            {openMenuId && (
                <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />
            )}

            {/* Create Room Modal */}
            <AnimatePresence>
                {isCreateModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.92, y: 16 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.92, y: 16 }}
                            className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-xl font-bold">Create New Room</h2>
                                    <p className="text-zinc-500 text-sm mt-1">Name your project and start coding.</p>
                                </div>
                                <button onClick={() => setIsCreateModalOpen(false)} className="p-2 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-500 hover:text-white">
                                    <X size={18} />
                                </button>
                            </div>

                            <form onSubmit={handleCreateRoom} className="space-y-5">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-zinc-400">Room Name</label>
                                    <input
                                        type="text"
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-primary outline-none transition-all"
                                        placeholder="e.g. My Awesome Project"
                                        value={newRoomName}
                                        onChange={(e) => setNewRoomName(e.target.value)}
                                        autoFocus
                                        required
                                    />
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsCreateModalOpen(false)}
                                        className="flex-1 btn-secondary justify-center py-2.5 text-sm"
                                    >
                                        Cancel
                                    </button>
                                    <button type="submit" className="flex-1 btn-primary justify-center py-2.5 text-sm">
                                        Create Room
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Join Room Modal */}
            <AnimatePresence>
                {isJoinModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.92, y: 16 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.92, y: 16 }}
                            className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-xl font-bold">Join a Room</h2>
                                    <p className="text-zinc-500 text-sm mt-1">Enter a Room ID to start collaborating.</p>
                                </div>
                                <button onClick={() => setIsJoinModalOpen(false)} className="p-2 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-500 hover:text-white">
                                    <X size={18} />
                                </button>
                            </div>

                            <form onSubmit={handleJoinRoom} className="space-y-5">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-zinc-400">Room ID</label>
                                    <input
                                        type="text"
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-primary outline-none font-mono transition-all"
                                        placeholder="Enter Room ID..."
                                        value={joinRoomId}
                                        onChange={(e) => setJoinRoomId(e.target.value)}
                                        autoFocus
                                        required
                                    />
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsJoinModalOpen(false)}
                                        className="flex-1 btn-secondary justify-center py-2.5 text-sm"
                                    >
                                        Cancel
                                    </button>
                                    <button type="submit" className="flex-1 btn-primary justify-center py-2.5 text-sm">
                                        Join Room
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

const StatCard = ({ label, value, icon, color }) => {
    const colorMap = {
        primary: 'bg-primary/10 border-primary/20',
        yellow: 'bg-yellow-400/10 border-yellow-400/20',
        green: 'bg-green-400/10 border-green-400/20',
    };
    return (
        <div className={`p-4 rounded-xl border ${colorMap[color]} flex items-center gap-4`}>
            <div className="p-2.5 bg-zinc-900 rounded-lg">{icon}</div>
            <div>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs text-zinc-500">{label}</p>
            </div>
        </div>
    );
};

const EmptyState = ({ hasRooms, onCreateRoom }) => (
    <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-24 text-center"
    >
        <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl mb-5">
            <Code2 size={40} className="text-zinc-600" />
        </div>
        <h3 className="text-lg font-semibold mb-2">
            {hasRooms ? 'No matching rooms' : 'No rooms yet'}
        </h3>
        <p className="text-zinc-500 text-sm max-w-xs mb-6">
            {hasRooms
                ? 'Try a different search term.'
                : 'Create your first room to start collaborating with your team in real-time.'}
        </p>
        {!hasRooms && (
            <button onClick={onCreateRoom} className="btn-primary px-6 py-2.5 text-sm">
                <Plus size={16} />
                Create your first room
            </button>
        )}
    </motion.div>
);

const SidebarLink = ({ icon, label, active }) => (
    <button className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-zinc-500 hover:text-white hover:bg-zinc-800/60'}`}>
        {icon}
        {label}
    </button>
);

export default Dashboard;
