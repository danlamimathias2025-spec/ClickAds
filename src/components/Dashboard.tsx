import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, addDoc, serverTimestamp, getDoc, query, where } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { LogOut, ExternalLink, MousePointerClick, Loader2, ShieldAlert, Clock, Info, Wallet, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const NIGERIAN_BANKS = [
  'Palmpay',
  'Opay MFB',
  'Moniepoint MFB',
  'Kuda Bank',
  'First Bank of Nigeria',
  'Guaranty Trust Bank (GTB)',
  'Zenith Bank',
  'United Bank for Africa (UBA)',
  'Access Bank',
  'Fidelity Bank',
  'First City Monument Bank (FCMB)',
  'Stanbic IBTC Bank',
  'Wema Bank',
  'VFD Microfinance Bank',
  'PiggyVest (Providus)'
];

interface Ad {
  id: string;
  title: string;
  url: string;
  rewardAmount: number;
}

interface Click {
  adId: string;
  rewardAmount: number;
  clickedAt?: any;
}

interface Withdrawal {
  id: string;
  amount: number;
  bankName: string;
  accountNumber: string;
  status: string;
  createdAt: any;
}

export function Dashboard() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [clicks, setClicks] = useState<Click[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [username, setUsername] = useState<string>('');
  const [welcomeBonus, setWelcomeBonus] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [verifyingAdId, setVerifyingAdId] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  
  // Withdrawal Modal State
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawError, setWithdrawError] = useState('');
  
  const navigate = useNavigate();

  const userId = auth.currentUser?.uid;
  const isAdmin = auth.currentUser?.email === 'danlamimathias2025@gmail.com';

  useEffect(() => {
    if (!userId) return;

    // Fetch user profile
    const fetchUser = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          setUsername(userDoc.data().username);
          setWelcomeBonus(userDoc.data().welcomeBonus || 0);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `users/${userId}`);
      }
    };
    fetchUser();

    // Listen to ads
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

    // Listen to user clicks
    const unsubscribeClicks = onSnapshot(
      collection(db, 'users', userId, 'clicks'),
      (snapshot) => {
        const clicksData = snapshot.docs.map(doc => doc.data() as Click);
        setClicks(clicksData);
        setLoading(false);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, `users/${userId}/clicks`)
    );

    // Listen to user withdrawals
    const qWithdrawals = query(collection(db, 'withdrawals'), where('userId', '==', userId));
    const unsubscribeWithdrawals = onSnapshot(
      qWithdrawals,
      (snapshot) => {
        const withdrawalsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Withdrawal[];
        setWithdrawals(withdrawalsData);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, `withdrawals`)
    );

    return () => {
      unsubscribeAds();
      unsubscribeClicks();
      unsubscribeWithdrawals();
    };
  }, [userId]);

  // Anti-cheat timer logic
  useEffect(() => {
    if (countdown > 0 && verifyingAdId) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && verifyingAdId) {
      const recordClick = async () => {
        const ad = ads.find(a => a.id === verifyingAdId);
        if (ad && userId) {
          try {
            await setDoc(doc(db, 'users', userId, 'clicks', ad.id), {
              adId: ad.id,
              rewardAmount: ad.rewardAmount,
              clickedAt: serverTimestamp()
            });
          } catch (err) {
            handleFirestoreError(err, OperationType.CREATE, `users/${userId}/clicks/${ad.id}`);
          }
        }
        setVerifyingAdId(null);
      };
      recordClick();
    }
  }, [countdown, verifyingAdId, ads, userId]);

  const handleSignOut = () => {
    signOut(auth);
  };

  const handleClickAd = (ad: Ad) => {
    if (!userId || verifyingAdId) return;
    
    // Open URL in new tab
    window.open(ad.url, '_blank', 'noopener,noreferrer');
    
    // Start verification countdown
    setVerifyingAdId(ad.id);
    setCountdown(5);
  };

  const totalClicks = clicks.reduce((sum, click) => sum + click.rewardAmount, 0);
  const totalWithdrawals = withdrawals.filter(w => w.status !== 'rejected').reduce((sum, w) => sum + w.amount, 0);
  const balance = welcomeBonus + totalClicks - totalWithdrawals;
  
  const clickedAdIds = new Set(clicks.map(c => c.adId));
  const availableAds = ads.filter(ad => !clickedAdIds.has(ad.id));
  const completedAds = ads.filter(ad => clickedAdIds.has(ad.id));

  const DAILY_LIMIT = 20;
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const clicksToday = clicks.filter(click => {
    if (!click.clickedAt) return true; // optimistic UI
    const clickDate = click.clickedAt.toDate ? click.clickedAt.toDate() : new Date(click.clickedAt);
    return clickDate >= startOfDay;
  }).length;

  const isLimitReached = clicksToday >= DAILY_LIMIT;

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      setWithdrawError('Please enter a valid amount.');
      return;
    }
    
    if (amount > balance) {
      setWithdrawError('Insufficient balance.');
      return;
    }

    setWithdrawLoading(true);
    setWithdrawError('');

    try {
      await addDoc(collection(db, 'withdrawals'), {
        userId,
        username: username || auth.currentUser?.email || 'Unknown',
        amount,
        bankName,
        accountNumber,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      setShowWithdrawModal(false);
      setWithdrawAmount('');
      setBankName('');
      setAccountNumber('');
    } catch (err: any) {
      setWithdrawError(err.message || 'Failed to submit withdrawal request.');
      handleFirestoreError(err, OperationType.CREATE, `withdrawals`);
    } finally {
      setWithdrawLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <MousePointerClick className="h-8 w-8 text-indigo-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">ClickAds</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500 hidden sm:block">
                Welcome, <span className="font-medium text-gray-900">{username || auth.currentUser?.email}</span>
              </span>
              {isAdmin && (
                <button
                  onClick={() => navigate('/admin')}
                  className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                >
                  <ShieldAlert className="h-4 w-4 mr-2" />
                  Admin
                </button>
              )}
              <button
                onClick={handleSignOut}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Balance Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center">
            <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mr-4">
              <Wallet className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Your Balance</h2>
              <div className="mt-1 flex items-baseline text-4xl font-extrabold text-green-600">
                ₦{balance.toFixed(2)}
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowWithdrawModal(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-xl shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
          >
            Withdraw Funds
          </button>
        </div>

        {welcomeBonus > 0 && clicks.length === 0 && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-8 flex items-start">
            <Info className="h-5 w-5 text-indigo-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h3 className="text-indigo-800 font-medium">Welcome Bonus!</h3>
              <p className="text-indigo-700 text-sm mt-1">
                You've received a welcome bonus of ₦{welcomeBonus.toFixed(2)}. Start completing tasks to earn more!
              </p>
            </div>
          </div>
        )}

        {isLimitReached && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8 flex items-start">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h3 className="text-blue-800 font-medium">Daily Limit Reached</h3>
              <p className="text-blue-700 text-sm mt-1">
                You have reached your daily earning limit of {DAILY_LIMIT} tasks. Please come back tomorrow for more opportunities!
              </p>
            </div>
          </div>
        )}

        {verifyingAdId && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8 flex items-center justify-between animate-pulse">
            <div className="flex items-center text-amber-800">
              <Clock className="h-5 w-5 mr-2" />
              <span className="font-medium">Verifying your visit... Please stay on the page.</span>
            </div>
            <div className="text-amber-800 font-bold text-lg">
              {countdown}s
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Available Ads */}
          <div className="lg:col-span-2 space-y-6">
            <h3 className="text-lg font-bold text-gray-900 flex items-center">
              Available Tasks
              <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                {availableAds.length} available
              </span>
            </h3>
            
            {availableAds.length === 0 ? (
              <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
                <MousePointerClick className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No tasks available</h3>
                <p className="mt-1 text-sm text-gray-500">Check back later for more earning opportunities.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {availableAds.map(ad => (
                  <div key={ad.id} className={`bg-white rounded-xl shadow-sm border ${verifyingAdId === ad.id ? 'border-amber-400 ring-2 ring-amber-100' : 'border-gray-200'} p-5 transition-all`}>
                    <h4 className="font-semibold text-gray-900 mb-2 line-clamp-2">{ad.title}</h4>
                    <div className="flex items-center justify-between mt-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-sm font-medium bg-green-50 text-green-700 border border-green-200">
                        +₦{ad.rewardAmount.toFixed(2)}
                      </span>
                      <button
                        onClick={() => handleClickAd(ad)}
                        disabled={verifyingAdId !== null || isLimitReached}
                        className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white ${
                          verifyingAdId === ad.id 
                            ? 'bg-amber-500 hover:bg-amber-600' 
                            : isLimitReached
                              ? 'bg-gray-400 cursor-not-allowed'
                              : 'bg-indigo-600 hover:bg-indigo-700'
                        } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-70 transition-colors`}
                      >
                        {verifyingAdId === ad.id ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            {countdown}s
                          </>
                        ) : (
                          <>
                            Earn ₦{ad.rewardAmount.toFixed(2)}
                            <ExternalLink className="ml-2 h-4 w-4" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Withdrawals & Completed Ads */}
          <div className="space-y-6">
            {withdrawals.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Withdrawals</h3>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <ul className="divide-y divide-gray-200">
                    {withdrawals.map(w => (
                      <li key={w.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">₦{w.amount.toFixed(2)}</p>
                            <p className="text-xs text-gray-500">{w.bankName}</p>
                          </div>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            w.status === 'approved' ? 'bg-green-100 text-green-800' :
                            w.status === 'rejected' ? 'bg-red-100 text-red-800' :
                            'bg-amber-100 text-amber-800'
                          }`}>
                            {w.status.charAt(0).toUpperCase() + w.status.slice(1)}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <h3 className="text-lg font-bold text-gray-900">Completed Tasks</h3>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {completedAds.length === 0 ? (
                <div className="p-6 text-center text-sm text-gray-500">
                  You haven't completed any tasks yet.
                </div>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {completedAds.map(ad => (
                    <li key={ad.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900 truncate pr-4">{ad.title}</p>
                        <span className="inline-flex items-center text-xs font-medium text-green-600">
                          +₦{ad.rewardAmount.toFixed(2)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Withdrawal Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setShowWithdrawModal(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-green-100 sm:mx-0 sm:h-10 sm:w-10">
                    <Wallet className="h-6 w-6 text-green-600" aria-hidden="true" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                        Withdraw Funds
                      </h3>
                      <button onClick={() => setShowWithdrawModal(false)} className="text-gray-400 hover:text-gray-500">
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500 mb-4">
                        Available Balance: <span className="font-bold text-gray-900">₦{balance.toFixed(2)}</span>
                      </p>
                      
                      <form onSubmit={handleWithdraw} className="space-y-4">
                        {withdrawError && (
                          <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{withdrawError}</div>
                        )}
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Amount (₦)</label>
                          <input
                            type="number"
                            required
                            min="1"
                            max={balance}
                            step="0.01"
                            value={withdrawAmount}
                            onChange={(e) => setWithdrawAmount(e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                            placeholder="500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Bank Name</label>
                          <select
                            required
                            value={bankName}
                            onChange={(e) => setBankName(e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                          >
                            <option value="" disabled>Select a bank</option>
                            {NIGERIAN_BANKS.map(bank => (
                              <option key={bank} value={bank}>{bank}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Account Number</label>
                          <input
                            type="text"
                            required
                            value={accountNumber}
                            onChange={(e) => setAccountNumber(e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                            placeholder="0123456789"
                          />
                        </div>
                        <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                          <button
                            type="submit"
                            disabled={withdrawLoading || balance <= 0}
                            className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-70"
                          >
                            {withdrawLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit Request'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowWithdrawModal(false)}
                            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
