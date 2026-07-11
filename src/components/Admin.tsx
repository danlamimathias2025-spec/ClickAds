import React, { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp, onSnapshot, deleteDoc, doc, updateDoc, query, getDocs, writeBatch } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { Plus, Trash2, Loader2, ShieldAlert, ArrowLeft, CheckCircle, XCircle, Users, Edit2, Save, X, Mail, RefreshCcw, Image as ImageIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Ad {
  id: string;
  title: string;
  url: string;
  rewardAmount: number;
}

interface Withdrawal {
  id: string;
  userId: string;
  username: string;
  amount: number;
  bankName: string;
  accountNumber: string;
  accountName: string;
  status: string;
  createdAt: any;
}

interface User {
  id: string;
  username: string;
  email: string;
  welcomeBonus: number;
  activationStatus?: string;
  createdAt: any;
}

interface Activation {
  id: string;
  userId: string;
  username: string;
  receiptImage: string;
  status: string;
  createdAt: any;
}

export function Admin() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [activations, setActivations] = useState<Activation[]>([]);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [rewardAmount, setRewardAmount] = useState('500');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'ads' | 'withdrawals' | 'users' | 'activations'>('ads');
  
  // Edit User State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editWelcomeBonus, setEditWelcomeBonus] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [resetEmailLoading, setResetEmailLoading] = useState<string | null>(null);
  const [resetAppLoading, setResetAppLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [userStats, setUserStats] = useState<Record<string, { earnings: number, withdrawn: number, balance: number, checkins: number }>>({});
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStats = async () => {
      const stats: Record<string, { earnings: number, withdrawn: number, balance: number, checkins: number }> = {};
      for (const user of users) {
        try {
          const clicksSnap = await getDocs(collection(db, `users/${user.id}/clicks`));
          const clicksTotal = clicksSnap.docs.reduce((sum, d) => sum + (d.data().rewardAmount || 0), 0);
          
          const checkinsSnap = await getDocs(collection(db, `users/${user.id}/checkins`));
          const checkinsTotal = checkinsSnap.docs.reduce((sum, d) => sum + (d.data().rewardAmount || 0), 0);
          
          const earnings = clicksTotal + checkinsTotal + (user.welcomeBonus || 0);
          
          const approvedWithdrawals = withdrawals
            .filter(w => w.userId === user.id && w.status === 'approved')
            .reduce((sum, w) => sum + w.amount, 0);
            
          const pendingWithdrawals = withdrawals
            .filter(w => w.userId === user.id && w.status === 'pending')
            .reduce((sum, w) => sum + w.amount, 0);
            
          const balance = earnings - approvedWithdrawals - pendingWithdrawals;
          
          stats[user.id] = { earnings, withdrawn: approvedWithdrawals, balance, checkins: checkinsTotal };
        } catch (err) {
          console.error(`Failed to fetch stats for user ${user.id}`, err);
          stats[user.id] = { earnings: user.welcomeBonus || 0, withdrawn: 0, balance: user.welcomeBonus || 0, checkins: 0 };
        }
      }
      setUserStats(stats);
    };

    if (users.length > 0) {
      fetchStats();
    }
  }, [users, withdrawals]);

  useEffect(() => {
    const unsubscribeAds = onSnapshot(
      collection(db, 'ads'),
      async (snapshot) => {
        if (snapshot.empty) {
          console.log('[Admin] No ads found in database. Automatically generating 5 default daily ads...');
          const defaultAds = [
            { title: 'Watch Video & Earn', url: 'https://www.youtube.com' },
            { title: 'Visit Website Task 1', url: 'https://google.com' },
            { title: 'Special Promo Click', url: 'https://bing.com' },
            { title: 'Premium Reward Ad', url: 'https://yahoo.com' },
            { title: 'Quick Earning Link', url: 'https://duckduckgo.com' }
          ];
          try {
            for (const ad of defaultAds) {
              await addDoc(collection(db, 'ads'), {
                title: ad.title,
                url: ad.url,
                rewardAmount: 500,
                createdAt: serverTimestamp()
              });
            }
            setActionMessage({ type: 'success', text: 'Daily ads have been automatically generated!' });
          } catch (err: any) {
            console.error('[Admin] Failed to automatically generate ads:', err);
          }
          return;
        }

        const adsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Ad[];
        setAds(adsData);

        // Auto-update any ads with incorrect rewardAmount
        const incorrectAds = adsData.filter(ad => ad.rewardAmount !== 500);
        if (incorrectAds.length > 0) {
          console.log(`[Admin] Found ${incorrectAds.length} ads with reward not equal to ₦500. Auto-healing...`);
          try {
            for (const ad of incorrectAds) {
              await updateDoc(doc(db, 'ads', ad.id), {
                rewardAmount: 500
              });
            }
            setActionMessage({ type: 'success', text: `Automatically updated ${incorrectAds.length} ads to ₦500 reward!` });
          } catch (err: any) {
            console.error('[Admin] Failed to automatically update ads to ₦500:', err);
          }
        }
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'ads')
    );

    const unsubscribeWithdrawals = onSnapshot(
      query(collection(db, 'withdrawals')),
      (snapshot) => {
        const wData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Withdrawal[];
        
        wData.sort((a, b) => {
          const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
          const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
          return timeB - timeA;
        });
        
        setWithdrawals(wData);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'withdrawals')
    );

    const unsubscribeUsers = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const usersData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as User[];
        setUsers(usersData);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'users')
    );

    const unsubscribeActivations = onSnapshot(
      collection(db, 'activations'),
      (snapshot) => {
        const aData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Activation[];
        aData.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
        setActivations(aData);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'activations')
    );

    return () => {
      unsubscribeAds();
      unsubscribeWithdrawals();
      unsubscribeUsers();
      unsubscribeActivations();
    };
  }, []);

  const handleAddAd = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await addDoc(collection(db, 'ads'), {
        title,
        url,
        rewardAmount: parseFloat(rewardAmount),
        createdAt: serverTimestamp()
      });
      setTitle('');
      setUrl('');
      setRewardAmount('');
    } catch (err: any) {
      setError(err.message || 'Failed to add ad');
      handleFirestoreError(err, OperationType.CREATE, 'ads');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAd = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'ads', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `ads/${id}`);
    }
  };

  const handleUpdateWithdrawalStatus = async (id: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'withdrawals', id), { status: newStatus });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `withdrawals/${id}`);
    }
  };

  const handleUpdateActivationStatus = async (activationId: string, userId: string, status: 'approved' | 'rejected') => {
    if (!window.confirm(`Are you sure you want to ${status} this activation request?`)) return;

    try {
      await updateDoc(doc(db, 'activations', activationId), { status });
      await updateDoc(doc(db, 'users', userId), { activationStatus: status });
      setActionMessage({ type: 'success', text: `Activation request ${status} successfully.` });
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to update activation status' });
    }
    setTimeout(() => setActionMessage(null), 3000);
  };

  const handleDeleteUser = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    try {
      await deleteDoc(doc(db, 'users', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${id}`);
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setEditUsername(user.username);
    setEditWelcomeBonus((user.welcomeBonus || 0).toString());
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;
    setEditLoading(true);
    try {
      await updateDoc(doc(db, 'users', editingUser.id), {
        username: editUsername,
        welcomeBonus: parseFloat(editWelcomeBonus) || 0
      });
      setEditingUser(null);
      setActionMessage({ type: 'success', text: 'User updated successfully.' });
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${editingUser.id}`);
      setActionMessage({ type: 'error', text: 'Failed to update user.' });
      setTimeout(() => setActionMessage(null), 3000);
    } finally {
      setEditLoading(false);
    }
  };

  const handleSendResetEmail = async (email: string, userId: string) => {
    if (!window.confirm(`Send password reset email to ${email}?`)) return;
    
    setResetEmailLoading(userId);
    try {
      await sendPasswordResetEmail(auth, email);
      setActionMessage({ type: 'success', text: `Password reset email sent to ${email}` });
    } catch (err: any) {
      console.error(err);
      setActionMessage({ type: 'error', text: err.message || 'Failed to send reset email' });
    } finally {
      setResetEmailLoading(null);
      setTimeout(() => setActionMessage(null), 3000);
    }
  };

  const handleResetApp = async () => {
    if (!window.confirm('CRITICAL ACTION: This will delete ALL platform data (Users, Withdrawals, Activities, etc.). Ads will be preserved. Are you absolutely sure?')) return;
    
    setResetAppLoading(true);
    try {
      // Helper function to delete collection in chunks to stay under 500 limit
      const deleteCollection = async (collectionPath: string) => {
        const snap = await getDocs(collection(db, collectionPath));
        let batch = writeBatch(db);
        let count = 0;
        
        for (const d of snap.docs) {
          batch.delete(d.ref);
          count++;
          if (count === 450) {
            await batch.commit();
            batch = writeBatch(db);
            count = 0;
          }
        }
        if (count > 0) await batch.commit();
      };

      // 1. Delete all withdrawals
      await deleteCollection('withdrawals');
      
      // 2. Delete all activities
      await deleteCollection('activities');
      
      // 3. Delete users and their subcollections
      const usersSnap = await getDocs(collection(db, 'users'));
      for (const userDoc of usersSnap.docs) {
        // Skip the main admin
        if (userDoc.data().email === 'danlamimathias2025@gmail.com') {
          // But clear admin's subcollections if they exist
          await deleteCollection(`users/${userDoc.id}/clicks`);
          await deleteCollection(`users/${userDoc.id}/checkins`);
          await deleteCollection(`users/${userDoc.id}/achievements`);
          
          // Reset admin balance to default
          await updateDoc(userDoc.ref, {
            balance: 80000,
            totalEarnings: 80000,
            welcomeBonus: 80000
          });
          continue;
        }
        
        // Delete user's subcollections
        await deleteCollection(`users/${userDoc.id}/clicks`);
        await deleteCollection(`users/${userDoc.id}/checkins`);
        await deleteCollection(`users/${userDoc.id}/achievements`);
        
        // Delete user document
        await deleteDoc(userDoc.ref);
      }
      
      setActionMessage({ type: 'success', text: 'Application data has been fully reset.' });
    } catch (err: any) {
      console.error('Reset error:', err);
      setActionMessage({ type: 'error', text: err.message || 'Failed to reset application' });
    } finally {
      setResetAppLoading(false);
      setTimeout(() => setActionMessage(null), 5000);
    }
  };

  const [autoGenLoading, setAutoGenLoading] = useState(false);

  const handleAutoGenerateAds = async () => {
    if (!window.confirm('This will automatically generate 5 daily ads with ₦500 rewards. Continue?')) return;
    
    setAutoGenLoading(true);
    try {
      const defaultAds = [
        { title: 'Watch Video & Earn', url: 'https://www.youtube.com' },
        { title: 'Visit Website Task 1', url: 'https://google.com' },
        { title: 'Special Promo Click', url: 'https://bing.com' },
        { title: 'Premium Reward Ad', url: 'https://yahoo.com' },
        { title: 'Quick Earning Link', url: 'https://duckduckgo.com' }
      ];

      for (const ad of defaultAds) {
        await addDoc(collection(db, 'ads'), {
          title: ad.title,
          url: ad.url,
          rewardAmount: 500,
          createdAt: serverTimestamp()
        });
      }
      setActionMessage({ type: 'success', text: '5 Ads successfully auto-generated!' });
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to generate ads' });
    } finally {
      setAutoGenLoading(false);
      setTimeout(() => setActionMessage(null), 3000);
    }
  };

  const [updatingAds, setUpdatingAds] = useState(false);

  const handleUpdateAllAdsTo500 = async () => {
    if (!window.confirm('This will update ALL existing ads to have a ₦500 reward. Continue?')) return;
    
    setUpdatingAds(true);
    try {
      const snap = await getDocs(collection(db, 'ads'));
      let count = 0;
      for (const d of snap.docs) {
        await updateDoc(d.ref, { rewardAmount: 500 });
        count++;
      }
      setActionMessage({ type: 'success', text: `Successfully updated ${count} ads to ₦500!` });
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to update ads' });
    } finally {
      setUpdatingAds(false);
      setTimeout(() => setActionMessage(null), 3000);
    }
  };

  const pendingWithdrawals = withdrawals.filter(w => w.status === 'pending' || w.status === 'processing');
  const withdrawalHistory = withdrawals.filter(w => w.status !== 'pending' && w.status !== 'processing');

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <button
        onClick={() => navigate('/')}
        className="mb-6 inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Dashboard
      </button>

      <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-8 flex items-start justify-between">
        <div className="flex items-start space-x-4">
          <ShieldAlert className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h2 className="text-lg font-bold text-red-900">Admin Panel</h2>
            <p className="text-sm text-red-700 mt-1">Manage available advertisements, withdrawals, and users here. Only administrators can see this section.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleResetApp}
          disabled={resetAppLoading}
          className="inline-flex items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-lg text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors disabled:opacity-50"
        >
          {resetAppLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCcw className="h-4 w-4 mr-2" />}
          Reset Application
        </button>
      </div>

      {actionMessage && (
        <div className={`mb-6 p-4 rounded-xl flex items-center justify-between shadow-sm border ${
          actionMessage.type === 'success' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'
        }`}>
          <div className="flex items-center">
            {actionMessage.type === 'success' ? <CheckCircle className="h-5 w-5 mr-2" /> : <XCircle className="h-5 w-5 mr-2" />}
            <span className="text-sm font-bold uppercase tracking-tight">{actionMessage.text}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="text-gray-400 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-2 mb-6 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveTab('ads')}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'ads' ? 'bg-blue-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`}
        >
          Manage Ads
        </button>
        <button
          onClick={() => setActiveTab('withdrawals')}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex items-center ${activeTab === 'withdrawals' ? 'bg-blue-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`}
        >
          Withdrawals
          {pendingWithdrawals.length > 0 && (
            <span className="ml-2 bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full">
              {pendingWithdrawals.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex items-center ${activeTab === 'users' ? 'bg-blue-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`}
        >
          <Users className="h-4 w-4 mr-2" />
          Manage Users
        </button>
        <button
          onClick={() => setActiveTab('activations')}
          className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeTab === 'activations' ? 'bg-blue-900 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <ShieldAlert className="h-4 w-4 mr-2" />
          Activations
          {activations.filter(a => a.status === 'pending').length > 0 && (
            <span className="ml-2 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
              {activations.filter(a => a.status === 'pending').length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'ads' && (
        <>
          <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-6 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Add New Ad</h3>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={handleUpdateAllAdsTo500}
                  disabled={updatingAds}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-900 disabled:opacity-50 transition-all"
                >
                  {updatingAds ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCcw className="h-4 w-4 mr-2" />}
                  Update All to ₦500
                </button>
                <button
                  type="button"
                  onClick={handleAutoGenerateAds}
                  disabled={autoGenLoading}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 transition-all"
                >
                  {autoGenLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                  Auto-Generate 5 Daily Ads (₦500)
                </button>
              </div>
            </div>
            <form onSubmit={handleAddAd} className="space-y-4">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</div>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-900 focus:border-blue-900 sm:text-sm"
                placeholder="Click here to earn ₦500!"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">URL</label>
              <input
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-900 focus:border-blue-900 sm:text-sm"
                placeholder="https://example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Reward Amount (₦)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={rewardAmount}
                onChange={(e) => setRewardAmount(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-900 focus:border-blue-900 sm:text-sm"
                placeholder="500.00"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-900 hover:bg-blue-950 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-900 disabled:opacity-70"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            Add Ad
          </button>
        </form>
      </div>

      <div className="bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Current Ads</h3>
        </div>
        <ul className="divide-y divide-gray-200">
          {ads.length === 0 ? (
            <li className="p-6 text-center text-gray-500 text-sm">No ads created yet.</li>
          ) : (
            ads.map(ad => (
              <li key={ad.id} className="p-6 flex items-center justify-between hover:bg-gray-50">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">{ad.title}</h4>
                  <p className="text-sm text-gray-500 mt-1">{ad.url}</p>
                  <p className="text-xs font-medium text-green-600 mt-1">Reward: ₦{ad.rewardAmount.toLocaleString()}</p>
                </div>
                <button
                  onClick={() => handleDeleteAd(ad.id)}
                  className="p-2 text-gray-400 hover:text-red-600 transition-colors rounded-full hover:bg-red-50"
                  title="Delete Ad"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
        </>
      )}

      {activeTab === 'withdrawals' && (
        <>
      <div className="bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-amber-200 bg-amber-50">
          <h3 className="text-lg font-medium text-amber-900">Pending Withdrawals</h3>
        </div>
        <ul className="divide-y divide-gray-200">
          {pendingWithdrawals.length === 0 ? (
            <li className="p-6 text-center text-gray-500 text-sm">No pending withdrawal requests.</li>
          ) : (
            pendingWithdrawals.map(w => (
              <li key={w.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-gray-50 gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-gray-900">{w.username}</h4>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      w.status === 'processing' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {w.status === 'processing' ? 'Processing' : 'Pending'}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-green-600 mt-1">Amount: ₦{w.amount.toLocaleString()}</p>
                  <p className="text-xs text-gray-500 mt-1">Bank: {w.bankName}</p>
                  <p className="text-xs text-gray-500">Account: {w.accountNumber} ({w.accountName})</p>
                </div>
                
                <div className="flex items-center gap-2">
                  {w.status === 'pending' && (
                    <button
                      type="button"
                      onClick={() => handleUpdateWithdrawalStatus(w.id, 'processing')}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Process
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleUpdateWithdrawalStatus(w.id, 'approved')}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Complete
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateWithdrawalStatus(w.id, 'rejected')}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Reject
                  </button>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>

      <div className="bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden mt-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Withdrawal History</h3>
        </div>
        <ul className="divide-y divide-gray-200">
          {withdrawalHistory.length === 0 ? (
            <li className="p-6 text-center text-gray-500 text-sm">No withdrawal history yet.</li>
          ) : (
            withdrawalHistory.map(w => (
              <li key={w.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-gray-50 gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-gray-900">{w.username}</h4>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      w.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {w.status === 'approved' ? 'Completed' : 'Rejected'}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-green-600 mt-1">Amount: ₦{w.amount.toLocaleString()}</p>
                  <p className="text-xs text-gray-500 mt-1">Bank: {w.bankName}</p>
                  <p className="text-xs text-gray-500">Account: {w.accountNumber} ({w.accountName})</p>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
        </>
      )}

      {activeTab === 'users' && (
        <div className="bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Registered Users</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Earnings (₦)</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Withdrawn (₦)</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance (₦)</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">No users found.</td>
                  </tr>
                ) : (
                  users.map(user => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-900 font-bold text-lg">{user.username.charAt(0).toUpperCase()}</span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{user.username}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-green-600">
                          ₦{userStats[user.id] ? userStats[user.id].earnings.toLocaleString() : '...'}
                        </div>
                        {(user.welcomeBonus || 0) > 0 && (
                          <div className="text-xs text-gray-500">Bonus: ₦{(user.welcomeBonus || 0).toLocaleString()}</div>
                        )}
                        {userStats[user.id] && userStats[user.id].checkins > 0 && (
                          <div className="text-xs text-blue-500">Check-ins: ₦{userStats[user.id].checkins.toLocaleString()}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          ₦{userStats[user.id] ? userStats[user.id].withdrawn.toLocaleString() : '...'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-900">
                          ₦{userStats[user.id] ? userStats[user.id].balance.toLocaleString() : '...'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.createdAt?.toDate ? user.createdAt.toDate().toLocaleDateString() : 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          type="button"
                          onClick={() => handleSendResetEmail(user.email, user.id)}
                          disabled={resetEmailLoading === user.id}
                          className="text-blue-600 hover:text-blue-900 mr-4 disabled:opacity-50"
                          title="Send Password Reset Email"
                        >
                          {resetEmailLoading === user.id ? <Loader2 className="h-5 w-5 inline animate-spin" /> : <Mail className="h-5 w-5 inline" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEditUser(user)}
                          className="text-blue-900 hover:text-blue-950 mr-4"
                          title="Edit User"
                        >
                          <Edit2 className="h-5 w-5 inline" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete User"
                        >
                          <Trash2 className="h-5 w-5 inline" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'activations' && (
        <div className="bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
            <h3 className="text-lg font-medium text-gray-900">Activation Requests</h3>
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
              {activations.filter(a => a.status === 'pending').length} Pending Requests
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Receipt</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {activations.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500">
                      <div className="flex flex-col items-center">
                        <CheckCircle className="h-10 w-10 text-gray-200 mb-3" />
                        <p>No activation requests found.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  activations.map(act => (
                    <tr key={act.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{act.username}</div>
                        <div className="text-xs text-gray-500">ID: {act.userId}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button 
                          onClick={() => window.open(act.receiptImage, '_blank')}
                          className="flex items-center text-blue-900 hover:text-blue-700 text-xs font-bold uppercase tracking-tight"
                        >
                          <ImageIcon className="h-4 w-4 mr-1.5" />
                          View Image
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                        {act.createdAt?.toDate?.() ? act.createdAt.toDate().toLocaleString() : 'Just now'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                          act.status === 'approved' ? 'bg-green-100 text-green-800' :
                          act.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {act.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {act.status === 'pending' && (
                          <div className="flex justify-end space-x-3">
                            <button
                              type="button"
                              onClick={() => handleUpdateActivationStatus(act.id, act.userId, 'approved')}
                              className="text-green-600 hover:text-green-900 flex items-center"
                              title="Approve"
                            >
                              <CheckCircle className="h-5 w-5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateActivationStatus(act.id, act.userId, 'rejected')}
                              className="text-red-600 hover:text-red-900 flex items-center"
                              title="Reject"
                            >
                              <XCircle className="h-5 w-5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setEditingUser(null)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-purple-100 sm:mx-0 sm:h-10 sm:w-10">
                    <Edit2 className="h-6 w-6 text-blue-900" aria-hidden="true" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                        Edit User: {editingUser.email}
                      </h3>
                      <button onClick={() => setEditingUser(null)} className="text-gray-400 hover:text-gray-500">
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                    <div className="mt-4 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Username</label>
                        <input
                          type="text"
                          value={editUsername}
                          onChange={(e) => setEditUsername(e.target.value)}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-900 focus:border-blue-900 sm:text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Bonus / Compensation (₦)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={editWelcomeBonus}
                          onChange={(e) => setEditWelcomeBonus(e.target.value)}
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-900 focus:border-blue-900 sm:text-sm"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          This value acts as an admin-awarded bonus. The user's total balance is this value + ad earnings - withdrawals.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleSaveUser}
                  disabled={editLoading}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-900 text-base font-medium text-white hover:bg-blue-950 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-900 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-70"
                >
                  {editLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-900 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
