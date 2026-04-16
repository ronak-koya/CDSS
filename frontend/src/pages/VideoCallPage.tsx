import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Mic, MicOff, Video, VideoOff, PhoneOff, MessageSquare, X,
  Send, Loader2, AlertCircle, User, Clock, Maximize2, Minimize2,
} from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────
interface CallInfo {
  id: string;
  status: string;
  doctorId: string;
  patientId: string;
  scheduledAt: string | null;
  startedAt: string | null;
  personalToken: string;
  doctor:  { id: string; firstName: string; lastName: string; specialty?: string };
  patient: { id: string; firstName: string; lastName: string; mrn: string };
}

interface ChatMsg { senderId: string; message: string; at: number }

// ─── STUN config (Google free servers) ───────────────────────────────────────
const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:5000/ws';

export default function VideoCallPage() {
  const { id: callId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // ── State ──────────────────────────────────────────────────────────────────
  const [callInfo, setCallInfo]         = useState<CallInfo | null>(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [status, setStatus]             = useState<'connecting' | 'waiting' | 'connected' | 'ended'>('connecting');
  const [micOn, setMicOn]               = useState(true);
  const [camOn, setCamOn]               = useState(true);
  const [chatOpen, setChatOpen]         = useState(false);
  const [chatMsg, setChatMsg]           = useState('');
  const [chatLog, setChatLog]           = useState<ChatMsg[]>([]);
  const [pip, setPip]                   = useState(false);           // self-view pip mode
  const [callDuration, setCallDuration] = useState(0);
  const [endNotes, setEndNotes]         = useState('');
  const [showEndModal, setShowEndModal] = useState(false);
  const [ending, setEnding]             = useState(false);

  // ── Refs ───────────────────────────────────────────────────────────────────
  const localVideoRef  = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const wsRef          = useRef<WebSocket | null>(null);
  const pcRef          = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const timerRef       = useRef<ReturnType<typeof setInterval> | null>(null);
  const isCaller       = useRef(false);   // first peer to join is caller
  const chatEndRef     = useRef<HTMLDivElement>(null);

  const isDoctor = user?.role === 'DOCTOR';

  // ── Fetch call info ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!callId) return;
    api.get<CallInfo>(`/calls/${callId}`)
      .then(r => setCallInfo(r.data))
      .catch(() => setError('Unable to load call. It may have expired or you lack access.'))
      .finally(() => setLoading(false));
  }, [callId]);

  // ── Duration timer ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (status === 'connected') {
      timerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [status]);

  // ── Scroll chat to bottom ──────────────────────────────────────────────────
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatLog]);

  // ── Create RTCPeerConnection ───────────────────────────────────────────────
  const createPC = useCallback((ws: WebSocket) => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;

    // Attach local tracks
    localStreamRef.current?.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current!));

    // ICE candidate → relay via WS
    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        ws.send(JSON.stringify({ type: 'call:ice', callId, candidate: candidate.toJSON() }));
      }
    };

    // Remote stream → attach to video element
    pc.ontrack = ({ streams }) => {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = streams[0];
      setStatus('connected');
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        setStatus('waiting');
      }
    };

    return pc;
  }, [callId]);

  // ── Main WebRTC + WS setup ─────────────────────────────────────────────────
  useEffect(() => {
    if (!callInfo) return;

    let mounted = true;

    async function init() {
      // 1. Get local media
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } catch {
        setError('Camera/microphone access denied. Please allow permissions and reload.');
        setLoading(false);
        return;
      }
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      // 2. Connect WebSocket
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'call:join', callId: callInfo.id, token: callInfo.personalToken }));
      };

      ws.onmessage = async (evt) => {
        if (!mounted) return;
        let msg: { type: string; [k: string]: unknown };
        try { msg = JSON.parse(evt.data); } catch { return; }

        switch (msg.type) {
          case 'call:joined': {
            const peerCount = msg.peerCount as number;
            if (peerCount === 0) {
              // First to join — wait for the other peer
              isCaller.current = true;
              setStatus('waiting');
            }
            break;
          }

          case 'call:peer-joined': {
            // The other peer joined — if we are caller, create offer
            if (isCaller.current) {
              const pc = createPC(ws);
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              ws.send(JSON.stringify({ type: 'call:offer', callId, sdp: pc.localDescription }));
            } else {
              setStatus('waiting');
            }
            break;
          }

          case 'call:offer': {
            // We are the answerer
            isCaller.current = false;
            const pc = createPC(ws);
            await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp as RTCSessionDescriptionInit));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            ws.send(JSON.stringify({ type: 'call:answer', callId, sdp: pc.localDescription }));
            break;
          }

          case 'call:answer': {
            await pcRef.current?.setRemoteDescription(new RTCSessionDescription(msg.sdp as RTCSessionDescriptionInit));
            break;
          }

          case 'call:ice': {
            try {
              await pcRef.current?.addIceCandidate(new RTCIceCandidate(msg.candidate as RTCIceCandidateInit));
            } catch { /* ignore stale candidates */ }
            break;
          }

          case 'call:peer-left': {
            setStatus('waiting');
            if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
            break;
          }

          case 'call:chat': {
            setChatLog(prev => [...prev, { senderId: msg.senderId as string, message: msg.message as string, at: Date.now() }]);
            break;
          }

          case 'call:error': {
            setError(msg.message as string);
            break;
          }
        }
      };

      ws.onclose = () => { if (mounted) setStatus('ended'); };
    }

    init();

    return () => {
      mounted = false;
      wsRef.current?.send(JSON.stringify({ type: 'call:leave', callId: callInfo.id }));
      wsRef.current?.close();
      pcRef.current?.close();
      localStreamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [callInfo, callId, createPC]);

  // ── Controls ───────────────────────────────────────────────────────────────
  const toggleMic = () => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) { track.enabled = !track.enabled; setMicOn(track.enabled); }
  };

  const toggleCam = () => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (track) { track.enabled = !track.enabled; setCamOn(track.enabled); }
  };

  const sendChat = () => {
    if (!chatMsg.trim() || !wsRef.current) return;
    wsRef.current.send(JSON.stringify({ type: 'call:chat', callId, message: chatMsg.trim() }));
    setChatLog(prev => [...prev, { senderId: user!.id, message: chatMsg.trim(), at: Date.now() }]);
    setChatMsg('');
  };

  const handleEnd = async () => {
    if (!isDoctor) {
      // Patient just leaves
      wsRef.current?.send(JSON.stringify({ type: 'call:leave', callId }));
      wsRef.current?.close();
      navigate('/portal');
      return;
    }
    setShowEndModal(true);
  };

  const confirmEnd = async () => {
    setEnding(true);
    try {
      await api.patch(`/calls/${callId}/end`, { callNotes: endNotes });
    } catch { /* best effort */ }
    wsRef.current?.send(JSON.stringify({ type: 'call:leave', callId }));
    wsRef.current?.close();
    setStatus('ended');
    setShowEndModal(false);
    navigate(isDoctor ? `/patients/${callInfo?.patientId}` : '/portal');
  };

  const formatDuration = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // ── Loading / error states ─────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <Loader2 size={36} className="animate-spin text-primary-400" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
      <div className="bg-gray-900 rounded-2xl p-8 max-w-md text-center border border-gray-800">
        <AlertCircle size={40} className="text-red-400 mx-auto mb-4" />
        <h2 className="text-white text-xl font-bold mb-2">Unable to join call</h2>
        <p className="text-gray-400 text-sm mb-6">{error}</p>
        <button onClick={() => navigate(-1)} className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-all">
          Go Back
        </button>
      </div>
    </div>
  );

  const peerName = isDoctor
    ? `${callInfo!.patient.firstName} ${callInfo!.patient.lastName}`
    : `Dr. ${callInfo!.doctor.firstName} ${callInfo!.doctor.lastName}`;

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col select-none">

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-3 bg-gray-900/80 backdrop-blur border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs font-bold">
            {peerName[0]}
          </div>
          <div>
            <p className="text-white text-sm font-semibold">{peerName}</p>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-green-400' : 'bg-yellow-400'} ${status !== 'connected' ? 'animate-pulse' : ''}`} />
              <span className="text-xs text-gray-400 capitalize">{status === 'connected' ? 'Live' : status === 'waiting' ? 'Waiting for peer…' : 'Connecting…'}</span>
            </div>
          </div>
        </div>
        {status === 'connected' && (
          <div className="flex items-center gap-2 text-white text-sm bg-gray-800 px-3 py-1.5 rounded-full">
            <Clock size={13} className="text-primary-400" />
            {formatDuration(callDuration)}
          </div>
        )}
        <button onClick={() => setChatOpen(v => !v)} className={`p-2 rounded-lg transition-all ${chatOpen ? 'bg-primary-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}>
          <MessageSquare size={18} />
        </button>
      </div>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden relative">

        {/* Remote video */}
        <div className="flex-1 relative bg-gray-950">
          <video
            ref={remoteVideoRef}
            autoPlay playsInline
            className="w-full h-full object-cover"
          />
          {status !== 'connected' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
              <div className="w-24 h-24 rounded-full bg-gray-800 flex items-center justify-center">
                <User size={40} className="text-gray-500" />
              </div>
              <p className="text-gray-400 text-sm">
                {status === 'waiting' ? `Waiting for ${peerName} to join…` : 'Connecting…'}
              </p>
              <Loader2 size={20} className="animate-spin text-primary-400" />
            </div>
          )}

          {/* Self-view PiP */}
          <div
            className={`absolute transition-all cursor-pointer ${pip ? 'bottom-4 right-4 w-32 h-24' : 'bottom-20 right-4 w-44 h-32'} rounded-xl overflow-hidden border-2 border-gray-700 shadow-2xl bg-gray-900`}
            onClick={() => setPip(v => !v)}
          >
            <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            {!camOn && (
              <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
                <VideoOff size={20} className="text-gray-500" />
              </div>
            )}
            <button className="absolute top-1 right-1 p-0.5 rounded bg-gray-800/80 text-gray-400 hover:text-white">
              {pip ? <Maximize2 size={10} /> : <Minimize2 size={10} />}
            </button>
          </div>
        </div>

        {/* Chat panel */}
        {chatOpen && (
          <div className="w-72 bg-gray-900 border-l border-gray-800 flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
              <p className="text-white text-sm font-semibold">In-Call Chat</p>
              <button onClick={() => setChatOpen(false)} className="text-gray-500 hover:text-white"><X size={16} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {chatLog.map((m, i) => {
                const mine = m.senderId === user!.id;
                return (
                  <div key={i} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm ${mine ? 'bg-primary-600 text-white' : 'bg-gray-800 text-gray-200'}`}>
                      {m.message}
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>
            <div className="p-3 border-t border-gray-800 flex gap-2">
              <input
                value={chatMsg}
                onChange={e => setChatMsg(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendChat()}
                placeholder="Type a message…"
                className="flex-1 bg-gray-800 text-white text-sm px-3 py-2 rounded-lg placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              <button onClick={sendChat} disabled={!chatMsg.trim()} className="p-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-40 text-white rounded-lg transition-all">
                <Send size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Controls bar ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-center gap-4 py-4 bg-gray-900/80 backdrop-blur border-t border-gray-800">
        <button
          onClick={toggleMic}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${micOn ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}`}
          title={micOn ? 'Mute' : 'Unmute'}
        >
          {micOn ? <Mic size={20} /> : <MicOff size={20} />}
        </button>

        <button
          onClick={toggleCam}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${camOn ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}`}
          title={camOn ? 'Camera off' : 'Camera on'}
        >
          {camOn ? <Video size={20} /> : <VideoOff size={20} />}
        </button>

        <button
          onClick={handleEnd}
          className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-lg transition-all"
          title="End call"
        >
          <PhoneOff size={22} />
        </button>
      </div>

      {/* ── End-call modal (doctor only) ──────────────────────────────────── */}
      {showEndModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 w-full max-w-md p-6">
            <h3 className="text-white text-lg font-bold mb-1">End Consultation</h3>
            <p className="text-gray-400 text-sm mb-4">Add post-call notes before ending (optional)</p>
            <textarea
              value={endNotes}
              onChange={e => setEndNotes(e.target.value)}
              placeholder="Clinical notes, follow-up plan, prescriptions discussed…"
              rows={4}
              className="w-full bg-gray-800 text-white text-sm px-3 py-2.5 rounded-lg placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => setShowEndModal(false)} className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-all">
                Cancel
              </button>
              <button onClick={confirmEnd} disabled={ending} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2">
                {ending ? <Loader2 size={14} className="animate-spin" /> : <PhoneOff size={14} />}
                {ending ? 'Ending…' : 'End Call'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
