import React, { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp, onSnapshot, deleteDoc, doc, updateDoc, query } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Plus, Trash2, Loader2, ShieldAlert, ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
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
  status: string;
  createdAt: any;
}

export function Admin() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [rewardAmount, setRewardAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribeAds = onSnapshot(
      collection(db, 'ads'),
      (snapshot) => {
        const adsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Ad[];
        setAds(adsData);
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

    return () => {
      unsubscribeAds();
      unsubscribeWithdrawals();
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

  const pendingWithdrawals = withdrawals.filter(w => w.status === 'pending');
  const withdrawalHistory = withdrawals.filter(w => w.status !== 'pending');

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <button
        onClick={() => navigate('/')}
        className="mb-6 inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Dashboard
      </button>

      <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-8 flex items-start space-x-4">
        <ShieldAlert className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
        <div>
          <h2 className="text-lg font-bold text-red-900">Admin Panel</h2>
          <p className="text-sm text-red-700 mt-1">Manage available advertisements here. Only administrators can see this section.</p>
        </div>
      </div>

      <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-6 mb-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Ad</h3>
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
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Click here to earn ₦50!"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">URL</label>
              <input
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
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
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="50.00"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-70"
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
                  <p className="text-xs font-medium text-green-600 mt-1">Reward: ₦{ad.rewardAmount.toFixed(2)}</p>
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

      <div className="bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden mt-8">
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
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                      Pending
                    </span>
                  </div>
                  <p className="text-sm font-medium text-green-600 mt-1">Amount: ₦{w.amount.toFixed(2)}</p>
                  <p className="text-xs text-gray-500 mt-1">Bank: {w.bankName}</p>
                  <p className="text-xs text-gray-500">Account: {w.accountNumber}</p>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleUpdateWithdrawalStatus(w.id, 'approved')}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Approve
                  </button>
                  <button
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
                      {w.status.charAt(0).toUpperCase() + w.status.slice(1)}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-green-600 mt-1">Amount: ₦{w.amount.toFixed(2)}</p>
                  <p className="text-xs text-gray-500 mt-1">Bank: {w.bankName}</p>
                  <p className="text-xs text-gray-500">Account: {w.accountNumber}</p>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
