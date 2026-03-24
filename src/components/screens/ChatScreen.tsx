import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Stethoscope, User, Send } from 'lucide-react';
import { cn } from '../../lib/utils';
import { chatWithDoctor } from '../../services/geminiService';

interface ChatScreenProps {
  language: string;
  isOnline: boolean;
  t: (s: string) => string;
}

export default function ChatScreen({ language, isOnline, t }: ChatScreenProps) {
  const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string }[]>([
    { role: 'model', text: t("Hello! I'm your MediGuide AI doctor. How can I help you today? You can ask me about any disease, symptoms, or general health concerns.") }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading || !isOnline) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const response = await chatWithDoctor(userMessage, history, language === 'en' ? 'English' : 'Hindi');
      setMessages(prev => [...prev, { role: 'model', text: response }]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { role: 'model', text: t("I'm sorry, I'm having trouble connecting right now. Please try again later.") }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col h-full bg-slate-50"
    >
      {/* Header */}
      <div className="bg-white px-6 py-4 border-b border-slate-100 flex items-center gap-3 shrink-0">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Stethoscope size={20} className="text-primary" />
        </div>
        <div>
          <h2 className="font-bold text-slate-800 leading-none">{t("Chat with Doctor")}</h2>
          <div className="flex items-center gap-1.5 mt-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Online & Ready</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
      >
        {messages.map((msg, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, scale: 0.95, x: msg.role === 'user' ? 10 : -10 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            className={cn(
              "flex gap-3 max-w-[85%]",
              msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
            )}
          >
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
              msg.role === 'user' ? "bg-primary text-white" : "bg-white border border-slate-100 text-primary shadow-sm"
            )}>
              {msg.role === 'user' ? <User size={14} /> : <Stethoscope size={14} />}
            </div>
            <div className={cn(
              "p-4 rounded-3xl text-sm leading-relaxed shadow-sm",
              msg.role === 'user' 
                ? "bg-primary text-white rounded-tr-none" 
                : "bg-white text-slate-700 border border-slate-100 rounded-tl-none"
            )}>
              {msg.text}
            </div>
          </motion.div>
        ))}
        {isLoading && (
          <div className="flex gap-3 max-w-[85%] mr-auto">
            <div className="w-8 h-8 rounded-full bg-white border border-slate-100 text-primary shadow-sm flex items-center justify-center shrink-0">
              <Stethoscope size={14} />
            </div>
            <div className="bg-white p-4 rounded-3xl rounded-tl-none border border-slate-100 flex gap-1 items-center">
              <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-slate-100 safe-bottom">
        <div className="relative flex items-center gap-2">
          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={t("Ask about any disease...")}
            className="flex-1 bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-slate-400"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isLoading || !isOnline}
            className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20 active:scale-90 transition-all disabled:opacity-50 disabled:grayscale"
          >
            <Send size={20} />
          </button>
        </div>
        <p className="text-[10px] text-center text-slate-400 mt-3 font-medium">
          AI Doctor can make mistakes. Always consult a real physician for diagnosis.
        </p>
      </div>
    </motion.div>
  );
}
