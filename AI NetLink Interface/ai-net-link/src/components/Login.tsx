/**
 * © 2026 NetLink. All Rights Reserved.
 * Developer: Muhammad Rateb Jabarin
 * Website: aljabareen.com
 * Contact: admin@aljabareen.com | +970597409040
 */
import React, { useState } from 'react';
import { motion } from 'motion/react';
import { LogIn, Mail, Lock, Shield, User, Briefcase, TrendingUp, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { AppState, Role, User as UserType } from '../types';
import { dict } from '../dict';
import { fetchManagers } from '../api';

interface LoginProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

const SUPER_ADMIN: UserType = { id: '0', name: 'المدير العام (Super Admin)', email: 'mrjabarin@gmail.com', username: 'admin', role: 'super_admin', permissions: ['all'] };

export default function Login({ state, setState }: LoginProps) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const t = dict[state.lang];
  const isRTL = state.lang === 'ar';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Fetch dynamic users from API once
      const dbUsers = await fetchManagers().catch(() => []) || [];

      // Check for Super Admin (The User)
      if ((identifier.toLowerCase() === 'mrjabarin@gmail.com' || identifier.toLowerCase() === 'admin') && password === 'Sniper.2591993') {
        const user = SUPER_ADMIN;
        if (rememberMe) {
          localStorage.setItem('sas4_remembered_user', JSON.stringify(user));
        }
        setState(prev => ({
          ...prev,
          isAuthenticated: true,
          currentUser: user,
          teamMembers: [user, ...dbUsers], // Super Admin + All DB Managers
          role: user.role,
          activeTab: 'dashboard'
        }));
        setIsLoading(false);
        return;
      }

      const user = dbUsers.find((u: any) => (u.email === identifier || u.username === identifier) && password === 'password');
      
      if (user) {
        if (rememberMe) {
          localStorage.setItem('sas4_remembered_user', JSON.stringify(user));
        }
        setState(prev => ({
          ...prev,
          isAuthenticated: true,
          currentUser: user,
          teamMembers: [SUPER_ADMIN, ...dbUsers], // INJECT DB MANAGERS HERE + SUPER ADMIN
          role: user.role,
          activeTab: user.role === 'shareholder' ? 'investors' : 'dashboard'
        }));
      } else {
        setError(state.lang === 'ar' ? 'بيانات الدخول غير صحيحة' : 'Invalid credentials');
      }
    } catch (err) {
      setError(state.lang === 'ar' ? 'خطأ في الاتصال بالخادم' : 'Server Connection Error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 relative overflow-hidden" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Background elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl animate-pulse" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md z-10"
      >
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-8">
            <div className="flex flex-col items-center mb-8">
              <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/20 mb-4">
                <LogIn className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t.auth.welcomeBack}</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1">{t.auth.login}</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm text-center font-medium"
                >
                  {error}
                </motion.div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Mail className="w-4 h-4" /> {t.auth.emailOrUsername}
                </label>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder={t.auth.emailOrUsername}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Lock className="w-4 h-4" /> {t.auth.password}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all pr-12"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="peer sr-only"
                    />
                    <div className="w-5 h-5 rounded border-2 border-slate-300 dark:border-slate-600 peer-checked:bg-blue-600 peer-checked:border-blue-600 transition-all" />
                    <CheckCircle2 className="absolute w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 left-0.5 transition-opacity" />
                  </div>
                  <span className="text-sm text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200 transition-colors">
                    {t.auth.rememberMe}
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    {t.auth.signIn}
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
              <button className="text-sm text-blue-600 hover:underline font-medium">
                {t.auth.forgotPassword}
              </button>
            </div>
          </div>
        </div>

        <p className="mt-8 text-center text-slate-500 dark:text-slate-400 text-sm flex flex-col gap-1">
          <span>&copy; 2026 AI NetLink. All rights reserved.</span>
          <span className="text-xs opacity-75">Developed & Designed by Muhammad Rateb Jabarin</span>
        </p>
      </motion.div>
    </div>
  );
}
