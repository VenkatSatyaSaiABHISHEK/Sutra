# Hosting App

A modern Next.js application with a home page featuring "Start Hosting" and "Join as Viewer" buttons. Built with Tailwind CSS, Firebase, and Firestore for real-time collaboration. Includes dark theme with glassmorphism design.

## Features

- **Home Page**: Centered layout with two large interactive buttons
- **Dark Theme**: Modern dark gradient background
- **Glassmorphism UI**: Frosted glass effect with backdrop blur
- **Responsive Design**: Optimized for mobile, tablet, and desktop (TV-friendly)
- **Routing**: `/host` and `/viewer` pages with smooth navigation
- **Interactive Elements**: Hover effects and smooth animations
- **Firebase Integration**: Real-time Firestore database with rooms collection
- **Real-time Updates**: onSnapshot listeners for live room data
- **TypeScript Support**: Fully typed Firestore functions and data models

### Host Page
- **Screen Capture**: Share your display using `getDisplayMedia()`
- **Room Setup**: Create rooms with name and password
- **Auto-generated Room ID**: Unique 4-digit IDs for each session
- **WebRTC**: Peer-to-peer connections for streaming
- **Offer Management**: Store and retrieve WebRTC offers
- **Video Preview**: Live preview of shared screen
- **Status Indicator**: Real-time broadcasting status

### Viewer Page
- **Room Browser**: List of available active rooms
- **Quick Join**: Click room to auto-fill room ID
- **Manual Entry**: Enter room ID and password manually
- **Password Protected**: Secure room access
- **WebRTC Connection**: Fetch offer, create answer, receive video
- **Full-screen Viewing**: Watch streams in full-screen video player
- **Connection Management**: Real-time connection state monitoring

## Tech Stack

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **Firebase** - Backend services with Firestore database
- **ESLint** - Code quality

## Project Structure

```
.
├── app/
│   ├── globals.css        # Global styles with Tailwind directives
│   ├── layout.tsx         # Root layout component
│   ├── page.tsx           # Home page with buttons
│   ├── host/
│   │   └── page.tsx       # Host page (screen capture, WebRTC)
│   └── viewer/
│       └── page.tsx       # Viewer page (room browser, WebRTC)
├── lib/
│   ├── firebase.ts        # Firebase initialization
│   ├── firestore.ts       # Firestore CRUD functions
│   ├── webrtc.ts          # WebRTC peer connection utilities
│   ├── screenCapture.ts   # Screen & camera capture utilities
│   ├── roomUtils.ts       # Room ID generation & formatting
│   ├── types.ts           # TypeScript interfaces
│   └── examples.tsx       # Usage examples
├── public/                # Static assets
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
├── tailwind.config.ts     # Tailwind CSS configuration
├── next.config.ts         # Next.js configuration
├── .env.local             # Firebase configuration (not in git)
└── FIREBASE_SETUP.md      # Firebase setup guide
```

## Firebase Setup

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project
3. Enable Firestore database in test mode (or configure security rules)
4. Copy your Firebase config credentials

### 2. Configure Environment Variables

Update `.env.local` with your Firebase credentials:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=YOUR_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=YOUR_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=YOUR_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=YOUR_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID=YOUR_APP_ID
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=YOUR_MEASUREMENT_ID
```

### 3. Firestore Collection Structure

Create a `rooms` collection in Firestore with the following document structure:

```javascript
{
  name: string,           // Room name
  password: string,       // Room password
  createdAt: timestamp,   // Creation timestamp
  isActive: boolean,      // Room status
  hostId: string,         // Host user ID (optional)
}
```

## Firebase Functions

### Available Firestore Functions

#### `createRoom(name, password, hostId?)`
Creates a new room in Firestore.

```typescript
import { createRoom } from '@/lib/firestore';

const roomId = await createRoom('Gaming Session', 'pass123', 'user-123');
```

#### `getRoom(roomId)`
Fetches a single room by ID.

```typescript
import { getRoom } from '@/lib/firestore';

const room = await getRoom('room-id-123');
```

#### `getActiveRooms()`
Fetches all active rooms (one-time fetch).

```typescript
import { getActiveRooms } from '@/lib/firestore';

const rooms = await getActiveRooms();
```

#### `onActiveRoomsUpdate(callback)`
Subscribes to real-time updates of all active rooms.

```typescript
import { onActiveRoomsUpdate } from '@/lib/firestore';

const unsubscribe = onActiveRoomsUpdate((rooms) => {
  console.log('Updated rooms:', rooms);
});

// Stop listening when done
unsubscribe();
```

#### `onRoomUpdate(roomId, callback)`
Subscribes to real-time updates of a specific room.

```typescript
import { onRoomUpdate } from '@/lib/firestore';

const unsubscribe = onRoomUpdate('room-id-123', (room) => {
  console.log('Room updated:', room);
});

// Stop listening when done
unsubscribe();
```

## Usage Examples

See [lib/examples.tsx](lib/examples.tsx) for comprehensive examples including:
- Creating rooms
- Fetching room data
- Subscribing to real-time updates
- React component integration

## Getting Started

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

### Development

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

### Build

Create an optimized production build:

```bash
npm run build
```

Start the production server:

```bash
npm start
```

## Design Features

### Home Page
- Centered glassmorphism card with gradient background
- Two prominent buttons: "Start Hosting" and "Join as Viewer"
- Gradient shadows and hover animations
- Responsive button layout (stacked on mobile, side-by-side on larger screens)

### Host Page (`/host`)
- Blue-themed gradient background
- Broadcasting status indicator
- "Start Broadcasting" button

### Viewer Page (`/viewer`)
- Purple-themed gradient background
- Live sessions indicator
- "Browse Sessions" button

## Customization

### Colors
Edit `tailwind.config.ts` to customize the dark theme colors.

### Components
Modify `app/page.tsx`, `app/host/page.tsx`, and `app/viewer/page.tsx` to customize the UI.

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

MIT
