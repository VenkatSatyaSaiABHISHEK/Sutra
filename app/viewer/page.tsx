'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { getActiveRooms, getRoom, getOffers, getAnswers, storeAnswer, onIceCandidatesUpdate, storeIceCandidate, getIceCandidates } from '@/lib/firestore';
import {
  createPeerConnection,
  createAnswer,
  setRemoteDescription,
  addICECandidate,
  closePeerConnection,
} from '@/lib/webrtc';
import { Room } from '@/lib/firestore';
import {
  getRecentRooms,
  sortRoomsByNewest,
  searchRoomsByName,
  getRoomAge,
} from '@/lib/roomDiscovery';
import {
  requestBluetoothDevice,
  extractRoomIdFromDevice,
} from '@/lib/bluetooth';
import { ArrowLeft, Keyboard, Wifi, Bluetooth, Eye, Lock, Search } from 'lucide-react';

type TabType = 'code' | 'nearby' | 'bluetooth';

export default function ViewerPage() {
  const [activeTab, setActiveTab] = useState<TabType>('code');
  const [roomId, setRoomId] = useState('');
  const [roomPassword, setRoomPassword] = useState('');
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
  const [filteredRooms, setFilteredRooms] = useState<Room[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [connectedRoom, setConnectedRoom] = useState<Room | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [bluetoothError, setBluetoothError] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const hostCandidatePollRef = useRef<NodeJS.Timeout | null>(null);
  const roomIdRefDual = useRef<string>('');
  const offerIdRef = useRef<string>('');
  const remoteStreamRef = useRef<MediaStream | null>(null);

  // Mount check for hydration
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch available rooms on mount
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const rooms = await getActiveRooms();
        setAvailableRooms(rooms);
        setFilteredRooms(getRecentRooms(sortRoomsByNewest(rooms)));
      } catch (err) {
        console.error('Error fetching rooms:', err);
      } finally {
        setIsLoadingRooms(false);
      }
    };

    fetchRooms();
  }, []);

  // Update filtered rooms when search query changes
  useEffect(() => {
    if (searchQuery.trim()) {
      setFilteredRooms(searchRoomsByName(availableRooms, searchQuery));
    } else {
      setFilteredRooms(getRecentRooms(sortRoomsByNewest(availableRooms)));
    }
  }, [searchQuery, availableRooms]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (hostCandidatePollRef.current) {
        clearInterval(hostCandidatePollRef.current);
      }
      if (peerConnectionRef.current) {
        closePeerConnection(peerConnectionRef.current);
      }
    };
  }, []);

  // When component is connected and video element is mounted, set the remote stream
  useEffect(() => {
    if (isConnected && videoRef.current && remoteStreamRef.current) {
      console.log('📺 🔄 useEffect: Setting remote stream on video element');
      videoRef.current.srcObject = remoteStreamRef.current;
      
      videoRef.current
        .play()
        .then(() => {
          console.log('📺 ✅ useEffect: Video playing successfully');
        })
        .catch((err) => {
          console.error('📺 ❌ useEffect: Error playing video:', err);
        });
    }
  }, [isConnected]);

  const handleSelectRoom = (room: Room) => {
    setRoomId(room.hostId || room.id || '');
    setError('');
    setSuccessMessage('');
    setActiveTab('code');
  };

  const handleBluetoothScan = async () => {
    setBluetoothError('');
    setIsScanning(true);

    try {
      const device = await requestBluetoothDevice();

      if (!device) {
        setBluetoothError('No device selected');
        setIsScanning(false);
        return;
      }

      console.log('Scanned device:', device);

      // Extract room ID from device name
      const extractedRoomId = extractRoomIdFromDevice(device.name);

      if (extractedRoomId) {
        setRoomId(extractedRoomId);
        setSuccessMessage(`Found room: ${device.name}`);
        setActiveTab('code');
      } else {
        setBluetoothError(`Could not extract room ID from device: ${device.name}`);
      }
    } catch (err: any) {
      console.error('Bluetooth scan error:', err);
      if (err.name === 'NotFoundError') {
        setBluetoothError('No Bluetooth devices found');
      } else if (err.name === 'NotAllowedError') {
        setBluetoothError('Bluetooth permission denied');
      } else {
        setBluetoothError(err.message || 'Bluetooth scan failed');
      }
    } finally {
      setIsScanning(false);
    }
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsConnecting(true);

    try {
      // Validate inputs
      if (!roomId.trim()) {
        throw new Error('Room ID is required');
      }
      if (!roomPassword.trim()) {
        throw new Error('Room password is required');
      }

      console.log('Connecting to room:', roomId);

      // Find room by hostId or roomId in Firebase
      let room: Room | null = null;
      for (const r of availableRooms) {
        if (r.hostId === roomId || r.id === roomId) {
          room = r;
          break;
        }
      }

      if (!room) {
        // Try fetching from Firebase directly
        try {
          room = await getRoom(roomId);
        } catch (err) {
          console.log('Room not found by direct fetch');
        }
      }

      if (!room) {
        throw new Error('Room not found');
      }

      // Verify password
      if (room.password !== roomPassword) {
        throw new Error('Incorrect password');
      }

      console.log('Room verified:', room);
      setConnectedRoom(room);

      // Get offers from Firebase
      console.log(`📍 VIEWER: Looking for offers in room.id="${room.id}" (or roomId="${roomId}")`);
      const offers = await getOffers(room.id || roomId);
      console.log('Offers retrieved:', offers);

      if (offers.length === 0) {
        throw new Error('No offers found in this room');
      }

      const offer = offers[0]; // Get the first offer

      // CHECK 3-VIEWER LIMIT
      console.log('👥 Checking viewer limit...');
      const existingAnswers = await getAnswers(room.id || roomId, offer.id);
      console.log(`👥 Current viewers: ${existingAnswers.length} / 3`);
      
      if (existingAnswers.length >= 3) {
        throw new Error('❌ Room is full! Maximum 3 viewers allowed. Please try another room.');
      }

      const offerSDP = new RTCSessionDescription({
        type: 'offer' as RTCSdpType,
        sdp: offer.sdp,
      });



      // Create peer connection
      peerConnectionRef.current = createPeerConnection();

      // Store IDs in refs immediately so ICE handler can access them
      roomIdRefDual.current = room.id || roomId;
      offerIdRef.current = offer.id;

      // Set up event handlers BEFORE setting remote description or creating answer
      peerConnectionRef.current.ontrack = (event) => {
        console.log('📺 Remote track received:', event.track.kind, 'Streams:', event.streams?.length);
        console.log('📺 videoRef.current exists?', !!videoRef.current);
        
        if (event.streams && event.streams.length > 0) {
          console.log('📺 Streams available, count:', event.streams.length);
          
          // Store the stream for later use
          remoteStreamRef.current = event.streams[0];
          console.log('📺 📦 Stored remoteStream in ref:', remoteStreamRef.current.id);
          
          // Try to set it immediately if video ref exists
          if (videoRef.current) {
            console.log('📺 ✅ Video element already available, setting source immediately');
            videoRef.current.srcObject = event.streams[0];
            
            videoRef.current
              .play()
              .then(() => {
                console.log('📺 ✅ Video playing successfully');
              })
              .catch((err) => {
                console.error('📺 ❌ Error playing video:', err);
                setTimeout(() => {
                  videoRef.current?.play().catch((e) => console.error('Retry failed:', e));
                }, 100);
              });
          } else {
            console.log('📺 ⏳ Video element not ready yet, stored in ref for later');
          }
        }
      };

      peerConnectionRef.current.onconnectionstatechange = () => {
        console.log('Peer connection state:', peerConnectionRef.current?.connectionState);
        
        // Auto-disconnect if connection fails or is disconnected
        if (peerConnectionRef.current?.connectionState === 'failed' || 
            peerConnectionRef.current?.connectionState === 'disconnected' ||
            peerConnectionRef.current?.connectionState === 'closed') {
          console.log('❌ Connection lost. Auto-disconnecting...');
          setTimeout(() => handleDisconnect(), 500);
        }
      };

      // Set up ICE candidate handler BEFORE creating answer to capture all candidates
      if (peerConnectionRef.current) {
        peerConnectionRef.current.onicecandidate = async (event) => {
          if (event.candidate && roomIdRefDual.current && offerIdRef.current) {
            console.log('🧊 Storing VIEWER ICE candidate:', event.candidate.candidate.substring(0, 40) + '...');
            try {
              await storeIceCandidate(roomIdRefDual.current, offerIdRef.current, event.candidate, false);
            } catch (err) {
              console.error('Error storing viewer ICE candidate:', err);
            }
          }
        };
      }

      // Set remote description (offer from host)
      await setRemoteDescription(peerConnectionRef.current, offerSDP);

      // Create answer
      const answer = await createAnswer(peerConnectionRef.current);
      console.log('Answer created:', answer);

      // Store answer in Firebase
      console.log(`📍 VIEWER: About to store answer with room.id="${room.id}", roomId="${roomId}", offer.id="${offer.id}"`);
      await storeAnswer(room.id || roomId, offer.id, answer);
      console.log('Answer stored in Firebase');

      // Subscribe to host's ICE candidates and add them
      const unsubscribeHostCandidates = onIceCandidatesUpdate(
        room.id || roomId,
        offer.id,
        true, // Host candidates
        async (candidates) => {
          console.log('📡 Host ICE candidate listener fired! Candidates:', candidates.length);
          if (peerConnectionRef.current) {
            for (const candidate of candidates) {
              try {
                await addICECandidate(peerConnectionRef.current, candidate);
                console.log('✅ Added host ICE candidate (from listener)');
              } catch (err) {
                console.error('Error adding host ICE candidate:', err);
              }
            }
          }
        }
      );

      // Store unsubscribe function for cleanup
      unsubscribeRef.current = unsubscribeHostCandidates;

      // Also poll for host's ICE candidates very frequently (every 200ms)
      let hostCandidatesAdded = new Set<string>();
      let lastHostCandidateCount = 0;
      const hostCandidatePollInterval = setInterval(async () => {
        try {
          const candidates = await getIceCandidates(room.id || roomId, offer.id, true);
          if (candidates.length > lastHostCandidateCount) {
            console.log(`🔍 Poll found ${candidates.length} host ICE candidates (was ${lastHostCandidateCount})`);
            lastHostCandidateCount = candidates.length;
          }
          
          if (candidates.length > 0 && peerConnectionRef.current) {
            for (const candidate of candidates) {
              const candidateKey = candidate.candidate || '';
              if (candidateKey && !hostCandidatesAdded.has(candidateKey)) {
                try {
                  await addICECandidate(peerConnectionRef.current, candidate);
                  hostCandidatesAdded.add(candidateKey);
                  console.log('✅ Added host ICE candidate (from poll)');
                } catch (err) {
                  // Ignore errors
                }
              }
            }
          }
        } catch (err) {
          console.error('Error polling for host ICE candidates:', err);
        }
      }, 200);

      hostCandidatePollRef.current = hostCandidatePollInterval;

      console.log(`🚀 WebRTC answer setup complete`);
      console.log(`   - Host ICE listener: ACTIVE`);
      console.log(`   - Poll interval: 200ms for host ICE`);

      setIsConnected(true);
      setSuccessMessage('Connected to room! Receiving video...');

      // Monitor connection state
      let connectionCheckCount = 0;
      const connectionCheck = setInterval(() => {
        if (peerConnectionRef.current) {
          console.log('Connection state:', peerConnectionRef.current.connectionState);
          connectionCheckCount++;

          if (peerConnectionRef.current.connectionState === 'failed') {
            clearInterval(connectionCheck);
            handleDisconnect();
            setError('Connection failed. Please try again.');
          }

          if (connectionCheckCount > 60) {
            // Stop checking after 60 seconds
            clearInterval(connectionCheck);
          }
        }
      }, 1000);
    } catch (err) {
      console.error('Error connecting to room:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect to room');
      setIsConnected(false);

      // Cleanup on error
      if (peerConnectionRef.current) {
        closePeerConnection(peerConnectionRef.current);
        peerConnectionRef.current = null;
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    // Clear polling interval
    if (hostCandidatePollRef.current) {
      clearInterval(hostCandidatePollRef.current);
      hostCandidatePollRef.current = null;
    }

    // Unsubscribe from ICE candidate updates
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    if (peerConnectionRef.current) {
      closePeerConnection(peerConnectionRef.current);
      peerConnectionRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsConnected(false);
    setRoomId('');
    setRoomPassword('');
    setConnectedRoom(null);
    setSuccessMessage('');
  };

  return (
    <main className="h-screen w-screen overflow-hidden fixed inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center">
      {isConnected && connectedRoom ? (
        // Viewing Mode - Full Screen Video
        <div className="w-screen h-screen flex flex-col bg-black overflow-hidden">
          {/* Header - Compact */}
          <div className="bg-gradient-to-r from-gray-900 to-black bg-opacity-95 backdrop-blur border-b border-gray-700 px-4 py-2 flex items-center justify-between flex-shrink-0">
            <div className="flex-1">
              <h2 className="text-lg font-bold text-white">
                {connectedRoom.name}
              </h2>
              <p className="text-xs text-gray-400">Room ID: {connectedRoom.hostId}</p>
            </div>
            <button
              onClick={handleDisconnect}
              className="px-4 py-1.5 ml-4 bg-red-600 hover:bg-red-700 text-white font-semibold text-sm rounded-lg transition-all duration-300 transform hover:shadow-lg active:scale-95"
            >
              Leave
            </button>
          </div>

          {/* Video Container - Full Screen */}
          <div className="flex-1 flex items-center justify-center bg-black overflow-hidden relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-contain"
            />
            
            {/* Success Notification Overlay */}
            {successMessage && (
              <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-green-500/90 text-white px-4 py-2 rounded-lg text-sm font-medium animate-slide-down">
                {successMessage}
              </div>
            )}
          </div>
        </div>
      ) : (
        // Connection Form - Premium Minimal Design
        <div className="relative w-full h-screen flex items-center justify-center overflow-hidden" suppressHydrationWarning>
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-50 z-0" />
          {/* Lottie Animation - Right Side */}
          {isMounted && (
            <div className="fixed bottom-0 right-0 w-96 h-96 z-0 pointer-events-none opacity-90">
              <DotLottieReact
                src="https://lottie.host/564e3edc-1760-48ae-867b-54533e5da870/nuiJ0NeAyg.lottie"
                loop
                autoplay
                style={{ width: '100%', height: '100%' }}
              />
            </div>
          )}

          {/* Back Button - Left Side */}
          <Link href="/" className="absolute left-4 md:left-8 top-1/2 transform -translate-y-1/2 z-10 hidden md:block">
            <button className="w-14 h-14 rounded-full bg-white/80 backdrop-blur-md border border-white/40 shadow-lg hover:shadow-xl hover:bg-white/90 flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95">
              <ArrowLeft size={24} className="text-slate-900" />
            </button>
          </Link>

          {/* Main Card */}
          <div className="w-full max-w-[520px] animate-fade-in z-50 relative">
            <div className="rounded-[20px] bg-white/95 backdrop-blur-md border border-white/40 shadow-2xl p-8 space-y-6">
              {/* Header Section */}
              <div className="text-center space-y-3">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 shadow-lg mb-2">
                  <Eye size={32} className="text-indigo-600" />
                </div>
                <h1 className="text-4xl font-bold text-slate-900 tracking-tight">
                  Join Session
                </h1>
                <p className="text-slate-600 text-base">
                  Connect instantly to a live screen
                </p>
              </div>

              {/* Tab Navigation - Premium Style */}
              <div className="flex gap-0 border-b border-slate-200">
                <button
                  onClick={() => setActiveTab('code')}
                  className={`flex-1 px-4 py-3 font-semibold text-sm transition-all duration-300 relative group ${
                    activeTab === 'code'
                      ? 'text-indigo-600'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Keyboard size={18} />
                    <span>Enter Code</span>
                  </div>
                  {activeTab === 'code' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-600 to-purple-600 animate-slide-right" />
                  )}
                </button>

                <button
                  onClick={() => setActiveTab('nearby')}
                  className={`flex-1 px-4 py-3 font-semibold text-sm transition-all duration-300 relative group ${
                    activeTab === 'nearby'
                      ? 'text-indigo-600'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Wifi size={18} />
                    <span>Nearby</span>
                  </div>
                  {activeTab === 'nearby' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-600 to-purple-600 animate-slide-right" />
                  )}
                </button>

                <button
                  onClick={() => setActiveTab('bluetooth')}
                  className={`flex-1 px-4 py-3 font-semibold text-sm transition-all duration-300 relative group ${
                    activeTab === 'bluetooth'
                      ? 'text-indigo-600'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Bluetooth size={18} />
                    <span>Bluetooth</span>
                    <span className="ml-1 inline-block px-2 py-0.5 text-xs font-semibold bg-slate-200 text-slate-700 rounded-full">
                      Soon
                    </span>
                  </div>
                  {activeTab === 'bluetooth' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-600 to-purple-600 animate-slide-right" />
                  )}
                </button>
              </div>

              {/* Tab Content */}
              {activeTab === 'code' && (
                <form onSubmit={handleConnect} className="space-y-4">
                  {/* Error Message */}
                  {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-[12px] animate-slide-down">
                      <p className="text-red-700 font-medium text-sm">❌ {error}</p>
                    </div>
                  )}

                  {/* Success Message */}
                  {successMessage && !isConnected && (
                    <div className="p-4 bg-teal-50 border border-teal-200 rounded-[12px] animate-slide-down">
                      <p className="text-teal-700 font-medium text-sm">✅ {successMessage}</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-slate-700 text-sm font-semibold mb-2">
                      Room ID
                    </label>
                    <input
                      type="text"
                      value={roomId}
                      onChange={(e) => setRoomId(e.target.value)}
                      placeholder="Enter room ID (e.g., 1234)"
                      className="w-full px-5 py-3 bg-white border border-slate-200 rounded-[12px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-300"
                      disabled={isConnecting}
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 text-sm font-semibold mb-2 flex items-center gap-2">
                      <Lock size={16} className="text-indigo-600" />
                      Password
                    </label>
                    <input
                      type="password"
                      value={roomPassword}
                      onChange={(e) => setRoomPassword(e.target.value)}
                      placeholder="Enter room password"
                      className="w-full px-5 py-3 bg-white border border-slate-200 rounded-[12px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-300"
                      disabled={isConnecting}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isConnecting}
                    className="w-full px-6 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-[14px] transition-all duration-300 transform hover:shadow-lg hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0"
                  >
                    {isConnecting ? 'Connecting...' : 'Connect'}
                  </button>

                  <p className="text-center text-xs text-slate-500 pt-1">
                    💡 <span className="font-medium">Tip:</span> Use Nearby to find active sessions
                  </p>
                </form>
              )}

              {activeTab === 'nearby' && (
                <div className="space-y-4">
                  {/* Error Message */}
                  {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-[12px] animate-slide-down">
                      <p className="text-red-700 font-medium text-sm">❌ {error}</p>
                    </div>
                  )}

                  {/* Success Message */}
                  {successMessage && !isConnected && (
                    <div className="p-4 bg-teal-50 border border-teal-200 rounded-[12px] animate-slide-down">
                      <p className="text-teal-700 font-medium text-sm">✅ {successMessage}</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-slate-700 text-sm font-semibold mb-2">
                      Search Rooms
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by room name..."
                        className="w-full pl-5 pr-10 py-3 bg-white border border-slate-200 rounded-[12px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-300"
                      />
                      <Search size={18} className="absolute right-3 top-3 text-slate-400" />
                    </div>
                  </div>

                  {isLoadingRooms ? (
                    <div className="rounded-[12px] bg-slate-50 border border-slate-200 p-6 text-center">
                      <p className="text-slate-600">Loading active rooms...</p>
                    </div>
                  ) : filteredRooms.length > 0 ? (
                    <div className="space-y-2 max-h-72 overflow-y-auto">
                      {filteredRooms.map((room) => (
                        <button
                          key={room.id}
                          onClick={() => handleSelectRoom(room)}
                          className="w-full text-left bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-[12px] p-4 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5"
                        >
                          <div className="flex items-center gap-3">
                            <span className="inline-block w-2 h-2 bg-teal-500 rounded-full animate-pulse"></span>
                            <div>
                              <p className="font-semibold text-slate-900">{room.name}</p>
                              <p className="text-xs text-slate-500">
                                ID: {room.hostId} • {getRoomAge(room.createdAt)} ago
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-[12px] bg-slate-50 border border-slate-200 p-6 text-center">
                      <p className="text-slate-600">
                        {searchQuery ? 'No rooms match your search' : 'No active rooms available'}
                      </p>
                    </div>
                  )}

                  <div className="border-t border-slate-200 pt-4">
                    <form onSubmit={handleConnect} className="space-y-3">
                      <div>
                        <label className="block text-slate-700 text-sm font-semibold mb-2">
                          Room Password
                        </label>
                        <input
                          type="password"
                          value={roomPassword}
                          onChange={(e) => setRoomPassword(e.target.value)}
                          placeholder="Enter password"
                          className="w-full px-5 py-3 bg-white border border-slate-200 rounded-[12px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-300"
                          disabled={isConnecting || !roomId}
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isConnecting || !roomId}
                        className="w-full px-6 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-[14px] transition-all duration-300 transform hover:shadow-lg hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0"
                      >
                        {isConnecting ? 'Connecting...' : 'Connect'}
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {activeTab === 'bluetooth' && (
                <div className="space-y-4 py-2">
                  {/* Error Message */}
                  {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-[12px] animate-slide-down">
                      <p className="text-red-700 font-medium text-sm">❌ {error}</p>
                    </div>
                  )}

                  {/* Bluetooth Error Message */}
                  {bluetoothError && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-[12px]">
                      <p className="text-red-700 text-sm font-medium">{bluetoothError}</p>
                    </div>
                  )}

                  <div className="text-center py-2">
                    <p className="text-slate-600 mb-6 text-sm">
                      Scan nearby Bluetooth devices to find rooms
                    </p>
                    <button
                      onClick={handleBluetoothScan}
                      disabled={isScanning}
                      className="w-full px-6 py-3.5 bg-gradient-to-r from-slate-300 to-slate-300 text-slate-700 font-semibold rounded-[14px] transition-all duration-300 transform cursor-not-allowed opacity-60"
                    >
                      {isScanning ? '⏳ Scanning...' : '🔍 Scan Bluetooth (Coming Soon)'}
                    </button>
                  </div>

                  <div className="rounded-[12px] bg-indigo-50 border border-indigo-200 p-4">
                    <p className="text-indigo-700 text-xs">
                      ℹ️ Bluetooth support will be available soon. Device names will follow the format &quot;Room-1234&quot; where 1234 is the room ID.
                    </p>
                  </div>
                </div>
              )}

              {/* Footer - Back to Home Link for Mobile */}
              <Link href="/" className="block md:hidden pt-4 border-t border-slate-200">
                <button className="w-full text-center text-slate-600 hover:text-slate-900 font-medium transition-colors duration-300 py-2">
                  ← Back to Home
                </button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
