import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { LogOut, DollarSign, ExternalLink, MousePointerClick, Loader2, ShieldAlert, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Ad {
  id: string;
  title: string;
  url: string;
  rewardAmount: number;
}

interface Click {
  adId: string;
  rewardAmount: number;
}

export function Dashboard() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [clicks, setClicks] = useState<Click[]>([]);
  const [username, setUsername] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [verifyingAdId, setVerifyingAdId] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
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

    return () => {
      unsubscribeAds();
      unsubscribeClicks();
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

  const balance = clicks.reduce((sum, click) => sum + click.rewardAmount, 0);
  const clickedAdIds = new Set(clicks.map(c => c.adId));
  const availableAds = ads.filter(ad => !clickedAdIds.has(ad.id));
  const completedAds = ads.filter(ad => clickedAdIds.has(ad.id));

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
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Your Balance</h2>
            <div className="mt-1 flex items-baseline text-4xl font-extrabold text-indigo-600">
              ${balance.toFixed(2)}
            </div>
          </div>
          <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
            <DollarSign className="h-8 w-8 text-green-600" />
          </div>
        </div>

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
                        +${ad.rewardAmount.toFixed(2)}
                      </span>
                      <button
                        onClick={() => handleClickAd(ad)}
                        disabled={verifyingAdId !== null}
                        className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white ${
                          verifyingAdId === ad.id 
                            ? 'bg-amber-500 hover:bg-amber-600' 
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
                            Earn ${ad.rewardAmount.toFixed(2)}
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

          {/* Completed Ads */}
          <div className="space-y-6">
            <h3 className="text-lg font-bold text-gray-900">Completed</h3>
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
                          +${ad.rewardAmount.toFixed(2)}
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
    </div>
  );
}
