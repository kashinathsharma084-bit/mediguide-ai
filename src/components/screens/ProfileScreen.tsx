import React, { useState } from 'react';
import { motion } from 'motion/react';
import { User as UserIcon, Camera, Check, Loader2, LogOut } from 'lucide-react';
import { auth, updateProfile, signOut } from '../../firebase';
import { User } from 'firebase/auth';

interface ProfileScreenProps {
  user: User;
  t: (s: string) => string;
}

export default function ProfileScreen({ user, t }: ProfileScreenProps) {
  const [displayName, setDisplayName] = useState(user.displayName || '');
  const [photoURL, setPhotoURL] = useState(user.photoURL || '');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setIsSuccess(false);
    try {
      await updateProfile(user, {
        displayName,
        photoURL
      });
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 3000);
    } catch (error) {
      console.error("Update profile error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 space-y-8"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">{t("Edit Profile")}</h2>
        <button 
          onClick={() => signOut(auth)}
          className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors flex items-center gap-2 text-xs font-bold"
        >
          <LogOut size={16} />
          {t("Sign Out")}
        </button>
      </div>

      <form onSubmit={handleUpdateProfile} className="space-y-6">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="w-24 h-24 rounded-[32px] bg-slate-100 overflow-hidden border-4 border-white shadow-sm">
              {photoURL ? (
                <img src={photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-300">
                  <UserIcon size={40} />
                </div>
              )}
            </div>
            <div className="absolute -bottom-2 -right-2 p-2 bg-primary text-white rounded-xl shadow-lg">
              <Camera size={16} />
            </div>
          </div>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{t("Profile Picture")}</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
              {t("Display Name")}
            </label>
            <input 
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={t("Enter your name")}
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
              {t("Photo URL")}
            </label>
            <input 
              type="text"
              value={photoURL}
              onChange={(e) => setPhotoURL(e.target.value)}
              placeholder={t("Enter image URL")}
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
        </div>

        <button 
          type="submit"
          disabled={isLoading}
          className="w-full bg-primary text-white py-5 rounded-3xl font-bold text-lg shadow-xl shadow-primary/20 flex items-center justify-center gap-3 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 className="animate-spin" size={24} />
          ) : isSuccess ? (
            <>
              <Check size={24} />
              {t("Saved Successfully")}
            </>
          ) : (
            t("Save Changes")
          )}
        </button>
      </form>

      <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-100 space-y-4">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t("Account Info")}</h4>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-500">{t("Email")}</span>
            <span className="text-xs font-bold text-slate-700">{user.email}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-500">{t("User ID")}</span>
            <span className="text-[10px] font-mono text-slate-400">{user.uid}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
