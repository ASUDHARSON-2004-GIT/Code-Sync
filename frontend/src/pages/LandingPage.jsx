import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Code2, Users, Zap, Shield, ChevronRight } from 'lucide-react';

const LandingPage = () => {
    const navigate = useNavigate();

    return (
        <div className="relative overflow-hidden bg-background">
            {/* Background Glows */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]" />

            {/* Navbar */}
            <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-primary rounded-lg">
                        <Code2 size={24} className="text-white" />
                    </div>
                    <span className="text-xl font-bold tracking-tight">CodeSync</span>
                </div>
                <div className="flex items-center gap-6">
                    <button onClick={() => navigate('/login')} className="text-zinc-400 hover:text-white transition-colors">Log in</button>
                    <button onClick={() => navigate('/register')} className="btn-primary">Sign up free</button>
                </div>
            </nav>

            {/* Hero Section */}
            <main className="relative z-10 max-w-7xl mx-auto px-8 pt-20 pb-32 flex flex-col items-center text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <span className="px-4 py-1.5 bg-zinc-900 border border-zinc-800 rounded-full text-zinc-400 text-sm mb-8 inline-block">
                        Build together, better.
                    </span>
                    <h1 className="text-6xl md:text-7xl font-bold tracking-tight mb-6 bg-gradient-to-b from-white to-zinc-500 bg-clip-text text-transparent">
                        Innovate. Collaborate. <br /> Code.
                    </h1>
                    <p className="text-zinc-400 text-xl max-w-2xl mb-10">
                        Real-time collaborative code editor for teams. Write, review, and deploy code together from anywhere in the world.
                    </p>
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate('/register')} className="btn-primary text-lg px-8 py-4">
                            Start Coding Now <ChevronRight size={20} />
                        </button>
                    </div>
                </motion.div>

                {/* Dashboard Preview / Placeholder */}
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.8 }}
                    className="mt-20 w-full max-w-5xl rounded-xl border border-zinc-800 bg-zinc-900/50 p-2 shadow-2xl relative"
                >
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-[80%] h-20 bg-primary/20 blur-[60px]" />
                    <img
                        src="https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=2070&auto=format&fit=crop"
                        alt="Editor Preview"
                        className="rounded-lg w-full h-[500px] object-cover opacity-60 grayscale hover:grayscale-0 transition-all duration-700 cursor-pointer"
                    />
                </motion.div>
            </main>

            {/* Features Section */}
            <section className="relative z-10 max-w-7xl mx-auto px-8 py-20 border-t border-zinc-900">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                    <FeatureCard
                        icon={<Zap className="text-yellow-500" />}
                        title="Real-time Sync"
                        description="Experience zero-latency code synchronization with Socket.io powered backend."
                    />
                    <FeatureCard
                        icon={<Users className="text-blue-500" />}
                        title="Team Collaboration"
                        description="Invite co-editors and viewers with granular role-based access control."
                    />
                    <FeatureCard
                        icon={<Shield className="text-green-500" />}
                        title="Secure Auth"
                        description="Professional authentication powered by Firebase and Google OAuth."
                    />
                </div>
            </section>
        </div>
    );
};

const FeatureCard = ({ icon, title, description }) => (
    <div className="p-8 rounded-2xl bg-zinc-900/30 border border-zinc-800/50 hover:border-zinc-700 transition-all">
        <div className="mb-4">{icon}</div>
        <h3 className="text-xl font-semibold mb-2">{title}</h3>
        <p className="text-zinc-500 leading-relaxed">{description}</p>
    </div>
);

export default LandingPage;
