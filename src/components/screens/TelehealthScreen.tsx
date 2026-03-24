import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { 
  Video, User, Phone, Info, Check, Copy, PhoneOff, VideoOff, Mic, MicOff
} from 'lucide-react';
import Peer from 'peerjs';
import { cn } from '../../lib/utils';

interface TelehealthScreenProps {
  language: string;
  t: (s: string) => string;
}

export default function TelehealthScreen({ language, t }: TelehealthScreenProps) {
  const [peerId, setPeerId] = useState<string>('');
  const [remotePeerId, setRemotePeerId] = useState<string>('');
  const [peer, setPeer] = useState<Peer | null>(null);
  const [call, setCall] = useState<any>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isCalling, setIsCalling] = useState(false);
  const [isIncomingCall, setIsIncomingCall] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const newPeer = new Peer();
    
    newPeer.on('open', (id) => {
      setPeerId(id);
    });

    newPeer.on('call', (incomingCall) => {
      setIsIncomingCall(true);
      setCall(incomingCall);
    });

    setPeer(newPeer);

    return () => {
      newPeer.destroy();
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (localVideoRef.current && stream) {
      localVideoRef.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const startLocalStream = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setStream(mediaStream);
      return mediaStream;
    } catch (err) {
      console.error("Failed to get local stream", err);
      alert(t("Could not access camera or microphone. Please check permissions."));
      return null;
    }
  };

  const handleCall = async () => {
    if (!remotePeerId) return;
    
    const localStream = await startLocalStream();
    if (!localStream || !peer) return;

    const outgoingCall = peer.call(remotePeerId, localStream);
    setIsCalling(true);
    setCall(outgoingCall);

    outgoingCall.on('stream', (remoteMediaStream) => {
      setRemoteStream(remoteMediaStream);
    });

    outgoingCall.on('close', () => {
      handleEndCall();
    });
  };

  const handleAnswer = async () => {
    const localStream = await startLocalStream();
    if (!localStream || !call) return;

    call.answer(localStream);
    setIsIncomingCall(false);
    setIsCalling(true);

    call.on('stream', (remoteMediaStream) => {
      setRemoteStream(remoteMediaStream);
    });

    call.on('close', () => {
      handleEndCall();
    });
  };

  const handleEndCall = () => {
    if (call) call.close();
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    setCall(null);
    setStream(null);
    setRemoteStream(null);
    setIsCalling(false);
    setIsIncomingCall(false);
  };

  const toggleVideo = () => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoEnabled(videoTrack.enabled);
    }
  };

  const toggleAudio = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      audioTrack.enabled = !audioTrack.enabled;
      setIsAudioEnabled(audioTrack.enabled);
    }
  };

  const copyId = () => {
    navigator.clipboard.writeText(peerId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="p-6 space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">{t("Telehealth Consultation")}</h2>
          <p className="text-xs text-slate-500 mt-1">{t("Connect with healthcare professionals instantly")}</p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
          <Video size={24} />
        </div>
      </div>

      {!isCalling && !isIncomingCall ? (
        <div className="space-y-6">
          {/* My ID Section */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <User size={18} />
              <h3 className="font-bold text-sm">{t("Your Consultation ID")}</h3>
            </div>
            <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <code className="flex-1 text-xs font-mono text-slate-600 truncate">{peerId || t("Generating...")}</code>
              <button 
                onClick={copyId}
                className="p-2 hover:bg-slate-200 rounded-xl transition-colors text-slate-400"
              >
                {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
              </button>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed italic">
              {t("Share this ID with your doctor or another user to receive a call.")}
            </p>
          </div>

          {/* Call Section */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <Phone size={18} />
              <h3 className="font-bold text-sm">{t("Start a Call")}</h3>
            </div>
            <div className="space-y-3">
              <input 
                type="text" 
                placeholder={t("Enter Doctor's ID...")}
                value={remotePeerId}
                onChange={(e) => setRemotePeerId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
              <button 
                onClick={handleCall}
                disabled={!remotePeerId || !peerId}
                className="w-full bg-primary text-white py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100"
              >
                <Video size={18} />
                {t("Start Video Consultation")}
              </button>
            </div>
          </div>

          {/* Info Section */}
          <div className="bg-amber-50 border border-amber-100 p-5 rounded-3xl space-y-2">
            <h4 className="font-bold text-amber-600 text-sm flex items-center gap-2">
              <Info size={16} />
              {t("How it works")}
            </h4>
            <ul className="text-[11px] text-amber-700/80 space-y-2 list-disc pl-4">
              <li>{t("Share your ID with a healthcare provider.")}</li>
              <li>{t("Or enter the provider's ID to initiate a call.")}</li>
              <li>{t("Ensure you have a stable internet connection.")}</li>
              <li>{t("Grant camera and microphone permissions when prompted.")}</li>
            </ul>
          </div>
        </div>
      ) : isIncomingCall ? (
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-2xl text-center space-y-6"
        >
          <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center text-primary mx-auto animate-pulse">
            <User size={48} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-800">{t("Incoming Call")}</h3>
            <p className="text-sm text-slate-500 mt-1">{t("A doctor is requesting a consultation")}</p>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={() => { if (call) call.close(); setIsIncomingCall(false); }}
              className="flex-1 bg-rose-50 text-rose-500 py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 border border-rose-100 active:scale-95 transition-all"
            >
              <PhoneOff size={18} />
              {t("Decline")}
            </button>
            <button 
              onClick={handleAnswer}
              className="flex-1 bg-emerald-500 text-white py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
            >
              <Phone size={18} />
              {t("Accept")}
            </button>
          </div>
        </motion.div>
      ) : (
        <div className="relative h-[500px] bg-slate-900 rounded-[40px] overflow-hidden shadow-2xl border border-slate-800">
          {/* Remote Video */}
          <video 
            ref={remoteVideoRef} 
            autoPlay 
            playsInline 
            className="w-full h-full object-cover"
          />
          
          {/* Local Video (Picture-in-Picture) */}
          <div className="absolute top-6 right-6 w-32 h-44 bg-slate-800 rounded-2xl overflow-hidden border-2 border-white/20 shadow-xl">
            <video 
              ref={localVideoRef} 
              autoPlay 
              playsInline 
              muted 
              className="w-full h-full object-cover"
            />
            {!isVideoEnabled && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
                <VideoOff size={24} className="text-slate-500" />
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="absolute bottom-8 left-0 right-0 flex justify-center items-center gap-4">
            <button 
              onClick={toggleAudio}
              className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center transition-all active:scale-90",
                isAudioEnabled ? "bg-white/10 backdrop-blur-md text-white" : "bg-rose-500 text-white"
              )}
            >
              {isAudioEnabled ? <Mic size={24} /> : <MicOff size={24} />}
            </button>
            
            <button 
              onClick={handleEndCall}
              className="w-16 h-16 bg-rose-500 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-rose-500/40 active:scale-90 transition-all"
            >
              <PhoneOff size={28} />
            </button>

            <button 
              onClick={toggleVideo}
              className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center transition-all active:scale-90",
                isVideoEnabled ? "bg-white/10 backdrop-blur-md text-white" : "bg-rose-500 text-white"
              )}
            >
              {isVideoEnabled ? <Video size={24} /> : <VideoOff size={24} />}
            </button>
          </div>

          {/* Status Overlay */}
          {!remoteStream && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-sm space-y-4">
              <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
              <p className="text-white font-medium">{t("Connecting...")}</p>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
