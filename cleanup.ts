import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc, query, where } from 'firebase/firestore';
import { readFileSync } from 'fs';

// Read config from the workspace
const config = JSON.parse(readFileSync('./firebase-applet-config.json', 'utf-8'));
const firebaseConfig = {
  apiKey: config.apiKey,
  authDomain: config.authDomain,
  projectId: config.projectId,
  storageBucket: config.storageBucket,
  messagingSenderId: config.messagingSenderId,
  appId: config.appId
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const ADMIN_EMAIL = 'danlamimathias2025@gmail.com';

async function cleanup() {
  console.log('Starting cleanup...');

  // 1. Delete all withdrawals
  const withdrawalsSnap = await getDocs(collection(db, 'withdrawals'));
  for (const d of withdrawalsSnap.docs) {
    await deleteDoc(doc(db, 'withdrawals', d.id));
  }
  console.log(`Deleted ${withdrawalsSnap.size} withdrawals.`);

  // 2. Delete all users except admin
  const usersSnap = await getDocs(collection(db, 'users'));
  for (const userDoc of usersSnap.docs) {
    const userData = userDoc.data();
    if (userData.email === ADMIN_EMAIL) {
      console.log(`Skipping admin user: ${userData.email}`);
      continue;
    }

    // Delete subcollections first
    const clicksSnap = await getDocs(collection(db, 'users', userDoc.id, 'clicks'));
    for (const clickDoc of clicksSnap.docs) {
      await deleteDoc(doc(db, 'users', userDoc.id, 'clicks', clickDoc.id));
    }
    
    const checkinsSnap = await getDocs(collection(db, 'users', userDoc.id, 'checkins'));
    for (const checkinDoc of checkinsSnap.docs) {
      await deleteDoc(doc(db, 'users', userDoc.id, 'checkins', checkinDoc.id));
    }

    await deleteDoc(doc(db, 'users', userDoc.id));
    console.log(`Deleted user: ${userData.email}`);
  }

  console.log('Cleanup finished.');
  process.exit(0);
}

cleanup().catch(err => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});
