'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { createRoom, storeOffer, storeIceCandidate, updateRoomStatus, onAnswersUpdate, onIceCandidatesUpdate, getAnswers, getIceCandidates } from '@/lib/firestore';
import {
  createPeerConnection,
  createOffer,
  addStreamToPeerConnection,
  closePeerConnection,
  setRemoteDescription,
  addICECandidate,
} from '@/lib/webrtc';
import { captureScreen, stopStream } from '@/lib/screenCapture';
import { generateRoomId, formatRoomId } from '@/lib/roomUtils';

export default function HostPage() {
  const [roomName, setRoomName] = useState('');
  const [roomPassword, setRoomPassword] = useState('');
  const [roomId, setRoomId] = useState('');
  const [firebaseRoomId, setFirebaseRoomId] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [viewerCount, setViewerCount] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const unsubscribeAnswersRef = useRef<(() => void) | null>(null);
  const unsubscribeCandidatesRef = useRef<(() => void) | null>(null);
  const answerPollRef = useRef<NodeJS.Timeout | null>(null);
  const candidatePollRef = useRef<NodeJS.Timeout | null>(null);
  const storedOfferIdRef = useRef<string | null>(null);
  const fbRoomIdRef = useRef<string | null>(null);
  const viewerCountPollRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (answerPollRef.current) {
        clearInterval(answerPollRef.current);
      }
      if (candidatePollRef.current) {
        clearInterval(candidatePollRef.current);
      }
      if (viewerCountPollRef.current) {
        clearInterval(viewerCountPollRef.current);
      }
      if (unsubscribeAnswersRef.current) {
        unsubscribeAnswersRef.current();
      }
      if (unsubscribeCandidatesRef.current) {
        unsubscribeCandidatesRef.current();
      }
      if (mediaStreamRef.current) {
        stopStream(mediaStreamRef.current);
      }
      if (peerConnectionRef.current) {
        closePeerConnection(peerConnectionRef.current);
      }
    };
  }, []);

  // Poll for viewer count when sharing
  useEffect(() => {
    if (isSharing && fbRoomIdRef.current && storedOfferIdRef.current) {
      const pollViewerCount = async () => {
        try {
          const answers = await getAnswers(fbRoomIdRef.current!, storedOfferIdRef.current!);
          setViewerCount(answers.length);
          
          // Check if we've reached max viewers
          if (answers.length >= 3) {
            console.log('⚠️ Maximum viewers (3) reached');
          }
        } catch (err) {
          console.error('Error polling viewer count:', err);
        }
      };

      pollViewerCount();
      viewerCountPollRef.current = setInterval(pollViewerCount, 1000);

      return () => {
        if (viewerCountPollRef.current) {
          clearInterval(viewerCountPollRef.current);
        }
      };
    }
  }, [isSharing]);

  const handleStartSharing = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      // Validate inputs
      if (!roomName.trim()) {
        throw new Error('Room name is required');
      }
      if (!roomPassword.trim()) {
        throw new Error('Room password is required');
      }
      if (roomPassword.length < 4) {
        throw new Error('Password must be at least 4 characters');
      }

      // Generate 4-digit room ID
      const generatedRoomId = generateRoomId();
      console.log('Generated Room ID:', generatedRoomId);

      // Save room to Firebase
      const fbRoomId = await createRoom(roomName, roomPassword, generatedRoomId);
      console.log('Room created in Firebase:', fbRoomId);

      // Capture screen
      console.log('Requesting screen capture...');
      const screenStream = await captureScreen({
        audio: false,
      });

      mediaStreamRef.current = screenStream;

      // Display screen in video element
      if (videoRef.current) {
        videoRef.current.srcObject = screenStream;
      }

      // Create WebRTC peer connection
      peerConnectionRef.current = createPeerConnection();

      // Create and store WebRTC offer BEFORE setting custom handlers
      // This is important because we need storedOfferId before ICE candidates are generated
      addStreamToPeerConnection(peerConnectionRef.current, screenStream);
      
      const offer = await createOffer(peerConnectionRef.current);
      console.log('Offer created:', offer);

      const storedOfferId = await storeOffer(fbRoomId, offer);
      console.log('Offer stored in Firebase:', storedOfferId);
      
      // Now store IDs in refs for the handler to use
      fbRoomIdRef.current = fbRoomId;
      storedOfferIdRef.current = storedOfferId;

      // Set up ICE candidate listener with access to IDs via refs
      if (peerConnectionRef.current) {
        peerConnectionRef.current.onicecandidate = async (event) => {
          if (event.candidate && fbRoomIdRef.current && storedOfferIdRef.current) {
            console.log('🧊 Storing HOST ICE candidate:', event.candidate.candidate.substring(0, 40) + '...');
            try {
              await storeIceCandidate(fbRoomIdRef.current, storedOfferIdRef.current, event.candidate, true);
            } catch (err) {
              console.error('Error storing ICE candidate:', err);
            }
          }
        };
      }

      // Listen for viewer's answer
      let answerSet = false; // Define here so listener can access it
      
      const unsubscribeAnswers = onAnswersUpdate(fbRoomId, storedOfferId, async (answers) => {
        console.log('📡 Answer listener fired! Answers:', answers.length);
        if (answers.length > 0 && !answerSet && peerConnectionRef.current) {
          // SET FLAG IMMEDIATELY to prevent poll from also trying
          answerSet = true;
          
          const answer = answers[0];
          const answerSDP = new RTCSessionDescription({
            type: 'answer' as RTCSdpType,
            sdp: answer.sdp,
          });

          try {
            await setRemoteDescription(peerConnectionRef.current, answerSDP);
            console.log('✅ Viewer answer set as remote description (from listener)');
          } catch (err) {
            console.error('Error setting remote description:', err);
            answerSet = false; // Reset so poll can try if listener fails
          }
        }
      });

      unsubscribeAnswersRef.current = unsubscribeAnswers;

      // Also poll for answers very frequently (every 300ms for 2 minutes)
      // answerSet already defined above for listener
      let pollCount = 0;
      
      // FIRST: Do an immediate check for existing answers
      console.log('🔍 IMMEDIATE CHECK: Looking for existing answers...');
      console.log(`📍 HOST: Using fbRoomId="${fbRoomId}", storedOfferId="${storedOfferId}"`);
      try {
        const immediateAnswers = await getAnswers(fbRoomId, storedOfferId);
        console.log(`<...ℹ️ IMMEDIATE: Found ${immediateAnswers.length} answers`);
        if (immediateAnswers.length > 0 && peerConnectionRef.current) {
          const answer = immediateAnswers[0];
          console.log('✅ IMMEDIATE: Found answer! Setting remote description...');
          const answerSDP = new RTCSessionDescription({
            type: 'answer' as RTCSdpType,
            sdp: answer.sdp,
          });
          try {
            await setRemoteDescription(peerConnectionRef.current, answerSDP);
            console.log('✅ IMMEDIATE: Viewer answer SET!');
            answerSet = true;
          } catch (err) {
            console.error('IMMEDIATE: Error setting answer:', err);
          }
        }
      } catch (err) {
        console.error('IMMEDIATE: Error in immediate check:', err);
      }
      
      const answerPollInterval = setInterval(async () => {
        if (answerSet || pollCount >= 400) {
          clearInterval(answerPollInterval);
          console.log(`🛑 Answer polling stopped: answerSet=${answerSet}, pollCount=${pollCount}`);
          return;
        }
        pollCount++;
        if (pollCount % 10 === 0) {
          console.log(`🔍 Poll iteration #${pollCount}...`);
        }

        try {
          const answers = await getAnswers(fbRoomId, storedOfferId);
          console.log(`🔍 Poll #${pollCount}: getAnswers returned ${answers.length} items`);
          
          if (answers.length > 0 && !answerSet && peerConnectionRef.current) {
            const answer = answers[0];
            console.log('🔍 Poll #' + pollCount + ' found answer! Setting remote description...');
            const answerSDP = new RTCSessionDescription({
              type: 'answer' as RTCSdpType,
              sdp: answer.sdp,
            });

            try {
              await setRemoteDescription(peerConnectionRef.current, answerSDP);
              console.log('✅ Poll #' + pollCount + ': Viewer answer SET!');
              answerSet = true;
              clearInterval(answerPollInterval);
            } catch (err) {
              console.error('Poll #' + pollCount + ' Error setting answer:', err);
            }
          }
        } catch (err) {
          console.error('Poll #' + pollCount + ' error:', err);
        }
      }, 300);

      answerPollRef.current = answerPollInterval;

      // Listen for viewer's ICE candidates
      const unsubscribeCandidates = onIceCandidatesUpdate(
        fbRoomId,
        storedOfferId,
        false, // Viewer candidates
        async (candidates) => {
          console.log('📡 ICE candidate listener fired! Candidates:', candidates.length);
          if (peerConnectionRef.current) {
            for (const candidate of candidates) {
              try {
                await addICECandidate(peerConnectionRef.current, candidate);
                console.log('✅ Added viewer ICE candidate (from listener)');
              } catch (err) {
                console.error('Error adding viewer ICE candidate:', err);
              }
            }
          }
        }
      );

      unsubscribeCandidatesRef.current = unsubscribeCandidates;

      // Also poll for viewer ICE candidates very frequently (every 200ms)
      let candidatesAdded = new Set<string>();
      let lastCandidateCount = 0;
      const candidatePollInterval = setInterval(async () => {
        try {
          const candidates = await getIceCandidates(fbRoomId, storedOfferId, false);
          if (candidates.length > lastCandidateCount) {
            console.log(`🔍 Poll found ${candidates.length} viewer ICE candidates (was ${lastCandidateCount})`);
            lastCandidateCount = candidates.length;
          }
          
          if (candidates.length > 0 && peerConnectionRef.current) {
            for (const candidate of candidates) {
              const candidateKey = candidate.candidate || '';
              if (candidateKey && !candidatesAdded.has(candidateKey)) {
                try {
                  await addICECandidate(peerConnectionRef.current, candidate);
                  candidatesAdded.add(candidateKey);
                  console.log('✅ Added viewer ICE candidate (from poll)');
                } catch (err) {
                  // Ignore errors for candidates that might already be added
                }
              }
            }
          }
        } catch (err) {
          console.error('Error polling for viewer ICE candidates:', err);
        }
      }, 200);

      candidatePollRef.current = candidatePollInterval;

      console.log(`🚀 WebRTC setup complete for room ${fbRoomId}, offer ${storedOfferId}`);
      console.log(`   - Answer listener: ACTIVE`);
      console.log(`   - ICE candidate listener: ACTIVE`);
      console.log(`   - Poll interval: 300ms for answers, 200ms for ICE`);
      
      // Set UI state
      setRoomId(generatedRoomId);
      setFirebaseRoomId(fbRoomId);
      setIsSharing(true);
      setSuccessMessage(`Room created! ID: ${formatRoomId(generatedRoomId)}`);

      // Handle screen sharing stop
      screenStream.getVideoTracks()[0].onended = () => {
        handleStopSharing();
      };
    } catch (err) {
      console.error('Error starting sharing:', err);
      setError(err instanceof Error ? err.message : 'Failed to start sharing');
      setIsSharing(false);

      // Cleanup on error
      if (mediaStreamRef.current) {
        stopStream(mediaStreamRef.current);
        mediaStreamRef.current = null;
      }
      if (peerConnectionRef.current) {
        closePeerConnection(peerConnectionRef.current);
        peerConnectionRef.current = null;
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopSharing = async () => {
    console.log('🛑 Stopping sharing...');
    
    // Clear polling intervals
    if (answerPollRef.current) {
      clearInterval(answerPollRef.current);
      answerPollRef.current = null;
    }
    if (candidatePollRef.current) {
      clearInterval(candidatePollRef.current);
      candidatePollRef.current = null;
    }

    // Unsubscribe from listeners
    if (unsubscribeAnswersRef.current) {
      unsubscribeAnswersRef.current();
      unsubscribeAnswersRef.current = null;
    }
    if (unsubscribeCandidatesRef.current) {
      unsubscribeCandidatesRef.current();
      unsubscribeCandidatesRef.current = null;
    }

    // Mark room as inactive
    if (firebaseRoomId) {
      try {
        await updateRoomStatus(firebaseRoomId, false);
        console.log('✅ Room marked as inactive');
      } catch (err) {
        console.error('❌ Error marking room as inactive:', err);
      }
    }

    if (mediaStreamRef.current) {
      console.log('🛑 Stopping media stream...');
      stopStream(mediaStreamRef.current);
      mediaStreamRef.current = null;
    }
    
    if (peerConnectionRef.current) {
      console.log('🛑 Closing peer connection...');
      closePeerConnection(peerConnectionRef.current);
      peerConnectionRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsSharing(false);
    setRoomId('');
    setFirebaseRoomId('');
    setRoomName('');
    setRoomPassword('');
    setSuccessMessage('');
  };

  return (
    <main className="min-h-screen w-full bg-white flex items-stretch justify-stretch overflow-hidden">
      {isSharing ? (
        // Broadcasting View - Full Width
        <div className="w-full flex flex-col bg-white">
          {/* Top Navigation */}
          <div className="bg-white border-b border-slate-200 px-8 py-4">
            <div className="flex items-center justify-between max-w-7xl mx-auto">
              <Link href="/">
                <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
                  <div className="text-2xl">🌐</div>
                  <span className="text-xl font-bold text-slate-900">Sutra</span>
                </div>
              </Link>
              <button
                onClick={handleStopSharing}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-all duration-300 transform hover:shadow-lg active:scale-95 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Stop Sharing
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col lg:flex-row gap-8 p-6 md:p-8 lg:p-12 overflow-y-auto">
            {/* Left: Session Info */}
            <div className="lg:w-1/3 flex flex-col gap-6">
              {/* Room Info Cards */}
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-slate-900">Session Details</h2>
                
                {/* Room ID Card */}
                <div className="rounded-2xl bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                  <p className="text-indigo-700 text-sm font-semibold mb-2">Share Code</p>
                  <p className="text-4xl font-bold text-indigo-900 font-mono mb-3">{formatRoomId(roomId)}</p>
                  <p className="text-indigo-600 text-sm">Share this code with viewers</p>
                </div>

                {/* Room Name Card */}
                <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm">
                  <p className="text-slate-700 text-sm font-semibold mb-2">Session Name</p>
                  <p className="text-xl font-semibold text-slate-900">{roomName}</p>
                </div>

                {/* Viewer Count Card */}
                <div className="rounded-2xl bg-gradient-to-br from-teal-50 to-teal-100 border border-teal-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                  <p className="text-teal-700 text-sm font-semibold mb-2">Viewers Connected</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-4xl font-bold text-teal-900">{viewerCount}</p>
                    <p className="text-lg text-teal-700 font-semibold">/ 3</p>
                  </div>
                  <p className="text-teal-600 text-sm mt-2">Maximum capacity: 3 viewers</p>
                </div>

                {/* Status Card */}
                <div className="rounded-2xl bg-gradient-to-br from-green-50 to-green-100 border border-green-200 p-6 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <div>
                      <p className="text-green-700 text-sm font-semibold">Status</p>
                      <p className="text-lg font-bold text-green-900">🟢 Live Broadcasting</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Info Box */}
              {successMessage && (
                <div className="rounded-2xl bg-green-50 border border-green-200 p-4">
                  <p className="text-green-700 font-medium text-sm">✅ {successMessage}</p>
                </div>
              )}
              {error && (
                <div className="rounded-2xl bg-red-50 border border-red-200 p-4">
                  <p className="text-red-700 font-medium text-sm">❌ {error}</p>
                </div>
              )}
            </div>

            {/* Right: Video Preview */}
            <div className="lg:w-2/3 flex flex-col gap-4">
              <h2 className="text-2xl font-bold text-gray-900">Screen Preview</h2>
              <div className="flex-1 rounded-2xl bg-black border-2 border-gray-300 overflow-hidden shadow-lg min-h-96">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Setup Form - Premium SaaS Design
        <div className="w-full flex relative min-h-screen bg-gradient-to-br from-indigo-50 via-slate-50 to-slate-100 overflow-hidden">
          {/* Top Left Branding - Fixed */}
          <div className="absolute top-0 left-0 z-30 p-6 lg:p-8">
            <h1 className="text-3xl lg:text-4xl font-bold text-gray-900">Sutra</h1>
            <p className="text-gray-600 text-xs mt-1 font-medium">Simple. Fast. Connected.</p>
          </div>

          {/* Left Section - Lottie Animation & Back Button */}
          <div className="hidden lg:flex lg:w-1/2 items-end justify-center pb-10 p-8 relative overflow-hidden">
            {/* Gradient Background Elements */}
            <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob"></div>
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-teal-200 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000"></div>
            
            {/* Back Button - Circular, Positioned Absolutely in Middle-Left */}
            <Link href="/" className="absolute left-8 top-1/2 transform -translate-y-1/2 z-20">
              <button className="relative w-16 h-16 rounded-full bg-white/70 hover:bg-white/90 backdrop-blur border border-white/40 hover:border-white/60 shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group">
                {/* Back Arrow Icon */}
                <svg className="w-7 h-7 text-slate-700 group-hover:text-slate-900 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            </Link>

            {/* Lottie Animation - Positioned Lower with Depth */}
            <div className="relative z-10 drop-shadow-2xl">
              {/* @ts-expect-error - dotlottie-wc is a custom web component */}
              <dotlottie-wc 
                src="https://lottie.host/c86ae78f-d85e-4950-af23-2db31490a44e/LF9trv6RtB.lottie" 
                style={{ width: '480px', height: '480px' }}
                autoplay
                loop
              />
            </div>
          </div>

          {/* Right Section - Form Card - Increased Width */}
          <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-4 md:p-6 lg:p-8 relative h-screen overflow-y-auto lg:overflow-hidden">
            {/* Top Left Branding - Mobile Only */}
            <div className="absolute top-0 left-0 z-20 p-6 lg:hidden">
              <h1 className="text-3xl font-bold text-gray-900">Sutra</h1>
              <p className="text-gray-600 text-xs mt-1">Simple. Fast. Connected.</p>
            </div>

            {/* Decorative Orbs - Right Section */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute -top-40 -right-40 w-80 h-80 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob"></div>
              <div className="absolute -bottom-40 right-40 w-80 h-80 bg-teal-200 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-4000"></div>
            </div>

            {/* Form Container - Wider */}
            <div className="w-full max-w-2xl relative z-10 mt-16 lg:mt-0 flex flex-col max-h-screen lg:max-h-full overflow-y-auto lg:overflow-visible">
              {/* Glassmorphism Card */}
              <div className="backdrop-blur-xl bg-white/75 border border-white/30 shadow-2xl rounded-3xl p-8 md:p-12 lg:p-14 space-y-8 hover:shadow-3xl transition-all duration-500">
                {/* Header */}
                <div>
                  <h2 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-slate-900 to-slate-800 bg-clip-text text-transparent mb-3">
                    Start Hosting
                  </h2>
                  <p className="text-base text-slate-600 font-medium">
                    Set up your screen sharing session
                  </p>
                </div>

                <form onSubmit={handleStartSharing} className="space-y-7">
                  {/* Error Message */}
                  {error && (
                    <div className="rounded-2xl bg-red-50/80 backdrop-blur border border-red-200/50 p-4 animate-pulse">
                      <p className="text-red-700 font-medium text-sm flex items-center gap-2">
                        <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                        </svg>
                        {error}
                      </p>
                    </div>
                  )}

                  {/* Room Name Input */}
                  <div className="space-y-2.5">
                    <label className="block text-sm font-semibold text-slate-700">
                      <span className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Room Name
                      </span>
                    </label>
                    <input
                      type="text"
                      value={roomName}
                      onChange={(e) => setRoomName(e.target.value)}
                      placeholder="e.g., Gaming Session, Team Meeting"
                      disabled={isLoading}
                      className="w-full px-6 py-4 bg-white/60 backdrop-blur border-1.5 border-slate-200/60 rounded-xl text-base text-slate-900 placeholder-slate-400 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-300 focus:bg-white/95 hover:bg-white/80 hover:border-slate-300/60 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                    />
                    <p className="text-xs text-slate-500">Choose a descriptive name for your session</p>
                  </div>

                  {/* Password Input */}
                  <div className="space-y-2.5">
                    <label className="block text-sm font-semibold text-slate-700">
                      <span className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        Password
                      </span>
                    </label>
                    <input
                      type="password"
                      value={roomPassword}
                      onChange={(e) => setRoomPassword(e.target.value)}
                      placeholder="Enter a strong password (min. 4 characters)"
                      disabled={isLoading}
                      className="w-full px-6 py-4 bg-white/60 backdrop-blur border-1.5 border-slate-200/60 rounded-xl text-base text-slate-900 placeholder-slate-400 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-300 focus:bg-white/95 hover:bg-white/80 hover:border-slate-300/60 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                    />
                    <p className="text-xs text-slate-500">Viewers will need this to join your session</p>
                  </div>

                  {/* Info Box - Auto-generated Code */}
                  <div className="rounded-2xl bg-gradient-to-r from-indigo-50/80 to-slate-50 backdrop-blur border border-indigo-100/50 p-5 shadow-sm">
                    <p className="text-slate-700 font-medium text-sm text-center flex items-center justify-center gap-2">
                      <svg className="w-5 h-5 text-indigo-600 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                      A unique 4-digit code will be generated automatically
                    </p>
                  </div>

                  {/* Highlighted Text - No Account Needed */}
                  <p className="text-slate-700 font-medium text-sm text-center flex items-center justify-center gap-2 mt-2">
                    <svg className="w-5 h-5 text-indigo-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                    <span className="font-semibold text-indigo-600">No account needed</span>. Your session expires when you stop sharing.
                  </p>

                  {/* Submit Button - Premium Indigo Gradient */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-5 bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 hover:from-indigo-700 hover:via-indigo-600 hover:to-indigo-700 disabled:from-slate-300 disabled:to-slate-400 text-white font-bold text-lg rounded-xl transition-all duration-500 transform hover:shadow-xl hover:shadow-indigo-500/25 hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:scale-100 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-white/50"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Setting up...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                        Start Sharing
                      </span>
                    )}
                  </button>

                  {/* Success Message */}
                  {successMessage && (
                    <div className="rounded-2xl bg-teal-50/80 backdrop-blur border border-teal-200/50 p-4 shadow-sm animate-pulse">
                      <p className="text-teal-700 font-medium text-sm text-center flex items-center justify-center gap-2">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                        </svg>
                        {successMessage}
                      </p>
                    </div>
                  )}
                </form>

                {/* Back Button - Mobile Only (Circular) */}
                <Link href="/">
                  <button className="w-full py-3 flex items-center justify-center text-slate-600 hover:text-slate-900 font-semibold text-base transition-all duration-300 hover:bg-white/50 rounded-lg lg:hidden">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Home
                  </button>
                </Link>

              {/* Footer Section - Copyright Only */}
              <div className="text-center space-y-2 px-4 py-6">
                {/* Copyright Footer */}
                <p className="text-xs text-slate-500">
                  © 2026 Sutra. Made by <span className="font-semibold text-slate-600">INDUcodes</span>
                </p>
              </div>
            </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
