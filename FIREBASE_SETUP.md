# Firebase Integration Quick Start

This guide helps you get Firebase Firestore up and running with the Hosting App.

## Step 1: Create a Firebase Project

1. Visit [Firebase Console](https://console.firebase.google.com)
2. Click "Create a project"
3. Enter project name and complete setup
4. Go to Project Settings (gear icon)
5. Under "General" tab, scroll down to find your Firebase config

## Step 2: Set Up Firestore Database

1. In Firebase Console, go to "Firestore Database"
2. Click "Create database"
3. Start in test mode (for development)
4. Choose a region
5. Click "Enable"

## Step 3: Configure Environment Variables

1. Copy your Firebase config credentials from Project Settings
2. Open `.env.local` in the project root
3. Replace the placeholder values with your actual credentials:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=YOUR_API_KEY_HERE
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=YOUR_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID=YOUR_APP_ID
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=YOUR_MEASUREMENT_ID
```

## Step 4: Create Firestore Collections

1. In Firestore Console, create a new collection named `rooms`
2. The document fields will be created automatically when you first call `createRoom()`

### Manual Document Creation (Optional)

You can manually create a test document:

1. In Firestore Console, click on "Start collection"
2. Name it `rooms`
3. Create a document with these fields:
   - `name` (string): "Test Room"
   - `password` (string): "test123"
   - `createdAt` (timestamp): Current time
   - `isActive` (boolean): true
   - `hostId` (string): "user-123"

## Step 5: Test the Integration

### Using Node.js (For testing)

Create a test file `test-firebase.js`:

```javascript
const express = require('express');
const app = express();

// Import Firebase functions (run in a Next.js route for client-side code)
import('next').then(({ default: next }) => {
  const dev = app.get('NODE_ENV') !== 'production';
  const nextApp = next({ dev });
  const handle = nextApp.getRequestHandler();
  
  nextApp.prepare().then(() => {
    app.get('/api/test', async (req, res) => {
      const { getActiveRooms } = await import('./lib/firestore');
      const rooms = await getActiveRooms();
      res.json({ rooms });
    });
    
    app.listen(3000, () => console.log('Server running on port 3000'));
  });
});
```

### Using React Component

Create a component to test real-time updates:

```typescript
import { useEffect, useState } from 'react';
import { onActiveRoomsUpdate, Room } from '@/lib/firestore';

export function FirebaseTest() {
  const [rooms, setRooms] = useState<Room[]>([]);

  useEffect(() => {
    const unsubscribe = onActiveRoomsUpdate((updatedRooms) => {
      console.log('Rooms updated:', updatedRooms);
      setRooms(updatedRooms);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div>
      <h2>Firebase Test - Active Rooms: {rooms.length}</h2>
      <pre>{JSON.stringify(rooms, null, 2)}</pre>
    </div>
  );
}
```

## Step 6: Set Firestore Security Rules (Production)

Replace test mode rules with production rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read/write rooms
    match /rooms/{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Common Issues

### "Missing or insufficient permissions"
- Check `.env.local` has correct Firebase credentials
- Firestore security rules might be too restrictive
- Ensure Firestore is in test mode or rules are properly configured

### "Cannot find module 'firebase'"
- Run `npm install` to install Firebase SDK
- Check package.json has `firebase` in dependencies

### "Timestamp is not defined"
- Import `Timestamp` from `firebase/firestore`
- Use `Timestamp.now()` to create timestamps

## Next Steps

1. Integrate Firebase Authentication for user management
2. Set up Cloud Storage for room media/files
3. Implement Cloud Functions for room management logic
4. Add Firestore security rules for production

## Additional Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Guide](https://firebase.google.com/docs/firestore)
- [Next.js + Firebase Guide](https://firebase.google.com/docs/web/setup)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/start)
