import React, { useState } from "react";
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Volume2 } from "lucide-react";

export interface CallState {
  isActive: boolean;
  isIncoming: boolean;
  caller: string;
  targetUser: string;
  status: "idle" | "ringing" | "calling" | "connected";
}

interface VideoCallModalProps {
  callState: CallState;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  onAcceptCall: () => void;
  onDeclineCall: () => void;
  onEndCall: () => void;
}

export const VideoCallModal: React.FC<VideoCallModalProps> = ({
  callState,
  localStream,
  remoteStream,
  onAcceptCall,
  onDeclineCall,
  onEndCall,
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  // Toggle Mic
  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  // Toggle Camera
  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = isVideoOff;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  if (callState.status === "idle") return null;

  // 1. INCOMING CALL SCREEN
  if (callState.status === "ringing") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
        <div className="bg-gray-900 border border-purple-500/30 p-8 rounded-3xl max-w-sm w-full text-center shadow-2xl shadow-purple-500/20 flex flex-col items-center gap-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-purple-600/20 border-2 border-purple-500 flex items-center justify-center animate-pulse text-purple-400 font-bold text-2xl">
              {callState.caller.slice(0, 2).toUpperCase()}
            </div>
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
            </span>
          </div>

          <div>
            <h3 className="text-xl font-bold text-white">{callState.caller}</h3>
            <p className="text-sm text-gray-400 mt-1 flex items-center justify-center gap-1.5">
              <Volume2 className="w-4 h-4 animate-bounce text-purple-400" />
              Incoming Video Call...
            </p>
          </div>

          <div className="flex items-center gap-6 mt-2">
            <button
              onClick={onDeclineCall}
              className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-lg shadow-red-600/30 transition transform hover:scale-105 active:scale-95"
              title="Decline"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
            <button
              onClick={onAcceptCall}
              className="w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30 transition transform hover:scale-105 active:scale-95 animate-bounce"
              title="Accept"
            >
              <Phone className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. OUTGOING CALL SCREEN (Calling...)
  if (callState.status === "calling") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
        <div className="bg-gray-900 border border-gray-800 p-8 rounded-3xl max-w-sm w-full text-center shadow-2xl flex flex-col items-center gap-6">
          <div className="w-20 h-20 rounded-full bg-purple-600/20 border-2 border-purple-500 flex items-center justify-center animate-pulse text-purple-400 font-bold text-2xl">
            {callState.targetUser.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Calling {callState.targetUser}...</h3>
            <p className="text-sm text-gray-400 mt-1">Waiting for them to answer...</p>
          </div>
          <button
            onClick={onEndCall}
            className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-lg shadow-red-600/30 transition transform hover:scale-105 active:scale-95"
            title="Cancel Call"
          >
            <PhoneOff className="w-6 h-6" />
          </button>
        </div>
      </div>
    );
  }

  // 3. CONNECTED ACTIVE CALL SCREEN
  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-between p-4 sm:p-6 backdrop-blur-xl">
      {/* Call Header */}
      <div className="w-full max-w-4xl flex items-center justify-between py-2 text-white">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-emerald-500 rounded-full animate-ping"></div>
          <div>
            <h4 className="font-semibold text-sm sm:text-base">
              Connected with {callState.isIncoming ? callState.caller : callState.targetUser}
            </h4>
            <p className="text-xs text-emerald-400">WebRTC Encrypted Peer Connection</p>
          </div>
        </div>
      </div>

      {/* Video Viewports Container */}
      <div className="relative w-full max-w-4xl flex-1 bg-gray-900 rounded-3xl overflow-hidden border border-gray-800 my-4 flex items-center justify-center shadow-2xl">
        {/* Remote Video element - ALWAYS MOUNTED to receive stream instantly */}
        <video
          ref={(el) => {
            if (el && remoteStream && el.srcObject !== remoteStream) {
              el.srcObject = remoteStream;
              el.play().catch(() => {});
            }
          }}
          autoPlay
          playsInline
          className={`w-full h-full object-cover ${remoteStream ? "block" : "hidden"}`}
        />

        {/* Placeholder if remote stream is connecting */}
        {!remoteStream && (
          <div className="flex flex-col items-center gap-3 text-gray-400">
            <div className="w-24 h-24 rounded-full bg-gray-800 flex items-center justify-center text-3xl font-bold text-purple-400 border border-gray-700">
              {(callState.isIncoming ? callState.caller : callState.targetUser)
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <p className="text-sm font-medium">Connecting media stream...</p>
          </div>
        )}

        {/* Local Video (Picture-in-Picture) */}
        <div className="absolute bottom-4 right-4 w-32 sm:w-48 aspect-video bg-gray-950 rounded-2xl overflow-hidden border-2 border-purple-500/50 shadow-xl">
          {localStream && !isVideoOff ? (
            <video
              ref={(el) => {
                if (el && localStream && el.srcObject !== localStream) {
                  el.srcObject = localStream;
                  el.play().catch(() => {});
                }
              }}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform -scale-x-100"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-900 text-gray-400 text-xs">
              Camera Off
            </div>
          )}
          <span className="absolute bottom-1 left-2 text-[10px] bg-black/60 px-1.5 py-0.5 rounded text-white font-mono">
            You
          </span>
        </div>
      </div>

      {/* Control Action Bar */}
      <div className="flex items-center gap-4 bg-gray-900/80 border border-gray-800 px-6 py-3.5 rounded-2xl backdrop-blur-md shadow-2xl">
        {/* Mute Audio */}
        <button
          onClick={toggleMute}
          className={`p-3 rounded-xl transition ${
            isMuted
              ? "bg-red-500/20 text-red-400 border border-red-500/40"
              : "bg-gray-800 hover:bg-gray-700 text-white"
          }`}
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        {/* Toggle Video */}
        <button
          onClick={toggleVideo}
          className={`p-3 rounded-xl transition ${
            isVideoOff
              ? "bg-red-500/20 text-red-400 border border-red-500/40"
              : "bg-gray-800 hover:bg-gray-700 text-white"
          }`}
          title={isVideoOff ? "Turn Video On" : "Turn Video Off"}
        >
          {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
        </button>

        {/* End Call */}
        <button
          onClick={onEndCall}
          className="px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-medium flex items-center gap-2 transition shadow-lg shadow-red-600/30"
          title="End Call"
        >
          <PhoneOff className="w-5 h-5" />
          <span className="text-sm">End Call</span>
        </button>
      </div>
    </div>
  );
};
