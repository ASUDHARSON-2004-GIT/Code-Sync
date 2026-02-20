import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { io } from 'socket.io-client';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
    Code2, Users, Send, Share2,
    ArrowLeft, ChevronRight, MessageSquare,
    Play, Shield, User as UserIcon, X, Copy, Check, Terminal, Loader2, Trash2, ChevronDown, ChevronUp,
    File, Folder, FilePlus, FolderPlus, MoreVertical
} from 'lucide-react';
import { motion, AnimatePresence, useMotionValue } from 'framer-motion';

const EditorPage = () => {
    const { roomId } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const socketRef = useRef(null);
    const editorRef = useRef(null);

    const [code, setCode] = useState("// Loading...");
    const [collaborators, setCollaborators] = useState([]);
    const [messages, setMessages] = useState([]);
    const [messageInput, setMessageInput] = useState('');
    const [activeSidePanel, setActiveSidePanel] = useState('files'); // 'files', 'users', or null
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const [copiedId, setCopiedId] = useState(false);
    const [role, setRole] = useState('editor');
    const [language, setLanguage] = useState('javascript');
    const [isNotFound, setIsNotFound] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isMember, setIsMember] = useState(false);
    const [roomDetails, setRoomDetails] = useState(null);
    const [files, setFiles] = useState([]);
    const [activeFileId, setActiveFileId] = useState(null);
    const chatWidth = useMotionValue(320);
    const messagesEndRef = useRef(null);
    const isResizing = useRef(false);
    const chatPanelRef = useRef(null);

    const [output, setOutput] = useState("");
    const [isOutputVisible, setIsOutputVisible] = useState(false);
    const [isRunning, setIsRunning] = useState(false);
    const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);

    const LANGUAGES = [
        { value: 'javascript', label: 'JavaScript', ext: '.js', color: '#f7df1e' },
        { value: 'typescript', label: 'TypeScript', ext: '.ts', color: '#3178c6' },
        { value: 'python', label: 'Python', ext: '.py', color: '#3776ab' },
        { value: 'cpp', label: 'C++', ext: '.cpp', color: '#00599c' },
        { value: 'c', label: 'C', ext: '.c', color: '#555555' },
        { value: 'java', label: 'Java', ext: '.java', color: '#e76f00' },
        { value: 'csharp', label: 'C#', ext: '.cs', color: '#178600' },
        { value: 'html', label: 'HTML', ext: '.html', color: '#e34c26' },
        { value: 'css', label: 'CSS', ext: '.css', color: '#563d7c' },
        { value: 'json', label: 'JSON', ext: '.json', color: '#292929' },
        { value: 'markdown', label: 'Markdown', ext: '.md', color: '#000000' },
        { value: 'sql', label: 'SQL', ext: '.sql', color: '#e38c00' },
        { value: 'php', label: 'PHP', ext: '.php', color: '#4F5D95' },
        { value: 'ruby', label: 'Ruby', ext: '.rb', color: '#701516' },
        { value: 'go', label: 'Go', ext: '.go', color: '#00ADD8' },
        { value: 'rust', label: 'Rust', ext: '.rs', color: '#DEA584' },
    ];

    const currentLang = LANGUAGES.find(l => l.value === language) || LANGUAGES[0];

    const runCode = async () => {
        setIsRunning(true);
        setIsOutputVisible(true);
        setOutput("Running code...");

        try {
            console.log("Sending execution request:", { language, codeLength: code?.length });
            // Call backend directly to avoid any Vite proxy issues
            const response = await axios.post("http://localhost:5000/api/execute", {
                language,
                code
            });

            const result = response.data.run;
            console.log("Execution response received:", result);
            if (result.stderr) {
                setOutput(result.stderr);
            } else {
                setOutput(result.output || "Program executed successfully with no output.");
            }
        } catch (err) {
            console.error("Execution error full object:", err);
            if (err.response) {
                console.error("Server responded with error:", err.response.status, err.response.data);
            }
            const errorMsg = err.response?.data?.message || err.response?.data?.error || "Could not execute code. Please check your internet connection.";
            setOutput(`Error: ${errorMsg}`);
        } finally {
            setIsRunning(false);
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const handleManualJoin = async () => {
        try {
            setIsLoading(true);
            const userId = user._id || user.id || user.uid;
            await axios.post('/api/room/join', { roomId, userId });

            // Refresh details to get updated list
            const res = await axios.get(`/api/room/${roomId}`);
            setRoomDetails(res.data);
            setIsMember(true);
            setRole('editor');
        } catch (err) {
            console.error("Error joining:", err);
            alert("Failed to join room.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (!roomId || !user) return;

        const fetchRoomDetails = async () => {
            try {
                // Fetch room details first WITHOUT auto-joining
                const res = await axios.get(`/api/room/${roomId}`);
                setRoomDetails(res.data);
                const roomFiles = res.data.files || [];
                setFiles(roomFiles);

                const currentActiveId = res.data.activeFileId || (roomFiles.length > 0 ? roomFiles[0].id : null);
                setActiveFileId(currentActiveId);

                const activeF = roomFiles.find(f => f.id === currentActiveId);
                setCode(activeF?.content || "");
                setLanguage(activeF?.language || "javascript");

                const userId = user._id || user.id || user.uid;
                const isOwner = res.data.owner?._id === userId || res.data.owner === userId;
                const isCollab = res.data.collaborators?.some(c => {
                    const cId = c.user?._id || c.user?.id || c.user;
                    return cId === userId;
                });

                if (isOwner || isCollab) {
                    setIsMember(true);
                    if (isOwner) setRole('owner');
                    else {
                        const member = res.data.collaborators.find(c => (c.user?._id || c.user?.id || c.user) === userId);
                        setRole(member?.role || 'editor');
                    }
                } else {
                    setIsMember(false);
                }
                setIsNotFound(false);
            } catch (err) {
                console.error("Error fetching room details:", err.response?.data || err.message);
                if (err.response?.status === 404) setIsNotFound(true);
            } finally {
                setIsLoading(false);
            }
        };
        fetchRoomDetails();

        const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        socketRef.current = io(SOCKET_URL, {
            reconnection: true,
            reconnectionAttempts: 5
        });

        const joinRoom = () => {
            if (user) {
                socketRef.current.emit('join-room', {
                    roomId,
                    user: {
                        id: user.id || user._id || user.uid,
                        name: user.name || user.displayName || 'Anonymous',
                        photoURL: user.photoURL
                    }
                });
            }
        };

        socketRef.current.on('connect', joinRoom);

        socketRef.current.on('files-update', (updatedFiles) => {
            setFiles(updatedFiles);
        });

        socketRef.current.on('active-file-update', (fileId) => {
            setActiveFileId(fileId);
        });

        socketRef.current.on('file-created', (newFile) => {
            setFiles(prev => [...prev, newFile]);
        });

        socketRef.current.on('file-deleted', (fileId) => {
            setFiles(prev => prev.filter(f => f.id !== fileId));
        });

        socketRef.current.on('code-update', ({ fileId, code: newCode }) => {
            setFiles(prev => prev.map(f => f.id === fileId ? { ...f, content: newCode } : f));
            if (activeFileId === fileId) {
                setCode(newCode);
            }
        });

        socketRef.current.on('user-list', (users) => {
            setCollaborators(users);
        });

        socketRef.current.on('cursor-update', ({ id, cursor, user: remoteUser }) => {
            if (!editorRef.current) return;

            const hash = [...id].reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
            const color = `hsl(${Math.abs(hash) % 360}, 70%, 50%)`;

            if (!document.getElementById(`cursor-style-${id}`)) {
                const style = document.createElement('style');
                style.id = `cursor-style-${id}`;
                style.innerHTML = `.peer-cursor-${id} { background-color: ${color}; width: 2px !important; }`;
                document.head.appendChild(style);
            }

            const currentDecorations = editorRef.current.activeDecorations?.[id] || [];
            const newDecorations = editorRef.current.deltaDecorations(currentDecorations, [
                {
                    range: { startLineNumber: cursor.lineNumber, startColumn: cursor.column, endLineNumber: cursor.lineNumber, endColumn: cursor.column + 1 },
                    options: { className: `peer-cursor-${id}` }
                }
            ]);

            if (!editorRef.current.activeDecorations) editorRef.current.activeDecorations = {};
            editorRef.current.activeDecorations[id] = newDecorations;
        });

        socketRef.current.on('language-update', (newLang) => {
            setLanguage(newLang);
        });

        socketRef.current.on('new-message', (msg) => {
            setMessages((prev) => [...prev, msg]);
        });

        socketRef.current.on('chat-history', (history) => {
            setMessages(history);
        });

        socketRef.current.on('user-left', (id) => {
            if (editorRef.current?.activeDecorations?.[id]) {
                editorRef.current.deltaDecorations(editorRef.current.activeDecorations[id], []);
                delete editorRef.current.activeDecorations[id];
            }
            const style = document.getElementById(`cursor-style-${id}`);
            if (style) style.remove();
        });

        const handleMouseMove = (e) => {
            if (!isResizing.current) return;
            const newWidth = window.innerWidth - e.clientX;
            if (newWidth > 200 && newWidth < 600) {
                // Set motion value directly — no React re-render, no spring animation
                chatWidth.set(newWidth);
            }
        };

        const handleMouseUp = () => {
            isResizing.current = false;
            document.body.style.cursor = 'default';
            document.body.style.userSelect = '';
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            if (socketRef.current) {
                socketRef.current.off('connect');
                socketRef.current.off('code-update');
                socketRef.current.off('user-list');
                socketRef.current.off('language-update');
                socketRef.current.off('cursor-update');
                socketRef.current.off('user-left');
                socketRef.current.off('new-message');
                socketRef.current.off('chat-history');
                socketRef.current.disconnect();
            }
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [roomId, user]);

    const handleFileSwitch = (fileId) => {
        if (fileId === activeFileId) return;

        const file = files.find(f => f.id === fileId);
        if (file && file.type === 'file') {
            // Save current code to files state before switching
            setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, content: code } : f));

            setActiveFileId(fileId);
            setCode(file.content || "");
            setLanguage(file.language || "javascript");
            socketRef.current?.emit('file-switch', { roomId, fileId });
        }
    };

    const createFile = async (name, type, parentId = null) => {
        try {
            let fileLang = 'javascript';
            if (type === 'file') {
                const ext = name.includes('.') ? name.substring(name.lastIndexOf('.')).toLowerCase() : '';
                const lang = LANGUAGES.find(l => l.ext === ext);
                if (lang) fileLang = lang.value;
                else if (ext === '.jsx' || ext === '.tsx') fileLang = 'javascript';
                else fileLang = 'plaintext';
            }

            const res = await axios.post(`/api/room/${roomId}/files`, { name, type, parentId, language: fileLang });
            setFiles(res.data.files);

            const createdFile = res.data.files.find(f => f.name === name && f.parentId === parentId);
            if (createdFile) {
                socketRef.current?.emit('file-create', { roomId, file: createdFile });
                if (type === 'file') handleFileSwitch(createdFile.id);
            }
        } catch (err) {
            console.error("Error creating file:", err);
            alert("Failed to create file");
        }
    };

    const deleteFile = async (fileId) => {
        if (!window.confirm("Are you sure you want to delete this?")) return;
        try {
            const res = await axios.delete(`/api/room/${roomId}/files/${fileId}`);
            setFiles(res.data.files);
            socketRef.current?.emit('file-delete', { roomId, fileId });

            if (activeFileId === fileId) {
                const roomFiles = res.data.files;
                const nextFile = roomFiles.find(f => f.type === 'file');
                if (nextFile) handleFileSwitch(nextFile.id);
                else {
                    setActiveFileId(null);
                    setCode("// No files left");
                }
            }
        } catch (err) {
            console.error("Error deleting file:", err);
        }
    };

    const handleLanguageChange = (newLang) => {
        setLanguage(newLang);
        setIsLangDropdownOpen(false);
        // Update language for the current file in DB
        setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, language: newLang } : f));
        socketRef.current?.emit('language-change', { roomId, fileId: activeFileId, language: newLang });
    };

    const handleEditorChange = (value) => {
        setCode(value);
        socketRef.current.emit('code-change', { roomId, fileId: activeFileId, code: value });
    };

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!messageInput.trim() || !socketRef.current) return;

        const userPayload = {
            id: user.id || user._id || user.uid,
            name: user.name,
            photoURL: user.photoURL
        };

        socketRef.current.emit('send-message', {
            roomId,
            message: messageInput,
            user: userPayload
        });
        setMessageInput('');
    };

    const handleCopyLink = () => {
        const url = `${window.location.origin}/room/${roomId}`;
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleCopyRoomId = () => {
        navigator.clipboard.writeText(roomId);
        setCopiedId(true);
        setTimeout(() => setCopiedId(false), 2000);
    };

    if (isLoading) return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-zinc-950 gap-4 text-zinc-500">
            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            <p className="text-sm font-medium animate-pulse">Initializing collaborative session...</p>
        </div>
    );

    if (isNotFound) return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-zinc-950 gap-6">
            <div className="p-6 bg-red-500/10 rounded-full border border-red-500/20 text-red-500">
                <X size={48} />
            </div>
            <div className="text-center">
                <h1 className="text-2xl font-bold mb-2">Room Not Found</h1>
                <p className="text-zinc-500">The room you're looking for doesn't exist or has been deleted.</p>
            </div>
            <button onClick={() => navigate('/dashboard')} className="btn-primary px-8">Return to Dashboard</button>
        </div>
    );

    if (!isMember) return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-zinc-950 relative overflow-hidden">
            {/* Background Blobs */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/5 rounded-full blur-[120px]" />

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="z-10 bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 p-8 rounded-2xl shadow-2xl max-w-md w-full text-center"
            >
                <div className="w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                    <Code2 size={32} className="text-primary" />
                </div>

                <h2 className="text-2xl font-bold text-white mb-2">Join Room</h2>
                <p className="text-zinc-400 mb-8">
                    You've been invited to collaborate in <br />
                    <span className="text-white font-semibold">"{roomDetails?.name || 'Untitled Room'}"</span>
                </p>

                <div className="flex flex-col gap-3">
                    <button
                        onClick={handleManualJoin}
                        className="w-full btn-primary py-3.5 justify-center text-base shadow-lg shadow-primary/20"
                    >
                        Join as {user.name}
                    </button>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="w-full py-3.5 text-zinc-500 hover:text-white transition-colors text-sm font-medium"
                    >
                        Back to Dashboard
                    </button>
                </div>

                <div className="mt-8 pt-6 border-t border-zinc-800/50 flex items-center justify-center gap-2 text-xs text-zinc-600">
                    <Shield size={12} />
                    <span>Secure, real-time collaboration</span>
                </div>
            </motion.div>
        </div>
    );

    return (
        <div className="h-screen flex flex-col bg-background">
            {/* Top Navigation */}
            <header className="h-14 border-b border-zinc-800/80 flex items-center justify-between px-3 bg-zinc-950 shrink-0 gap-2">
                {/* Left: Back + Logo + Language Picker */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-all"
                        title="Back to Dashboard"
                    >
                        <ArrowLeft size={18} />
                    </button>

                    {/* Logo */}
                    <div className="flex items-center gap-2 pr-3 border-r border-zinc-800">
                        <div className="p-1.5 bg-primary rounded-md">
                            <Code2 size={14} className="text-white" />
                        </div>
                        <span className="font-bold text-sm tracking-tight hidden md:block">CodeSync</span>
                    </div>

                    {/* Current Language Badge */}
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-900 bg-zinc-900/30">
                        <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: currentLang.color }}
                        />
                        <span className="text-xs font-medium text-zinc-400">
                            {currentLang.label}
                        </span>
                    </div>
                </div>

                {/* Right: Collaborators + Actions */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                    {/* Collaborator Avatars - only on large screens */}
                    {
                        collaborators.length > 0 && (
                            <div className="flex -space-x-2 mr-1 hidden xl:flex">
                                {collaborators.slice(0, 3).map((collab) => (
                                    <img
                                        key={collab.socketId}
                                        src={collab.photoURL || `https://ui-avatars.com/api/?name=${collab.name}&background=random&color=fff`}
                                        className="w-6 h-6 rounded-full border-2 border-zinc-900"
                                        title={collab.name}
                                    />
                                ))}
                                {collaborators.length > 3 && (
                                    <div className="w-6 h-6 rounded-full border-2 border-zinc-900 bg-zinc-800 flex items-center justify-center text-[9px] font-bold text-zinc-400">
                                        +{collaborators.length - 3}
                                    </div>
                                )}
                            </div>
                        )
                    }

                    {/* Copy ID - hidden on small screens */}
                    <button
                        onClick={handleCopyRoomId}
                        className="hidden md:flex items-center gap-1.5 py-1 px-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-md text-xs font-medium transition-all flex-shrink-0"
                    >
                        {copiedId ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                        <span className="hidden lg:inline">{copiedId ? 'Copied' : 'Copy ID'}</span>
                    </button>

                    {/* Share */}
                    <button
                        onClick={() => setIsShareModalOpen(true)}
                        className="flex items-center gap-1.5 py-1 px-2.5 bg-primary hover:bg-primary/90 text-white rounded-md text-xs font-medium transition-all flex-shrink-0"
                    >
                        <Share2 size={12} />
                        <span className="hidden sm:inline">Share</span>
                    </button>

                    {/* Run */}
                    <button
                        onClick={runCode}
                        disabled={isRunning}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                        style={{
                            background: isRunning
                                ? 'linear-gradient(135deg, #15803d, #166534)'
                                : 'linear-gradient(135deg, #16a34a, #15803d)',
                            boxShadow: isRunning ? 'none' : '0 0 14px rgba(22,163,74,0.35)'
                        }}
                    >
                        {isRunning
                            ? <><Loader2 size={12} className="animate-spin" /><span className="hidden sm:inline ml-1">Running...</span></>
                            : <><Play size={12} className="fill-white" /><span className="ml-1">Run</span></>
                        }
                    </button>
                </div >
            </header >

            <div className="flex-1 flex overflow-hidden">
                {/* Left Sidebar - Active Room Stats */}
                <div className="w-12 border-r border-zinc-900 flex flex-col items-center py-4 gap-4 bg-zinc-950">
                    <SidebarIcon
                        icon={<File size={20} />}
                        active={activeSidePanel === 'files'}
                        onClick={() => setActiveSidePanel(activeSidePanel === 'files' ? null : 'files')}
                        title="Files"
                    />
                    <SidebarIcon
                        icon={<Users size={20} />}
                        active={activeSidePanel === 'users'}
                        onClick={() => setActiveSidePanel(activeSidePanel === 'users' ? null : 'users')}
                        title="Collaborators"
                    />
                    <SidebarIcon
                        icon={<MessageSquare size={20} />}
                        active={isChatOpen}
                        onClick={() => setIsChatOpen(!isChatOpen)}
                        title="Chat"
                    />
                </div>

                {/* Side Panel (Files or Users) */}
                <AnimatePresence mode='wait'>
                    {activeSidePanel && (
                        <motion.aside
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: 240, opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            className="border-r border-zinc-900 flex flex-col bg-zinc-950/30"
                        >
                            {activeSidePanel === 'files' ? (
                                <>
                                    <div className="p-4 border-b border-zinc-900 flex items-center justify-between">
                                        <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Explorer</h3>
                                        <div className="flex gap-1">
                                            <button onClick={() => createFile(prompt("File Name (e.g. script.js):"), 'file')} className="p-1 hover:bg-zinc-800 rounded">
                                                <FilePlus size={14} className="text-zinc-400" />
                                            </button>
                                            <button onClick={() => createFile(prompt("Folder Name:"), 'folder')} className="p-1 hover:bg-zinc-800 rounded">
                                                <FolderPlus size={14} className="text-zinc-400" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-2">
                                        <FileTree
                                            files={files}
                                            activeFileId={activeFileId}
                                            onFileClick={handleFileSwitch}
                                            onDelete={deleteFile}
                                            onCreate={createFile}
                                            languages={LANGUAGES}
                                        />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="p-4 border-b border-zinc-900 flex items-center justify-between">
                                        <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Collaborators ({collaborators.length})</h3>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-2">
                                        {collaborators.map((collab) => (
                                            <div key={collab.socketId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-900 transition-colors cursor-default">
                                                <div className="relative">
                                                    <img
                                                        src={collab.photoURL || `https://ui-avatars.com/api/?name=${collab.name}&background=random&color=fff`}
                                                        className="w-8 h-8 rounded-full"
                                                        alt={collab.name}
                                                    />
                                                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-zinc-950 rounded-full" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium truncate">{collab.name}</p>
                                                    <p className="text-[10px] text-zinc-500 uppercase tracking-tighter">Editor</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </motion.aside>
                    )}
                </AnimatePresence>

                {/* Editor Area */}
                <div className="flex-1 relative flex flex-col">
                    <Editor
                        height="100%"
                        theme="vs-dark"
                        language={language}
                        value={code}
                        onChange={handleEditorChange}
                        onMount={(editor) => {
                            editorRef.current = editor;
                            editor.onDidChangeCursorPosition((e) => {
                                if (socketRef.current) {
                                    socketRef.current.emit('cursor-move', {
                                        roomId,
                                        cursor: e.position,
                                        user: {
                                            id: user.id || user._id || user.uid,
                                            name: user.name
                                        }
                                    });
                                }
                            });
                        }}
                        options={{
                            fontSize: 14,
                            minimap: { enabled: true },
                            scrollBeyondLastLine: false,
                            automaticLayout: true,
                            padding: { top: 16 },
                            fontFamily: 'JetBrains Mono, monospace',
                            readOnly: role === 'viewer'
                        }}
                    />

                    {/* Output Terminal */}
                    <AnimatePresence>
                        {isOutputVisible && (
                            <motion.div
                                initial={{ y: 300 }}
                                animate={{ y: 0 }}
                                exit={{ y: 300 }}
                                className="absolute bottom-0 left-0 right-0 z-30 bg-zinc-950 border-t border-zinc-800 flex flex-col"
                                style={{ height: '30%' }}
                            >
                                <div className="flex items-center justify-between px-4 py-2 bg-zinc-900/50 border-b border-zinc-800">
                                    <div className="flex items-center gap-2 text-zinc-400">
                                        <Terminal size={14} />
                                        <span className="text-xs font-bold uppercase tracking-wider">Output</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => setOutput("")}
                                            className="p-1.5 hover:bg-zinc-800 rounded text-zinc-500 hover:text-white transition-colors"
                                            title="Clear Output"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                        <button
                                            onClick={() => setIsOutputVisible(false)}
                                            className="p-1.5 hover:bg-zinc-800 rounded text-zinc-500 hover:text-white transition-colors"
                                        >
                                            <ChevronDown size={14} />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex-1 p-4 font-mono text-sm overflow-y-auto custom-scrollbar whitespace-pre-wrap selection:bg-primary/30">
                                    {output ? (
                                        <div className={output.includes("Error") || output.includes("Exception") ? "text-red-400" : "text-zinc-300"}>
                                            {output}
                                        </div>
                                    ) : (
                                        <span className="text-zinc-600 italic">No output yet. Click 'Run' to see results.</span>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {!isOutputVisible && output && (
                        <button
                            onClick={() => setIsOutputVisible(true)}
                            className="absolute bottom-4 right-4 z-20 bg-zinc-900 border border-zinc-800 px-3 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all flex items-center gap-2 shadow-2xl"
                        >
                            <Terminal size={14} />
                            Show Output
                            <ChevronUp size={14} />
                        </button>
                    )}
                </div>

                {/* Chat Panel */}
                <AnimatePresence>
                    {isChatOpen && (
                        <motion.aside
                            ref={chatPanelRef}
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: 320 }}
                            exit={{ opacity: 0, width: 0 }}
                            transition={{ type: 'tween', duration: 0.2, ease: 'easeOut' }}
                            style={{ flexShrink: 0, overflow: 'hidden' }}
                            className="h-full flex flex-col relative border-l border-zinc-900 bg-zinc-950 shadow-2xl"
                        >
                            {/* Inner container at full fixed width so content never squishes */}
                            <div className="flex flex-col h-full" style={{ width: 320, minWidth: 200 }}>
                                {/* Resize Handle */}
                                <div
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        isResizing.current = true;
                                        document.body.style.cursor = 'col-resize';
                                        document.body.style.userSelect = 'none';
                                    }}
                                    className="w-1.5 hover:bg-primary/60 cursor-col-resize transition-colors absolute left-0 top-0 bottom-0 z-20"
                                />

                                {/* Chat Header */}
                                <div className="p-4 border-b border-zinc-900 flex items-center justify-between bg-black/20 backdrop-blur-md shrink-0">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                        <h3 className="text-sm font-bold tracking-wide">Live Chat</h3>
                                    </div>
                                    <button onClick={() => setIsChatOpen(false)} className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors">
                                        <X size={16} className="text-zinc-500 hover:text-white" />
                                    </button>
                                </div>

                                {/* Messages */}
                                <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar min-h-0">
                                    {messages.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-zinc-600 gap-3 opacity-50 px-6">
                                            <div className="p-4 bg-zinc-900 rounded-full">
                                                <MessageSquare size={32} />
                                            </div>
                                            <p className="text-center text-xs leading-relaxed">No messages yet. Start a conversation with your team!</p>
                                        </div>
                                    ) : (
                                        messages.map((msg, idx) => {
                                            const msgUserId = msg.user.id || msg.user._id || msg.user.uid;
                                            const currentUserId = user.id || user._id || user.uid;
                                            const isMe = msgUserId === currentUserId;

                                            return (
                                                <div key={idx} className={`flex items-start gap-2.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                                    <img
                                                        src={msg.user.photoURL || `https://ui-avatars.com/api/?name=${msg.user.name}&background=random&color=fff`}
                                                        alt=""
                                                        className="w-7 h-7 rounded-full border border-zinc-800 flex-shrink-0 mt-0.5"
                                                    />
                                                    <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[85%]`}>
                                                        <div className="flex items-center gap-2 mb-0.5 px-0.5">
                                                            {!isMe && <span className="text-[10px] font-semibold text-zinc-400">{msg.user.name}</span>}
                                                            <span className="text-[9px] text-zinc-500 font-medium">
                                                                {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}
                                                            </span>
                                                        </div>
                                                        <div
                                                            className={`px-3.5 py-2 rounded-2xl text-[13px] leading-relaxed transition-all shadow-md ${isMe
                                                                ? 'bg-primary text-white rounded-tr-none'
                                                                : 'bg-zinc-900 text-zinc-200 rounded-tl-none border border-zinc-800/80'
                                                                }`}
                                                        >
                                                            {msg.message}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Input */}
                                <div className="p-4 border-t border-zinc-900 bg-black/20 backdrop-blur-md shrink-0">
                                    <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-zinc-600"
                                            placeholder="Type a message..."
                                            value={messageInput}
                                            onChange={(e) => setMessageInput(e.target.value)}
                                        />
                                        <button
                                            type="submit"
                                            disabled={!messageInput.trim()}
                                            className="p-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                                        >
                                            <Send size={16} />
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </motion.aside>
                    )}
                </AnimatePresence>
            </div>

            {/* Share Modal */}
            <AnimatePresence>
                {isShareModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl space-y-8"
                        >
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <h2 className="text-2xl font-bold tracking-tight">Invite others</h2>
                                    <p className="text-sm text-zinc-500">Collaborate with your team in real-time.</p>
                                </div>
                                <button
                                    onClick={() => setIsShareModalOpen(false)}
                                    className="p-2 hover:bg-zinc-800 rounded-xl transition-colors text-zinc-500 hover:text-white"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest px-1">Room Link</label>
                                    <div className="flex gap-2">
                                        <div className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-300 truncate font-mono">
                                            {window.location.origin}/room/{roomId}
                                        </div>
                                        <button
                                            onClick={handleCopyLink}
                                            className="px-6 bg-primary text-white rounded-xl font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-primary/20 whitespace-nowrap"
                                        >
                                            {copied ? 'Copied!' : 'Copy Link'}
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest px-1">Room ID</label>
                                    <div className="flex gap-2">
                                        <div className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-300 font-mono">
                                            {roomId}
                                        </div>
                                        <button
                                            onClick={handleCopyRoomId}
                                            className="px-6 bg-zinc-800 text-white rounded-xl font-bold text-sm hover:bg-zinc-700 transition-all whitespace-nowrap"
                                        >
                                            {copiedId ? 'Copied!' : 'Copy ID'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-zinc-800/50 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                    <Shield size={20} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs font-semibold text-zinc-300">Fast, Real-time Sync</p>
                                    <p className="text-[10px] text-zinc-500 italic">Up to 50 active collaborators supported.</p>
                                </div>
                                <button
                                    onClick={() => setIsShareModalOpen(false)}
                                    className="text-xs font-bold text-primary hover:underline px-2"
                                >
                                    Done
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div >
    );
};

const FileTree = ({ files, activeFileId, onFileClick, onDelete, onCreate, languages }) => {
    const rootFiles = files.filter(f => !f.parentId);
    return (
        <div className="flex flex-col gap-0.5">
            {rootFiles.map(file => (
                <FileTreeItem
                    key={file.id}
                    file={file}
                    allFiles={files}
                    activeFileId={activeFileId}
                    onFileClick={onFileClick}
                    onDelete={onDelete}
                    onCreate={onCreate}
                    level={0}
                    languages={languages}
                />
            ))}
        </div>
    );
};

const FileTreeItem = ({ file, allFiles, activeFileId, onFileClick, onDelete, onCreate, level, languages }) => {
    const [isOpen, setIsOpen] = useState(false);
    const children = allFiles.filter(f => f.parentId === file.id);
    const isFolder = file.type === 'folder';
    const isActive = file.id === activeFileId;
    const fileLang = languages?.find(l => l.value === file.language);

    return (
        <div className="flex flex-col select-none">
            <div
                className={`flex items-center gap-1.5 py-1 px-2 rounded-md cursor-pointer transition-colors group ${isActive ? 'bg-primary/20 text-white' : 'hover:bg-zinc-900 text-zinc-400'}`}
                style={{ paddingLeft: `${level * 12 + 8}px` }}
                onClick={() => {
                    if (isFolder) setIsOpen(!isOpen);
                    else onFileClick(file.id);
                }}
            >
                <div className="w-4 flex items-center justify-center flex-shrink-0 text-zinc-500">
                    {isFolder && (isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />)}
                </div>

                {isFolder ? (
                    <Folder size={14} className={isActive ? 'text-primary' : 'text-blue-400'} />
                ) : (
                    <File size={14} style={{ color: isActive ? '' : fileLang?.color }} className={isActive ? 'text-primary' : 'text-zinc-500'} />
                )}

                <span className={`text-xs truncate flex-1 ${isActive ? 'font-medium' : ''}`}>{file.name}</span>

                {/* Actions (visible on hover) */}
                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
                    {isFolder && (
                        <>
                            <button
                                onClick={(e) => { e.stopPropagation(); const n = prompt("File Name:"); if (n) { onCreate(n, 'file', file.id); setIsOpen(true); } }}
                                className="p-0.5 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white"
                                title="New File"
                            >
                                <FilePlus size={12} />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); const n = prompt("Folder Name:"); if (n) { onCreate(n, 'folder', file.id); setIsOpen(true); } }}
                                className="p-0.5 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white"
                                title="New Folder"
                            >
                                <FolderPlus size={12} />
                            </button>
                        </>
                    )}
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(file.id); }}
                        className="p-0.5 hover:bg-red-900/50 rounded text-zinc-500 hover:text-red-400"
                        title="Delete"
                    >
                        <Trash2 size={12} />
                    </button>
                </div>
            </div>

            {isFolder && isOpen && (
                <div className="flex flex-col">
                    {children.map(child => (
                        <FileTreeItem
                            key={child.id}
                            file={child}
                            allFiles={allFiles}
                            activeFileId={activeFileId}
                            onFileClick={onFileClick}
                            onDelete={onDelete}
                            onCreate={onCreate}
                            level={level + 1}
                            languages={languages}
                        />
                    ))}
                    {children.length === 0 && (
                        <div className="py-1 text-[10px] text-zinc-600 italic select-none" style={{ paddingLeft: `${(level + 1) * 12 + 28}px` }}>Empty</div>
                    )}
                </div>
            )}
        </div>
    );
};

const SidebarIcon = ({ icon, active, onClick, title }) => (
    <button
        onClick={onClick}
        className={`p-2 rounded-lg transition-all ${active ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white hover:bg-zinc-900'}`}
    >
        {icon}
    </button>
);

export default EditorPage;
