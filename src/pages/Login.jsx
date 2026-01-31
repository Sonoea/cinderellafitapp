import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, LogIn, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';

const Login = () => {
    const navigate = useNavigate();
    const { login, signup, loginWithGoogle } = useAuth();
    const { language } = useApp();
    const [isSignup, setIsSignup] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleEmailAuth = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        // Validation
        if (isSignup && password !== confirmPassword) {
            setError(language === 'jp' ? 'パスワードが一致しません' : 'Passwords do not match');
            setLoading(false);
            return;
        }

        if (password.length < 6) {
            setError(language === 'jp' ? 'パスワードは6文字以上である必要があります' : 'Password must be at least 6 characters');
            setLoading(false);
            return;
        }

        try {
            let result;
            if (isSignup) {
                result = await signup(email, password);
            } else {
                result = await login(email, password);
            }

            if (result.success) {
                navigate('/');
            } else {
                setError(result.error || (language === 'jp' ? '認証に失敗しました' : 'Authentication failed'));
            }
        } catch (err) {
            setError(language === 'jp' ? '予期しないエラーが発生しました' : 'An unexpected error occurred');
        }

        setLoading(false);
    };

    const handleGoogleLogin = async () => {
        setError('');
        setLoading(true);

        try {
            const result = await loginWithGoogle();
            if (result.success) {
                navigate('/');
            } else {
                setError(result.error || (language === 'jp' ? 'Googleログインに失敗しました' : 'Google login failed'));
            }
        } catch (err) {
            setError(language === 'jp' ? '予期しないエラーが発生しました' : 'An unexpected error occurred');
        }

        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/10 to-secondary/10">
            <div className="w-full max-w-md">
                {/* Logo & Title */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--primary)' }}>
                        CinderellaFit
                    </h1>
                    <p className="text-gray-600">
                        {language === 'jp' ? 'ぬいぐるみのシンデレラフィット' : 'The perfect fit for your plushie'}
                    </p>
                </div>

                {/* Auth Card */}
                <div className="bg-white rounded-2xl shadow-xl p-8">
                    {/* Toggle Tabs */}
                    <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
                        <button
                            onClick={() => setIsSignup(false)}
                            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${!isSignup ? 'bg-white shadow-sm text-primary' : 'text-gray-400'
                                }`}
                        >
                            {language === 'jp' ? 'ログイン' : 'Login'}
                        </button>
                        <button
                            onClick={() => setIsSignup(true)}
                            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${isSignup ? 'bg-white shadow-sm text-primary' : 'text-gray-400'
                                }`}
                        >
                            {language === 'jp' ? '新規登録' : 'Sign Up'}
                        </button>
                    </div>

                    {/* Google Login Button */}
                    <button
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-3 py-3 px-4 border-2 border-gray-200 rounded-xl font-bold text-gray-700 hover:bg-gray-50 transition-all mb-6 disabled:opacity-50"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        {language === 'jp' ? 'Googleでログイン' : 'Continue with Google'}
                    </button>

                    {/* Divider */}
                    <div className="flex items-center gap-3 mb-6">
                        <div className="flex-1 h-px bg-gray-200"></div>
                        <span className="text-xs text-gray-400 font-bold uppercase">
                            {language === 'jp' ? 'または' : 'or'}
                        </span>
                        <div className="flex-1 h-px bg-gray-200"></div>
                    </div>

                    {/* Email/Password Form */}
                    <form onSubmit={handleEmailAuth} className="space-y-4">
                        {/* Email */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                {language === 'jp' ? 'メールアドレス' : 'Email'}
                            </label>
                            <div className="relative">
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-transparent focus:bg-white focus:border-primary outline-none transition-all"
                                    placeholder={language === 'jp' ? 'example@email.com' : 'your@email.com'}
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                {language === 'jp' ? 'パスワード' : 'Password'}
                            </label>
                            <div className="relative">
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-transparent focus:bg-white focus:border-primary outline-none transition-all"
                                    placeholder={language === 'jp' ? '6文字以上' : 'At least 6 characters'}
                                />
                            </div>
                        </div>

                        {/* Confirm Password (Sign Up Only) */}
                        {isSignup && (
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    {language === 'jp' ? 'パスワード確認' : 'Confirm Password'}
                                </label>
                                <div className="relative">
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                        className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-transparent focus:bg-white focus:border-primary outline-none transition-all"
                                        placeholder={language === 'jp' ? 'もう一度入力' : 'Re-enter password'}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Error Message */}
                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                                {error}
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 px-4 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    {isSignup ? <UserPlus size={20} /> : <LogIn size={20} />}
                                    {isSignup
                                        ? (language === 'jp' ? '新規登録' : 'Sign Up')
                                        : (language === 'jp' ? 'ログイン' : 'Login')
                                    }
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Skip Login (Guest Mode) */}
                <button
                    onClick={() => navigate('/')}
                    className="w-full mt-4 py-3 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
                >
                    {language === 'jp' ? 'ログインせずに続ける（ゲストモード）' : 'Continue as Guest'}
                </button>
            </div>
        </div>
    );
};

export default Login;
