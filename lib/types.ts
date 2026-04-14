// Type definitions for Firestore data models

import { DocumentData, Timestamp } from 'firebase/firestore';

/**
 * Room interface for Firestore documents
 * Represents a hosting/streaming room
 */
export interface Room extends DocumentData {
  id?: string;                    // Firestore document ID
  name: string;                   // Room name/title
  password: string;               // Room password for access control
  createdAt: Timestamp;           // Room creation timestamp
  isActive: boolean;              // Whether room is currently active
  hostId?: string;                // ID of the host (optional)
  description?: string;           // Room description (optional)
  maxViewers?: number;            // Maximum number of viewers (optional)
  currentViewerCount?: number;    // Current viewer count (optional)
  tags?: string[];                // Room tags/categories (optional)
}

/**
 * Firestore query options
 */
export interface QueryOptions {
  limit?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

/**
 * Firebase Authentication user type
 */
export interface FirebaseUser extends DocumentData {
  uid: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
  createdAt: Timestamp;
}

/**
 * Room creation payload
 */
export type CreateRoomPayload = {
  name: string;
  password: string;
  hostId?: string;
  description?: string;
  maxViewers?: number;
};

/**
 * Room update payload (all fields optional)
 */
export type UpdateRoomPayload = Partial<Omit<Room, 'id' | 'createdAt'>>;

/**
 * Firestore operation result
 */
export interface OperationResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
}
