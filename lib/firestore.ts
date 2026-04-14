import {
  collection,
  addDoc,
  getDoc,
  doc,
  query,
  where,
  onSnapshot,
  getDocs,
  Timestamp,
  DocumentData,
  updateDoc,
} from 'firebase/firestore';
import { db } from './firebase';

export interface Room extends DocumentData {
  id?: string;
  name: string;
  password: string;
  createdAt: Timestamp;
  isActive: boolean;
  hostId?: string;
}

/**
 * Create a new room in Firestore
 * @param name - Room name
 * @param password - Room password
 * @param hostId - Optional host ID
 * @returns Promise with room ID
 */
export const createRoom = async (
  name: string,
  password: string,
  hostId?: string
): Promise<string> => {
  try {
    const roomData: Room = {
      name,
      password,
      createdAt: Timestamp.now(),
      isActive: true,
      hostId: hostId || '',
    };

    const docRef = await addDoc(collection(db, 'rooms'), roomData);
    console.log('Room created with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error creating room:', error);
    throw error;
  }
};

/**
 * Get a room by ID
 * @param roomId - Room ID to fetch
 * @returns Promise with room data or null if not found
 */
export const getRoom = async (roomId: string): Promise<Room | null> => {
  try {
    const roomRef = doc(db, 'rooms', roomId);
    const roomSnapshot = await getDoc(roomRef);

    if (roomSnapshot.exists()) {
      return {
        id: roomSnapshot.id,
        ...roomSnapshot.data(),
      } as Room;
    } else {
      console.log('Room not found');
      return null;
    }
  } catch (error) {
    console.error('Error getting room:', error);
    throw error;
  }
};

/**
 * Get all active rooms
 * @returns Promise with array of active rooms
 */
export const getActiveRooms = async (): Promise<Room[]> => {
  try {
    const q = query(
      collection(db, 'rooms'),
      where('isActive', '==', true)
    );

    const querySnapshot = await getDocs(q);
    const rooms: Room[] = [];

    querySnapshot.forEach((doc) => {
      rooms.push({
        id: doc.id,
        ...doc.data(),
      } as Room);
    });

    console.log('Active rooms fetched:', rooms.length);
    return rooms;
  } catch (error) {
    console.error('Error getting active rooms:', error);
    throw error;
  }
};

/**
 * Subscribe to real-time updates of all active rooms
 * @param callback - Callback function that receives updated rooms
 * @returns Unsubscribe function to stop listening
 */
export const onActiveRoomsUpdate = (
  callback: (rooms: Room[]) => void
): (() => void) => {
  try {
    const q = query(
      collection(db, 'rooms'),
      where('isActive', '==', true)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const rooms: Room[] = [];

      querySnapshot.forEach((doc) => {
        rooms.push({
          id: doc.id,
          ...doc.data(),
        } as Room);
      });

      callback(rooms);
    });

    return unsubscribe;
  } catch (error) {
    console.error('Error subscribing to active rooms:', error);
    throw error;
  }
};

/**
 * Subscribe to real-time updates of a specific room
 * @param roomId - Room ID to listen to
 * @param callback - Callback function that receives updated room
 * @returns Unsubscribe function to stop listening
 */
export const onRoomUpdate = (
  roomId: string,
  callback: (room: Room | null) => void
): (() => void) => {
  try {
    const roomRef = doc(db, 'rooms', roomId);

    const unsubscribe = onSnapshot(roomRef, (doc) => {
      if (doc.exists()) {
        callback({
          id: doc.id,
          ...doc.data(),
        } as Room);
      } else {
        callback(null);
      }
    });

    return unsubscribe;
  } catch (error) {
    console.error('Error subscribing to room updates:', error);
    throw error;
  }
};

/**
 * Update room's isActive status
 * @param roomId - Room ID
 * @param isActive - Active status
 * @returns Promise
 */
export const updateRoomStatus = async (
  roomId: string,
  isActive: boolean
): Promise<void> => {
  try {
    const roomRef = doc(db, 'rooms', roomId);
    await updateDoc(roomRef, { isActive });
    console.log(`Room ${roomId} marked as ${isActive ? 'active' : 'inactive'}`);
  } catch (error) {
    console.error('Error updating room status:', error);
    throw error;
  }
};

/**
 * Store WebRTC offer in Firestore
 * @param roomId - Room ID
 * @param offer - RTCSessionDescription offer
 * @returns Promise with offer ID
 */
export const storeOffer = async (
  roomId: string,
  offer: RTCSessionDescriptionInit
): Promise<string> => {
  try {
    console.log(`💾 storeOffer called with roomId="${roomId}"`);
    const offersRef = collection(db, 'rooms', roomId, 'offers');
    console.log(`💾 Path: rooms/${roomId}/offers`);
    
    const offerData = {
      type: offer.type,
      sdp: offer.sdp,
      createdAt: Timestamp.now(),
    };

    const docRef = await addDoc(offersRef, offerData);
    console.log('✅ Offer stored with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('❌ Error storing offer:', error);
    throw error;
  }
};

/**
 * Get all offers for a room
 * @param roomId - Room ID
 * @returns Promise with array of offers
 */
export const getOffers = async (
  roomId: string
): Promise<Array<{ id: string; type: string; sdp: string; createdAt: Timestamp }>> => {
  try {
    console.log(`📋 getOffers called with roomId="${roomId}"`);
    const offersRef = collection(db, 'rooms', roomId, 'offers');
    console.log(`📋 Path: rooms/${roomId}/offers`);
    
    const querySnapshot = await getDocs(offersRef);
    console.log(`📋 Query returned ${querySnapshot.size} documents`);
    
    const offers: Array<{ id: string; type: string; sdp: string; createdAt: Timestamp }> = [];

    querySnapshot.forEach((doc) => {
      console.log(`📋 Offer doc "${doc.id}": type=${doc.data().type}, sdp length=${doc.data().sdp?.length || 0}`);
      offers.push({
        id: doc.id,
        type: doc.data().type,
        sdp: doc.data().sdp,
        createdAt: doc.data().createdAt,
      });
    });

    console.log(`📋 Returning ${offers.length} offers`);
    return offers;
  } catch (error) {
    console.error('❌ Error getting offers:', error);
    throw error;
  }
};

/**
 * Subscribe to offer updates for a room
 * @param roomId - Room ID
 * @param callback - Callback function that receives updated offers
 * @returns Unsubscribe function
 */
export const onOffersUpdate = (
  roomId: string,
  callback: (
    offers: Array<{ id: string; type: string; sdp: string; createdAt: Timestamp }>
  ) => void
): (() => void) => {
  try {
    const offersRef = collection(db, 'rooms', roomId, 'offers');

    const unsubscribe = onSnapshot(offersRef, (querySnapshot) => {
      const offers: Array<{ id: string; type: string; sdp: string; createdAt: Timestamp }> = [];

      querySnapshot.forEach((doc) => {
        offers.push({
          id: doc.id,
          type: doc.data().type,
          sdp: doc.data().sdp,
          createdAt: doc.data().createdAt,
        });
      });

      callback(offers);
    });

    return unsubscribe;
  } catch (error) {
    console.error('Error subscribing to offers:', error);
    throw error;
  }
};

/**
 * Store WebRTC answer in Firestore
 * @param roomId - Room ID
 * @param offerId - Offer ID
 * @param answer - RTCSessionDescription answer
 * @returns Promise with answer ID
 */
export const storeAnswer = async (
  roomId: string,
  offerId: string,
  answer: RTCSessionDescriptionInit
): Promise<string> => {
  try {
    console.log(`💾 storeAnswer called with roomId="${roomId}", offerId="${offerId}"`);
    const answersRef = collection(db, 'rooms', roomId, 'offers', offerId, 'answers');
    console.log(`💾 Path: rooms/${roomId}/offers/${offerId}/answers`);
    
    const answerData = {
      type: answer.type,
      sdp: answer.sdp,
      createdAt: Timestamp.now(),
    };

    const docRef = await addDoc(answersRef, answerData);
    console.log('✅ Answer stored with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('❌ Error storing answer:', error);
    throw error;
  }
};

/**
 * Get answers for a specific offer
 * @param roomId - Room ID
 * @param offerId - Offer ID
 * @returns Promise with array of answers
 */
export const getAnswers = async (
  roomId: string,
  offerId: string
): Promise<Array<{ id: string; type: string; sdp: string; createdAt: Timestamp }>> => {
  try {
    console.log(`📋 getAnswers called with roomId="${roomId}", offerId="${offerId}"`);
    const answersRef = collection(db, 'rooms', roomId, 'offers', offerId, 'answers');
    console.log(`📋 Path: rooms/${roomId}/offers/${offerId}/answers`);
    
    const querySnapshot = await getDocs(answersRef);
    console.log(`📋 Query returned ${querySnapshot.size} documents`);
    
    const answers: Array<{ id: string; type: string; sdp: string; createdAt: Timestamp }> = [];

    querySnapshot.forEach((doc) => {
      console.log(`📋 Answer doc "${doc.id}": type=${doc.data().type}, sdp length=${doc.data().sdp?.length || 0}`);
      answers.push({
        id: doc.id,
        type: doc.data().type,
        sdp: doc.data().sdp,
        createdAt: doc.data().createdAt,
      });
    });

    console.log(`📋 Returning ${answers.length} answers`);
    return answers;
  } catch (error) {
    console.error('❌ Error getting answers:', error);
    throw error;
  }
};

/**
 * Subscribe to answer updates for a specific offer
 * @param roomId - Room ID
 * @param offerId - Offer ID
 * @param callback - Callback function that receives updated answers
 * @returns Unsubscribe function
 */
export const onAnswersUpdate = (
  roomId: string,
  offerId: string,
  callback: (
    answers: Array<{ id: string; type: string; sdp: string; createdAt: Timestamp }>
  ) => void
): (() => void) => {
  try {
    const answersRef = collection(db, 'rooms', roomId, 'offers', offerId, 'answers');

    const unsubscribe = onSnapshot(answersRef, (querySnapshot) => {
      const answers: Array<{ id: string; type: string; sdp: string; createdAt: Timestamp }> = [];

      querySnapshot.forEach((doc) => {
        answers.push({
          id: doc.id,
          type: doc.data().type,
          sdp: doc.data().sdp,
          createdAt: doc.data().createdAt,
        });
      });

      callback(answers);
    });

    return unsubscribe;
  } catch (error) {
    console.error('Error subscribing to answers:', error);
    throw error;
  }
};

/**
 * Store ICE candidate in Firestore
 * @param roomId - Room ID
 * @param offerId - Offer ID
 * @param candidate - RTCIceCandidateInit candidate
 * @param isHostCandidate - Whether this is from host (true) or viewer (false)
 * @returns Promise with candidate ID
 */
export const storeIceCandidate = async (
  roomId: string,
  offerId: string,
  candidate: RTCIceCandidateInit,
  isHostCandidate: boolean
): Promise<string> => {
  try {
    const candidateCollection = isHostCandidate ? 'hostCandidates' : 'viewerCandidates';
    const candidatesRef = collection(
      db,
      'rooms',
      roomId,
      'offers',
      offerId,
      candidateCollection
    );

    const candidateData = {
      candidate: candidate.candidate,
      sdpMLineIndex: candidate.sdpMLineIndex,
      sdpMid: candidate.sdpMid,
      createdAt: Timestamp.now(),
    };

    const docRef = await addDoc(candidatesRef, candidateData);
    return docRef.id;
  } catch (error) {
    console.error('Error storing ICE candidate:', error);
    throw error;
  }
};

/**
 * Get ICE candidates for a specific offer
 * @param roomId - Room ID
 * @param offerId - Offer ID
 * @param isHostCandidate - Whether to get host (true) or viewer (false) candidates
 * @returns Promise with array of candidates
 */
export const getIceCandidates = async (
  roomId: string,
  offerId: string,
  isHostCandidate: boolean
): Promise<RTCIceCandidateInit[]> => {
  try {
    const candidateCollection = isHostCandidate ? 'hostCandidates' : 'viewerCandidates';
    const candidatesRef = collection(
      db,
      'rooms',
      roomId,
      'offers',
      offerId,
      candidateCollection
    );

    const querySnapshot = await getDocs(candidatesRef);
    const candidates: RTCIceCandidateInit[] = [];

    querySnapshot.forEach((doc) => {
      candidates.push({
        candidate: doc.data().candidate,
        sdpMLineIndex: doc.data().sdpMLineIndex,
        sdpMid: doc.data().sdpMid,
      });
    });

    return candidates;
  } catch (error) {
    console.error('Error getting ICE candidates:', error);
    throw error;
  }
};

/**
 * Subscribe to ICE candidate updates
 * @param roomId - Room ID
 * @param offerId - Offer ID
 * @param isHostCandidate - Whether to get host (true) or viewer (false) candidates
 * @param callback - Callback function that receives updated candidates
 * @returns Unsubscribe function
 */
export const onIceCandidatesUpdate = (
  roomId: string,
  offerId: string,
  isHostCandidate: boolean,
  callback: (candidates: RTCIceCandidateInit[]) => void
): (() => void) => {
  try {
    const candidateCollection = isHostCandidate ? 'hostCandidates' : 'viewerCandidates';
    const candidatesRef = collection(
      db,
      'rooms',
      roomId,
      'offers',
      offerId,
      candidateCollection
    );

    const unsubscribe = onSnapshot(candidatesRef, (querySnapshot) => {
      const candidates: RTCIceCandidateInit[] = [];

      querySnapshot.forEach((doc) => {
        candidates.push({
          candidate: doc.data().candidate,
          sdpMLineIndex: doc.data().sdpMLineIndex,
          sdpMid: doc.data().sdpMid,
        });
      });

      callback(candidates);
    });

    return unsubscribe;
  } catch (error) {
    console.error('Error subscribing to ICE candidates:', error);
    throw error;
  }
};
