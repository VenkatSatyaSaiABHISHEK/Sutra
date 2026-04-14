/**
 * WebRTC utilities for creating peer connections and generating offers
 */

export interface WebRTCConfig {
  iceServers?: RTCIceServer[];
}

const defaultIceServers: RTCIceServer[] = [
  { urls: ['stun:stun.l.google.com:19302'] },
  { urls: ['stun:stun1.l.google.com:19302'] },
  { urls: ['stun:stun2.l.google.com:19302'] },
];

/**
 * Create a new RTCPeerConnection instance
 * @param config Optional WebRTC configuration
 * @returns RTCPeerConnection instance
 */
export const createPeerConnection = (config?: WebRTCConfig): RTCPeerConnection => {
  const peerConnection = new RTCPeerConnection({
    iceServers: config?.iceServers || defaultIceServers,
  });

  console.log('🔧 Creating peer connection with ICE servers...');

  // Set up event handlers immediately to capture all events
  let candidateCount = 0;
  
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      candidateCount++;
      console.log(`❄️ ICE candidate #${candidateCount} generated:`, event.candidate.candidate.substring(0, 60) + '...');
    } else {
      console.log(`❄️ ICE gathering completed. Total candidates: ${candidateCount}`);
    }
  };

  peerConnection.oniceconnectionstatechange = () => {
    console.log('❄️ ICE connection state:', peerConnection.iceConnectionState);
  };

  peerConnection.onconnectionstatechange = () => {
    console.log('📡 Connection state:', peerConnection.connectionState);
  };

  // Also log when connection state machine changes
  peerConnection.onsignalingstatechange = () => {
    console.log('📋 Signaling state:', peerConnection.signalingState);
  };

  return peerConnection;
};

/**
 * Create an RTCSessionDescription offer from a peer connection
 * @param peerConnection RTCPeerConnection instance
 * @returns Promise with RTCSessionDescriptionInit
 */
export const createOffer = async (
  peerConnection: RTCPeerConnection
): Promise<RTCSessionDescriptionInit> => {
  try {
    const offer = await peerConnection.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });

    await peerConnection.setLocalDescription(offer);
    console.log('Offer created:', offer);

    return offer;
  } catch (error) {
    console.error('Error creating offer:', error);
    throw error;
  }
};

/**
 * Create an RTCSessionDescription answer from a peer connection
 * @param peerConnection RTCPeerConnection instance
 * @returns Promise with RTCSessionDescriptionInit
 */
export const createAnswer = async (
  peerConnection: RTCPeerConnection
): Promise<RTCSessionDescriptionInit> => {
  try {
    const answer = await peerConnection.createAnswer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });

    await peerConnection.setLocalDescription(answer);
    console.log('Answer created:', answer);

    return answer;
  } catch (error) {
    console.error('Error creating answer:', error);
    throw error;
  }
};

/**
 * Set remote description from an answer
 * @param peerConnection RTCPeerConnection instance
 * @param answer RTCSessionDescriptionInit from viewer
 */
export const setRemoteDescription = async (
  peerConnection: RTCPeerConnection,
  answer: RTCSessionDescriptionInit
): Promise<void> => {
  try {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    console.log('Remote description set');
  } catch (error) {
    console.error('Error setting remote description:', error);
    throw error;
  }
};

/**
 * Add ICE candidate to peer connection
 * @param peerConnection RTCPeerConnection instance
 * @param candidate RTCIceCandidateInit
 */
export const addICECandidate = async (
  peerConnection: RTCPeerConnection,
  candidate: RTCIceCandidateInit
): Promise<void> => {
  try {
    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    console.log('ICE candidate added');
  } catch (error) {
    console.error('Error adding ICE candidate:', error);
    throw error;
  }
};

/**
 * Add media stream to peer connection
 * @param peerConnection RTCPeerConnection instance
 * @param stream MediaStream (screen or camera)
 */
export const addStreamToPeerConnection = (
  peerConnection: RTCPeerConnection,
  stream: MediaStream
): void => {
  stream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, stream);
  });
  console.log('Stream added to peer connection');
};

/**
 * Close peer connection and stop all tracks
 * @param peerConnection RTCPeerConnection instance
 * @param stream MediaStream to stop
 */
export const closePeerConnection = (
  peerConnection: RTCPeerConnection,
  stream?: MediaStream
): void => {
  if (stream) {
    stream.getTracks().forEach((track) => {
      track.stop();
    });
  }
  peerConnection.close();
  console.log('Peer connection closed');
};
