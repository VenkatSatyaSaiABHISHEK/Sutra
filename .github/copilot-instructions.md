<!-- Use this file to provide workspace-specific custom instructions to Copilot -->

## Project: Next.js App with Tailwind CSS & Firebase (Screen Sharing)

A modern Next.js application for real-time screen sharing with WebRTC. Features a home page with "Start Hosting" and "Join as Viewer" buttons, dark theme with glassmorphism design, responsive layout, routing for /host and /viewer pages, and Firebase Firestore integration for real-time room management and WebRTC signaling.

### Tech Stack
- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Firebase & Firestore
- WebRTC (peer-to-peer streaming)
- Screen Capture API
- ESLint

### Completed Features

#### Home Page
- [x] Two large interactive buttons
- [x] Dark theme with glassmorphism
- [x] Responsive mobile and TV-friendly layout
- [x] Navigate to /host and /viewer pages

#### Host Page (`/host`)
- [x] Input fields: Room name, Password
- [x] "Start Sharing" button
- [x] Auto-generated 4-digit room ID
- [x] Save room to Firebase
- [x] Screen capture using getDisplayMedia()
- [x] WebRTC peer connection creation
- [x] Generate WebRTC offer
- [x] Store offer in Firebase
- [x] Display screen preview
- [x] Show room ID and name
- [x] Error handling and validation
- [x] Stop sharing button
- [x] Stream cleanup on leave

#### Viewer Page (`/viewer`)
- [x] List of available rooms from Firebase
- [x] Click room to auto-fill Room ID
- [x] Room ID input field
- [x] Password input field
- [x] Connect button
- [x] Fetch offer from Firebase
- [x] Password validation
- [x] Create WebRTC answer
- [x] Store answer in Firebase
- [x] Receive and display video stream
- [x] Full-screen video player
- [x] Connection state monitoring
- [x] Leave/disconnect button
- [x] Error handling

#### Firebase Integration
- [x] Firestore database setup
- [x] Rooms collection with CRUD operations
- [x] WebRTC offers subcollection
- [x] WebRTC answers subcollection
- [x] Real-time listeners with onSnapshot()
- [x] Password-protected rooms
- [x] Active rooms filtering

#### WebRTC Implementation
- [x] Peer connection creation with STUN servers
- [x] Offer generation and storage
- [x] Answer generation and storage
- [x] Remote description handling
- [x] ICE candidate management
- [x] Stream track handling
- [x] Connection state monitoring

#### Utility Functions
- [x] Screen capture utilities
- [x] Room ID generation (4-digit)
- [x] Room ID formatting
- [x] WebRTC helper functions
- [x] Type definitions and interfaces

