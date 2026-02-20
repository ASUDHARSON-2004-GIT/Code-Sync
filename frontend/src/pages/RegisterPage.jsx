import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Code2, Mail, Lock, User, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

const RegisterPage = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);
    const { signup, loginWithGoogle, user, loading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const from = location.state?.from || "/dashboard";

    useEffect(() => {
        if (user) {
            navigate(from, { replace: true });
        }
    }, [user, navigate, from]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsRegistering(true);
        try {
            await signup(email, password, name);
        } catch (err) {
            setIsRegistering(false);
            setError(err.response?.data?.message || err.message || 'Failed to create an account.');
        }
    };
    const handleGoogleLogin = async () => {
        setError('');
        setIsRegistering(true);
        try {
            await loginWithGoogle();
        } catch (err) {
            setIsRegistering(false);
            setError(err.message || 'Failed to login with Google.');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md p-8 glass rounded-2xl"
            >
                <div className="flex flex-col items-center mb-8">
                    <div className="p-3 bg-primary rounded-xl mb-4">
                        <Code2 size={32} className="text-white" />
                    </div>
                    <h2 className="text-2xl font-bold">Create an account</h2>
                    <p className="text-zinc-500">Start collaborating today</p>
                </div>

                {error && <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg mb-6 text-sm">{error}</div>}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                            <User size={16} /> Full Name
                        </label>
                        <input
                            type="text"
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary outline-none transition-all"
                            placeholder="John Doe"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                            <Mail size={16} /> Email
                        </label>
                        <input
                            type="email"
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary outline-none transition-all"
                            placeholder="name@company.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                            <Lock size={16} /> Password
                        </label>
                        <input
                            type="password"
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary outline-none transition-all"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isRegistering}
                        className="w-full btn-primary py-3 justify-center text-lg mt-2 disabled:opacity-50"
                    >
                        {isRegistering ? 'Creating account...' : 'Sign up'}
                    </button>
                </form>
                <div className="relative my-8">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-zinc-800" /></div>
                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-zinc-500">Or continue with</span></div>
                </div>
                <div className="grid grid-cols-1 gap-4">
                    <button
                        onClick={handleGoogleLogin}
                        disabled={isRegistering}
                        className="flex items-center justify-center gap-2 py-3 border border-zinc-800 rounded-lg hover:bg-zinc-800 transition-all font-medium disabled:opacity-50"
                    >
                        {isRegistering ? (
                            <Loader2 className="animate-spin" size={20} />
                        ) : (
                            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                        )}
                        Google
                    </button>
                </div>

                <p className="mt-8 text-center text-sm text-zinc-500">
                    Already have an account? <Link to="/login" state={{ from }} className="text-primary hover:underline font-medium">Log in</Link>
                </p>
            </motion.div>
        </div>
    );
};

export default RegisterPage;
