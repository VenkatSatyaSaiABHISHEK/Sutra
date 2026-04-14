// Example: Using Firebase Firestore functions

import {
  createRoom,
  getRoom,
  getActiveRooms,
  onActiveRoomsUpdate,
  onRoomUpdate,
} from '@/lib/firestore';

// Example 1: Create a new room
export async function exampleCreateRoom() {
  try {
    const roomId = await createRoom('Gaming Session', 'password123', 'host-user-1');
    console.log('Created room:', roomId);
    return roomId;
  } catch (error) {
    console.error('Failed to create room:', error);
  }
}

// Example 2: Get a specific room
export async function exampleGetRoom(roomId: string) {
  try {
    const room = await getRoom(roomId);
    if (room) {
      console.log('Room data:', room);
    } else {
      console.log('Room not found');
    }
  } catch (error) {
    console.error('Failed to get room:', error);
  }
}

// Example 3: Get all active rooms (one-time fetch)
export async function exampleGetActiveRooms() {
  try {
    const rooms = await getActiveRooms();
    console.log('Active rooms:', rooms);
    return rooms;
  } catch (error) {
    console.error('Failed to get active rooms:', error);
  }
}

// Example 4: Subscribe to real-time updates of active rooms
export function exampleSubscribeToActiveRooms() {
  const unsubscribe = onActiveRoomsUpdate((rooms) => {
    console.log('Rooms updated:', rooms);
    // Update UI with new rooms data
  });

  // Call unsubscribe() when you want to stop listening
  return unsubscribe;
}

// Example 5: Subscribe to real-time updates of a specific room
export function exampleSubscribeToRoom(roomId: string) {
  const unsubscribe = onRoomUpdate(roomId, (room) => {
    if (room) {
      console.log('Room updated:', room);
      // Update UI with room data
    } else {
      console.log('Room deleted or no longer exists');
    }
  });

  // Call unsubscribe() when you want to stop listening
  return unsubscribe;
}

// Example 6: React component using Firebase
import { useEffect, useState } from 'react';
import { Room } from '@/lib/firestore';

export function RoomsListComponent() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    // Subscribe to real-time updates
    const unsubscribe = onActiveRoomsUpdate((updatedRooms) => {
      setRooms(updatedRooms);
      setLoading(false);
    });

    // Cleanup on component unmount
    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div>Loading rooms...</div>;
  }

  return (
    <div>
      <h2>Active Rooms ({rooms.length})</h2>
      <ul>
        {rooms.map((room) => (
          <li key={room.id}>
            <h3>{room.name}</h3>
            <p>Host: {room.hostId}</p>
            <p>Created: {room.createdAt?.toDate().toLocaleString()}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
