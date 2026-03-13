import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, Users, Key, Trash2, Loader2, UserPlus, UserMinus, Eye, EyeOff } from 'lucide-react';
import axiosInstance from '../api/axiosInstance';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const RoomSettingsModal = ({ isOpen, onClose, roomId, roomDetails, setRoomDetails, socketRef }) => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('collaborators'); // 'collaborators', 'security', 'danger'
    const [inviteEmail, setInviteEmail] = useState('');
    const [isInviting, setIsInviting] = useState(false);
    
    // Password states
    const [password, setPassword] = useState('');
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    
    useEffect(() => {
        if (roomDetails?.password && !roomDetails.password.startsWith('$2')) {
            setPassword(roomDetails.password);
        } else {
            setPassword('');
        }
    }, [roomDetails?.password]);
    
    const [isDeleting, setIsDeleting] = useState(false);

    if (!isOpen) return null;

    const handleInvite = async (e) => {
        e.preventDefault();
        if (!inviteEmail.trim()) return;
        
        setIsInviting(true);
        try {
            const res = await axiosInstance.post(`/api/room/${roomId}/collaborators`, { email: inviteEmail, role: 'editor' });
            setRoomDetails(res.data);
            toast.success("Collaborator added successfully");
            setInviteEmail('');
            // Optional: emit socket event if needed to update others immediately
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to invite user");
        } finally {
            setIsInviting(false);
        }
    };

    const handleRemoveCollaborator = async (userId) => {
        if (!window.confirm("Are you sure you want to remove this collaborator?")) return;
        
        try {
            const res = await axiosInstance.delete(`/api/room/${roomId}/collaborators/${userId}`);
            setRoomDetails(res.data);
            toast.success("Collaborator removed");
            // Notify via socket to kick them out
            if (socketRef.current) {
                socketRef.current.emit('collaborator-removed', { roomId, userId });
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to remove collaborator");
        }
    };

    const handleRoleChange = async (userId, newRole) => {
        try {
            const res = await axiosInstance.put(`/api/room/${roomId}/collab-role`, {
                userId,
                role: newRole,
            });
            setRoomDetails(res.data.room);
            toast.success(`Role updated to ${newRole}`);
            
            if (socketRef.current) {
                socketRef.current.emit('role-update', { roomId, userId, role: newRole });
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to update role");
        }
    };

    const handleUpdatePassword = async (action) => {
        if (action === 'set' && !password.trim()) {
            toast.error("Password cannot be empty");
            return;
        }

        setIsUpdatingPassword(true);
        try {
            await axiosInstance.put(`/api/room/${roomId}/password`, { 
                password: action === 'set' ? password : null, 
                action 
            });
            toast.success(action === 'set' ? "Password updated" : "Password removed");
            setPassword('');
            // update local roomDetails to reflect that it has a password
            setRoomDetails(prev => ({ 
                ...prev, 
                password: action === 'set' ? password : null,
                hasPassword: action === 'set' 
            }));
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to update password");
        } finally {
            setIsUpdatingPassword(false);
        }
    };

    const handleDeleteRoom = async () => {
        if (!window.confirm("Are you absolutely sure you want to delete this room? This action cannot be undone.")) return;
        
        setIsDeleting(true);
        try {
            await axiosInstance.delete(`/api/room/${roomId}`);
            toast.success("Room deleted");
            navigate('/dashboard');
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to delete room");
            setIsDeleting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden flex flex-col md:flex-row shadow-2xl"
            >
                {/* Sidebar Navigation */}
                <div className="w-full md:w-48 bg-zinc-950 p-4 border-r border-zinc-800/80 shrink-0">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-bold tracking-tight">Settings</h2>
                        <button onClick={onClose} className="md:hidden p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-white">
                            <X size={16} />
                        </button>
                    </div>

                    <div className="flex flex-row md:flex-col gap-1 overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
                        <TabButton 
                            active={activeTab === 'collaborators'} 
                            onClick={() => setActiveTab('collaborators')} 
                            icon={<Users size={16} />} 
                            label="Collaborators" 
                        />
                        <TabButton 
                            active={activeTab === 'security'} 
                            onClick={() => setActiveTab('security')} 
                            icon={<Key size={16} />} 
                            label="Security" 
                        />
                        <TabButton 
                            active={activeTab === 'danger'} 
                            onClick={() => setActiveTab('danger')} 
                            icon={<Trash2 size={16} />} 
                            label="Danger Zone" 
                            isDanger
                        />
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 p-6 sm:p-8 min-h-[400px]">
                    <div className="flex items-center justify-between mb-6 hidden md:flex">
                        <h3 className="text-xl font-bold">
                            {activeTab === 'collaborators' && 'Manage Collaborators'}
                            {activeTab === 'security' && 'Room Security'}
                            {activeTab === 'danger' && 'Danger Zone'}
                        </h3>
                        <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-xl transition-colors text-zinc-500 hover:text-white">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Collaborators Tab */}
                    {activeTab === 'collaborators' && (
                        <div className="space-y-6">
                            <form onSubmit={handleInvite} className="flex gap-2">
                                <input
                                    type="email"
                                    placeholder="friend@example.com"
                                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-primary/50 text-white placeholder:text-zinc-600"
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                    required
                                />
                                <button
                                    type="submit"
                                    disabled={isInviting}
                                    className="px-4 bg-primary text-white rounded-xl font-bold text-sm hover:opacity-90 transition-all shadow-lg flex items-center gap-2 disabled:opacity-50"
                                >
                                    {isInviting ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                                    <span className="hidden sm:inline">Invite</span>
                                </button>
                            </form>

                            <div className="space-y-1">
                                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest px-1 mb-3">Members</h4>
                                <div className="space-y-2 max-h-[250px] overflow-y-auto custom-scrollbar pr-2">
                                    {roomDetails?.owner && (
                                        <div className="flex items-center justify-between p-3 bg-zinc-950/50 border border-zinc-800/50 rounded-xl">
                                            <div className="flex items-center gap-3">
                                                <img 
                                                    src={roomDetails.owner.photoURL || `https://ui-avatars.com/api/?name=${roomDetails.owner.name}&background=random&color=fff`}
                                                    className="w-8 h-8 rounded-full border border-zinc-800"
                                                    alt={roomDetails.owner.name}
                                                />
                                                <div>
                                                    <p className="text-sm font-medium">{roomDetails.owner.name}</p>
                                                    <p className="text-[10px] text-zinc-500">{roomDetails.owner.email}</p>
                                                </div>
                                            </div>
                                            <span className="text-[10px] uppercase font-bold text-primary bg-primary/10 px-2 py-1 rounded">Owner</span>
                                        </div>
                                    )}

                                    {roomDetails?.collaborators?.filter(c => c.user && c.user._id !== roomDetails.owner._id).map(collab => (
                                        <div key={collab.user._id} className="flex items-center justify-between p-3 bg-zinc-950/50 border border-zinc-800/50 rounded-xl group hover:border-zinc-700 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <img 
                                                    src={collab.user.photoURL || `https://ui-avatars.com/api/?name=${collab.user.name}&background=random&color=fff`}
                                                    className="w-8 h-8 rounded-full border border-zinc-800"
                                                    alt={collab.user.name}
                                                />
                                                <div>
                                                    <p className="text-sm font-medium">{collab.user.name}</p>
                                                    <p className="text-[10px] text-zinc-500">{collab.user.email}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <select 
                                                    value={collab.role}
                                                    onChange={(e) => handleRoleChange(collab.user._id, e.target.value)}
                                                    className="text-[10px] uppercase font-bold text-zinc-400 bg-zinc-800 outline-none border border-zinc-700 py-1 px-1.5 rounded cursor-pointer appearance-none text-center hover:bg-zinc-700 hover:text-white transition-colors"
                                                >
                                                    <option value="editor">EDITOR</option>
                                                    <option value="viewer">VIEWER</option>
                                                </select>
                                                <button 
                                                    onClick={() => handleRemoveCollaborator(collab.user._id)}
                                                    className="p-1.5 hover:bg-red-500/10 text-zinc-500 hover:text-red-500 rounded transition-colors opacity-0 group-hover:opacity-100"
                                                    title="Remove Collaborator"
                                                >
                                                    <UserMinus size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Security Tab */}
                    {activeTab === 'security' && (
                        <div className="space-y-6">
                            <div className="p-4 bg-zinc-950/50 border border-zinc-800 rounded-xl space-y-4">
                                <div>
                                    <h4 className="text-sm font-semibold text-white mb-1">Room Password</h4>
                                    <p className="text-xs text-zinc-500">
                                        {roomDetails?.password ? "This room currently has a password enabled. Only users with the password can join unless invited directly." : "This room is currently public to anyone with the ID. Set a password to restrict access."}
                                    </p>
                                </div>

                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            placeholder="New Password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2 pr-10 text-sm outline-none focus:border-primary text-white"
                                        />
                                        <button 
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                                        >
                                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                        <button
                                        onClick={() => handleUpdatePassword('set')}
                                        disabled={isUpdatingPassword || (!password && !roomDetails?.password)}
                                        className="px-4 bg-primary text-white rounded-xl font-medium text-sm hover:opacity-90 transition-all disabled:opacity-50"
                                    >
                                        {isUpdatingPassword ? <Loader2 size={16} className="animate-spin" /> : (roomDetails?.hasPassword ? 'Update' : 'Set')}
                                    </button>
                                </div>

                                {roomDetails?.password && (
                                    <button
                                        onClick={() => handleUpdatePassword('remove')}
                                        disabled={isUpdatingPassword}
                                        className="text-xs text-red-400 hover:text-red-300 transition-colors font-medium mt-2"
                                    >
                                        Remove current password (make public)
                                    </button>
                                )}
                            </div>
                            
                            <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-xl">
                                <Shield size={20} className="text-primary" />
                                <p className="text-xs text-zinc-400 leading-relaxed">
                                    Invited collaborators can always access the room bypassing the password requirement.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Danger Tab */}
                    {activeTab === 'danger' && (
                        <div className="space-y-6">
                            <div className="p-4 border border-red-500/20 bg-red-500/5 rounded-xl space-y-4">
                                <div>
                                    <h4 className="text-sm font-bold text-red-500 mb-1">Delete Room</h4>
                                    <p className="text-xs text-zinc-400 leading-relaxed">
                                        Once you delete a room, there is no going back. All files, code, and chat history will be permanently destroyed.
                                    </p>
                                </div>
                                <button
                                    onClick={handleDeleteRoom}
                                    disabled={isDeleting}
                                    className="w-full sm:w-auto px-6 py-2.5 bg-red-500 text-white rounded-xl font-bold text-sm hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                    Delete this room
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

const TabButton = ({ active, onClick, icon, label, isDanger }) => {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 px-3 py-2 w-full rounded-xl text-sm font-medium transition-all ${
                active 
                    ? (isDanger ? 'bg-red-500/10 text-red-500' : 'bg-primary/10 text-primary') 
                    : 'text-zinc-500 hover:text-white hover:bg-zinc-900/50'
            }`}
        >
            {icon}
            <span className="whitespace-nowrap">{label}</span>
        </button>
    );
};

export default RoomSettingsModal;
