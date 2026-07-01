import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, addDoc, updateDoc, serverTimestamp, getDoc, query, where, increment, orderBy, limit } from 'firebase/firestore';
import { signOut, updateEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { toast } from 'sonner';
import { LogOut, ExternalLink, MousePointerClick, Loader2, ShieldAlert, Clock, Info, Wallet, X, Home, User, Banknote, CheckCircle, Trophy, HelpCircle, ChevronDown, ChevronUp, Settings, Mail, Lock, Calendar, Edit2, Save, AlertCircle, BarChart3, ArrowRightLeft, CreditCard, ChevronRight, Upload, Image as ImageIcon, Award, Crown, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

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

const isWithdrawalWindow = () => {
  const now = new Date();
  const day = now.getUTCDay();
  const date = now.getUTCDate();
  const hour = now.getUTCHours();
  return day === 5 && date <= 7 && hour >= 8 && hour < 10;
};

interface Ad {
  id: string;
  title: string;
  url: string;
  rewardAmount: number;
  createdAt?: any;
  cycle?: number;
}

interface Click {
  adId: string;
  rewardAmount: number;
  clickedAt?: any;
  cycle?: number;
}

interface CheckIn {
  rewardAmount: number;
  checkedAt: any;
  date: string;
}

interface Achievement {
  id: string;
  type: string;
  title: string;
  rewardAmount: number;
  awardedAt: any;
}

interface Withdrawal {
  id: string;
  referenceId?: string;
  amount: number;
  bankName: string;
  accountNumber: string;
  accountName: string;
  status: string;
  createdAt: any;
}

interface LeaderboardUser {
  id: string;
  username: string;
  totalEarnings: number;
}

interface Activity {
  id: string;
  userId: string;
  username: string;
  type: 'withdrawal' | 'achievement' | 'click' | 'checkin';
  amount?: number;
  title?: string;
  createdAt: any;
}

export function Dashboard() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [clicks, setClicks] = useState<Click[]>([]);
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [showAchievementBadge, setShowAchievementBadge] = useState<Achievement | null>(null);
  const [username, setUsername] = useState<string>('');
  const [welcomeBonus, setWelcomeBonus] = useState<number>(0);
  const [userBalance, setUserBalance] = useState<number | null>(null);
  const [activationStatus, setActivationStatus] = useState<'none' | 'pending' | 'approved' | 'rejected'>('none');
  const [userCreatedAt, setUserCreatedAt] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [verifyingAdId, setVerifyingAdId] = useState<string | null>(null);
  const [successAdId, setSuccessAdId] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [currentDay, setCurrentDay] = useState(new Date().toDateString());
  
  // Refresh daily state at midnight
  useEffect(() => {
    const interval = setInterval(() => {
      const today = new Date().toDateString();
      if (today !== currentDay) {
        setCurrentDay(today);
      }
    }, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [currentDay]);
  
  // Withdrawal State
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawError, setWithdrawError] = useState('');
  const [activeTab, setActiveTab] = useState<'home' | 'wallet' | 'leaderboard' | 'profile'>('home');
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  
  // Activation State
  const [activationLoading, setActivationLoading] = useState(false);
  const [activationReceipt, setActivationReceipt] = useState<string | null>(null);
  
  // Profile State
  const [newUsername, setNewUsername] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);

  const navigate = useNavigate();

  const triggerConfetti = () => {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      // since particles fall down, start a bit higher than random
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);
  };

  const getChartData = () => {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        name: d.toLocaleString('default', { month: 'short' }),
        month: d.getMonth(),
        year: d.getFullYear(),
        amount: 0
      });
    }

    clicks.forEach(click => {
      if (click.clickedAt) {
        const date = click.clickedAt.toDate();
        const mIndex = months.findIndex(m => m.month === date.getMonth() && m.year === date.getFullYear());
        if (mIndex !== -1) {
          months[mIndex].amount += click.rewardAmount;
        }
      }
    });

    checkins.forEach(ci => {
      if (ci.checkedAt) {
        const date = ci.checkedAt.toDate();
        const mIndex = months.findIndex(m => m.month === date.getMonth() && m.year === date.getFullYear());
        if (mIndex !== -1) {
          months[mIndex].amount += ci.rewardAmount;
        }
      }
    });

    if (userCreatedAt) {
      const date = userCreatedAt.toDate();
      const mIndex = months.findIndex(m => m.month === date.getMonth() && m.year === date.getFullYear());
      if (mIndex !== -1) {
        months[mIndex].amount += welcomeBonus;
      }
    }

    return months;
  };

  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const chartData = getChartData();
  const totalMonthlyEarnings = chartData.reduce((acc, curr) => acc + curr.amount, 0);

  const faqData = [
    {
      q: "How do I earn rewards?",
      a: "You can earn rewards by clicking on available ad tasks and performing your daily check-in. Each ad click pays a reward, and checking in daily adds ₦500 to your balance."
    },
    {
      q: "What is the minimum withdrawal amount?",
      a: "To ensure sustainable payouts, the minimum withdrawal limit is set to ₦300,000."
    },
    {
      q: "When are withdrawals processed?",
      a: "Withdrawals are processed on the first Friday of every month. Requests submitted before this day will be batched and processed during the first-Friday window."
    },
    {
      q: "Are there any hidden fees?",
      a: "No, ClickAds is free to use. We do not require any 'activation deposits' or hidden fees to withdraw your hard-earned money."
    }
  ];

  // Simulation names and actions
  const SIMULATED_NAMES = [
    'Chukwudi O.', 'Olamide A.', 'Fatima B.', 'Emeka J.', 'Amina S.', 
    'Tunde W.', 'Ngozi E.', 'Ibrahim K.', 'Chinonso M.', 'Oluchi P.',
    'Babatunde R.', 'Zainab L.', 'Uche G.', 'Folake V.', 'Damilola T.',
    'Ifeanyi Q.', 'Kelechi S.', 'Adeola N.', 'Yusuf M.', 'Blessing O.',
    'Oluwaseun F.', 'Adebayo D.', 'Chisom K.', 'Temitope L.', 'Nneka J.',
    'Abubakar H.', 'Ogechi V.', 'Mustapha G.', 'Joy A.', 'Ebuka P.'
  ];

  const SIMULATED_ACTIONS = [
    { type: 'withdrawal', text: 'just requested a withdrawal of', min: 300000, max: 850000 },
    { type: 'click', text: 'just completed an ad task earning', min: 500, max: 500 },
    { type: 'checkin', text: 'just claimed their daily check-in bonus of', min: 500, max: 500 },
    { type: 'achievement', text: 'just unlocked the 50 Ads Clicked Badge!', amount: 1000 },
    { type: 'achievement', text: 'just earned the First 100k Badge!', amount: 1000 }
  ];

  const [simulatedActivities, setSimulatedActivities] = useState<any[]>([]);

  useEffect(() => {
    const generateActivity = () => {
      const name = SIMULATED_NAMES[Math.floor(Math.random() * SIMULATED_NAMES.length)];
      const action = SIMULATED_ACTIONS[Math.floor(Math.random() * SIMULATED_ACTIONS.length)];
      
      let amount = action.amount;
      if (action.min && action.max) {
        amount = Math.floor(Math.random() * (action.max - action.min + 1)) + action.min;
      }

      const newActivity = {
        id: `sim-${Date.now()}`,
        username: name,
        type: action.type,
        text: action.text,
        amount: amount,
        createdAt: new Date(),
        isSimulated: true
      };

      setSimulatedActivities(prev => [newActivity, ...prev].slice(0, 5));
      
      // Auto-remove after 8 seconds
      setTimeout(() => {
        setSimulatedActivities(prev => prev.filter(a => a.id !== newActivity.id));
      }, 8000);
    };

    const timer = setInterval(() => {
      if (Math.random() > 0.4) { // 60% chance to show an activity
        generateActivity();
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(timer);
  }, []);

  const userId = auth.currentUser?.uid;
  const isAdmin = auth.currentUser?.email === 'danlamimathias2025@gmail.com';

  useEffect(() => {
    if (!userId) return;

    // Fetch user profile
    const unsubscribeUser = onSnapshot(doc(db, 'users', userId), async (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setUsername(data.username);
        setWelcomeBonus(data.welcomeBonus || 0);
        setUserBalance(data.balance !== undefined ? data.balance : null);
        setActivationStatus(data.activationStatus || 'none');
        setUserCreatedAt(data.createdAt);

        // Check if welcome modal should be shown
        const hasSeenWelcome = localStorage.getItem(`welcome_seen_${userId}`);
        if (!hasSeenWelcome) {
          setShowWelcomeModal(true);
        }
      } else {
        // If user doc is missing (e.g. after a reset), recreate it
        try {
          const user = auth.currentUser;
          if (user) {
            await setDoc(doc(db, 'users', userId), {
              username: user.displayName || user.email?.split('@')[0] || 'Anonymous',
              email: user.email,
              welcomeBonus: 80000,
              totalEarnings: 80000,
              balance: 80000,
              activationStatus: 'none',
              createdAt: serverTimestamp()
            });
          }
        } catch (err) {
          console.error('Failed to recreate user profile:', err);
        }
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `users/${userId}`);
    });

    // Listen to ads
    const unsubscribeAds = onSnapshot(
      collection(db, 'ads'),
      async (snapshot) => {
        if (snapshot.empty) {
          if (isAdmin) {
            console.log('No ads found in database. Automatically generating 5 default daily ads...');
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
              toast.success('Daily ads have been automatically generated!');
            } catch (err) {
              console.error('Failed to automatically generate ads:', err);
            }
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
        if (incorrectAds.length > 0 && isAdmin) {
          console.log(`Found ${incorrectAds.length} ads with reward not equal to ₦500. Auto-healing...`);
          try {
            for (const ad of incorrectAds) {
              await updateDoc(doc(db, 'ads', ad.id), {
                rewardAmount: 500
              });
            }
            toast.success(`Automatically updated ${incorrectAds.length} ads to ₦500 reward!`);
          } catch (err) {
            console.error('Failed to automatically update ads to ₦500:', err);
          }
        }
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

    // Listen to check-ins
    const unsubscribeCheckins = onSnapshot(
      collection(db, 'users', userId, 'checkins'),
      (snapshot) => {
        const checkinsData = snapshot.docs.map(doc => doc.data() as CheckIn);
        setCheckins(checkinsData);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, `users/${userId}/checkins`)
    );

    // Listen to achievements
    const unsubscribeAchievements = onSnapshot(
      collection(db, 'users', userId, 'achievements'),
      (snapshot) => {
        const achievementsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Achievement[];
        setAchievements(achievementsData);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, `users/${userId}/achievements`)
    );

    // Leaderboard
    const qLeaderboard = query(
      collection(db, 'users'),
      orderBy('totalEarnings', 'desc'),
      limit(10)
    );
    const unsubscribeLeaderboard = onSnapshot(
      qLeaderboard,
      (snapshot) => {
        const lbData = snapshot.docs.map(doc => ({
          id: doc.id,
          username: doc.data().username || 'Anonymous',
          totalEarnings: doc.data().totalEarnings || 0
        })) as LeaderboardUser[];
        setLeaderboard(lbData);
      },
      (error) => console.error('Leaderboard fetch error:', error)
    );

    // Global Activities
    const qActivities = query(
      collection(db, 'activities'),
      orderBy('createdAt', 'desc'),
      limit(15)
    );
    const unsubscribeActivities = onSnapshot(
      qActivities,
      (snapshot) => {
        const activitiesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Activity[];
        setActivities(activitiesData);
      },
      (error) => console.error('Activities fetch error:', error)
    );

    return () => {
      unsubscribeAds();
      unsubscribeClicks();
      unsubscribeWithdrawals();
      unsubscribeCheckins();
      unsubscribeAchievements();
      unsubscribeLeaderboard();
      unsubscribeActivities();
      unsubscribeUser();
    };
  }, [userId]);

  // Achievement logic
  useEffect(() => {
    if (!userId || loading) return;

    const checkAchievements = async () => {
      const earnedTypes = achievements.map(a => a.type);
      
      // --- Ad Click Progression Badges ---
      // 1. Clicker Rookie: 10 clicks, reward ₦200
      if (!earnedTypes.includes('clicker_rookie') && clicks.length >= 10) {
        await awardAchievement('clicker_rookie', 'Clicker Rookie', 200);
      }

      // 2. Ad Enthusiast: 25 clicks, reward ₦500
      if (!earnedTypes.includes('ad_enthusiast') && clicks.length >= 25) {
        await awardAchievement('ad_enthusiast', 'Ad Enthusiast', 500);
      }

      // 3. Click Specialist: 50 clicks, reward ₦1,000
      if (!earnedTypes.includes('click_specialist') && !earnedTypes.includes('ads_clicked_50') && clicks.length >= 50) {
        await awardAchievement('click_specialist', 'Click Specialist', 1000);
      }

      // 4. Ad Titan: 100 clicks, reward ₦2,500
      if (!earnedTypes.includes('ad_titan') && clicks.length >= 100) {
        await awardAchievement('ad_titan', 'Ad Titan', 2500);
      }

      // 5. Click Emperor: 200 clicks, reward ₦5,000
      if (!earnedTypes.includes('click_emperor') && clicks.length >= 200) {
        await awardAchievement('click_emperor', 'Click Emperor', 5000);
      }

      // 6. First 100k Earned
      const totalClicks = clicks.reduce((acc, curr) => acc + curr.rewardAmount, 0);
      const totalCheckins = checkins.reduce((acc, curr) => acc + curr.rewardAmount, 0);
      if (!earnedTypes.includes('earnings_100k') && (welcomeBonus + totalClicks + totalCheckins) >= 100000) {
        await awardAchievement('earnings_100k', 'First 100k Earned', 1000);
      }

      // 7. 10 Days Active
      const activeDays = new Set(checkins.map(c => c.date)).size;
      if (!earnedTypes.includes('active_days') && activeDays >= 10) {
        await awardAchievement('active_days', '10 Days Active', 1000);
      }
    };

    const awardAchievement = async (type: string, title: string, reward: number) => {
      try {
        const achievementData = {
          type,
          title,
          rewardAmount: reward,
          awardedAt: serverTimestamp()
        };
        const docRef = await addDoc(collection(db, 'users', userId, 'achievements'), achievementData);
        
        // Update total earnings and balance on user doc
        await setDoc(doc(db, 'users', userId), {
          totalEarnings: increment(reward),
          balance: increment(reward)
        }, { merge: true });

        setShowAchievementBadge({ id: docRef.id, ...achievementData });
        triggerConfetti();
        toast.success(`Achievement Earned: ${title}! Reward: ₦${reward.toLocaleString()}`);

        // Log global activity
        await addDoc(collection(db, 'activities'), {
          userId,
          username: username || auth.currentUser?.email?.split('@')[0] || 'Anonymous',
          type: 'achievement',
          title,
          amount: reward,
          createdAt: serverTimestamp()
        });
      } catch (err) {
        console.error('Error awarding achievement:', err);
      }
    };

    checkAchievements();
  }, [clicks.length, checkins.length, welcomeBonus, achievements.length, userId, loading]);

  // Anti-cheat timer logic
  useEffect(() => {
    if (countdown > 0 && verifyingAdId) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && verifyingAdId) {
      const adIdToRecord = verifyingAdId;
      setVerifyingAdId(null);
      setSuccessAdId(adIdToRecord);
      
      const recordClick = async () => {
        // We need to find the ad with its current cycle
        const CYCLE_DURATION = 24 * 60 * 60 * 1000;
        const now = Date.now();
        
        const ad = ads.find(a => a.id === adIdToRecord);
        if (ad && userId) {
          const now = new Date();
          // Use YYYYMMDD as a consistent local day cycle ID
          const currentCycle = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
          
          try {
            await setDoc(doc(db, 'users', userId, 'clicks', `${ad.id}_${currentCycle}`), {
              adId: ad.id,
              rewardAmount: ad.rewardAmount,
              clickedAt: serverTimestamp(),
              cycle: currentCycle
            });
            
            // Update total earnings and balance on user doc
            await setDoc(doc(db, 'users', userId), {
              totalEarnings: increment(ad.rewardAmount),
              balance: increment(ad.rewardAmount)
            }, { merge: true });

            toast.success(`Earned ₦${ad.rewardAmount.toLocaleString()} from ${ad.title}!`);

            // Trigger confetti if daily limit reached
            if (clicksToday + 1 === DAILY_LIMIT) {
              triggerConfetti();
            }

            // Log global activity
            await addDoc(collection(db, 'activities'), {
              userId,
              username: username || auth.currentUser?.email?.split('@')[0] || 'Anonymous',
              type: 'click',
              amount: ad.rewardAmount,
              createdAt: serverTimestamp()
            });
          } catch (err) {
            handleFirestoreError(err, OperationType.CREATE, `users/${userId}/clicks/${ad.id}_${currentCycle}`);
          }
        }
        
        // Clear success state after animation
        setTimeout(() => {
          setSuccessAdId(null);
        }, 1500);
      };
      
      recordClick();
    }
  }, [countdown, verifyingAdId, ads, userId]);

  const handleUpdateUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername || newUsername.length < 3) {
      setProfileError('Username must be at least 3 characters long');
      return;
    }

    setProfileLoading(true);
    setProfileError('');
    setProfileSuccess('');

    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');

      await setDoc(doc(db, 'users', user.uid), {
        username: newUsername
      }, { merge: true });

      setUsername(newUsername);
      setProfileSuccess('Username updated successfully!');
      setIsEditingUsername(false);
    } catch (err) {
      setProfileError('Failed to update username. Please try again.');
    } finally {
      setProfileLoading(false);
    }
  };

  const reauthenticate = async () => {
    const user = auth.currentUser;
    if (!user || !user.email) throw new Error('Not authenticated');
    
    if (!currentPassword) {
      throw new Error('Please enter your current password to confirm changes');
    }

    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
  };

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newEmail.includes('@')) {
      setProfileError('Please enter a valid email address');
      return;
    }

    setProfileLoading(true);
    setProfileError('');
    setProfileSuccess('');

    try {
      await reauthenticate();
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');

      await updateEmail(user, newEmail);
      setProfileSuccess('Email updated successfully!');
      setIsEditingEmail(false);
      setCurrentPassword('');
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update email. Ensure your current password is correct.');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setProfileError('New password must be at least 6 characters long');
      return;
    }

    setProfileLoading(true);
    setProfileError('');
    setProfileSuccess('');

    try {
      await reauthenticate();
      const user = auth.currentUser;
      if (!user) throw new Error('Not authenticated');

      await updatePassword(user, newPassword);
      await updateDoc(doc(db, 'users', userId), {
        password: newPassword
      });
      setProfileSuccess('Password updated successfully!');
      setIsEditingPassword(false);
      setNewPassword('');
      setCurrentPassword('');
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update password. Ensure your current password is correct.');
    } finally {
      setProfileLoading(false);
    }
  };

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
  const totalCheckins = checkins.reduce((sum, c) => sum + c.rewardAmount, 0);
  const totalWithdrawals = withdrawals.filter(w => w.status !== 'rejected').reduce((sum, w) => sum + w.amount, 0);
  const totalAchievements = achievements.reduce((sum, a) => sum + a.rewardAmount, 0);
  const totalEarnings = welcomeBonus + totalClicks + totalCheckins + totalAchievements;
  const derivedBalance = totalEarnings - totalWithdrawals;
  const balance = userBalance !== null ? userBalance : derivedBalance;
  const canWithdraw = isWithdrawalWindow();
  
  const now = new Date();
  const todayCycle = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();

  const adsWithCycles = ads.map(ad => {
    return {
      ...ad,
      cycle: todayCycle
    };
  });

  const clickedAdCycleKeys = new Set(clicks.map(c => `${c.adId}_${c.cycle || 0}`));
  
  const availableAds = adsWithCycles.filter(ad => !clickedAdCycleKeys.has(`${ad.id}_${ad.cycle}`));
  const completedAds = adsWithCycles.filter(ad => clickedAdCycleKeys.has(`${ad.id}_${ad.cycle}`));

  const DAILY_LIMIT = 5;
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

    if (activationStatus !== 'approved') {
      setWithdrawError('Your account must be activated before you can withdraw. Please complete the activation process below.');
      return;
    }
    
    if (!canWithdraw) {
      setWithdrawError('Withdrawals are only available on the first Friday of every month between 8:00 AM and 10:00 AM UTC.');
      return;
    }
    
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount < 300000) {
      setWithdrawError('Minimum withdrawal amount is ₦300,000.');
      return;
    }
    
    if (amount > balance) {
      setWithdrawError('Insufficient balance.');
      return;
    }

    setWithdrawLoading(true);
    setWithdrawError('');

    try {
      const referenceId = `CAD-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      await addDoc(collection(db, 'withdrawals'), {
        userId,
        username: username || auth.currentUser?.email || 'Unknown',
        amount,
        bankName,
        accountNumber,
        accountName,
        status: 'pending',
        referenceId,
        createdAt: serverTimestamp()
      });

      // Log global activity
      await addDoc(collection(db, 'activities'), {
        userId,
        username: username || auth.currentUser?.email?.split('@')[0] || 'Anonymous',
        type: 'withdrawal',
        amount,
        createdAt: serverTimestamp()
      });

      // Update balance on user doc
      await setDoc(doc(db, 'users', userId), {
        balance: increment(-amount)
      }, { merge: true });

      toast.success(`Withdrawal request for ₦${amount.toLocaleString()} submitted!`);
      setWithdrawAmount('');
      setBankName('');
      setAccountNumber('');
      setAccountName('');
      setActiveTab('wallet'); // Go back to wallet to see history
    } catch (err: any) {
      setWithdrawError(err.message || 'Failed to submit withdrawal request.');
      handleFirestoreError(err, OperationType.CREATE, `withdrawals`);
    } finally {
      setWithdrawLoading(false);
    }
  };

  const handleCheckIn = async () => {
    if (!userId || checkInLoading) return;
    
    const todayStr = new Date().toISOString().split('T')[0];
    const alreadyCheckedIn = checkins.some(c => c.date === todayStr);
    
    if (alreadyCheckedIn) return;
    
    setCheckInLoading(true);
    try {
      await setDoc(doc(db, 'users', userId, 'checkins', todayStr), {
        rewardAmount: 500,
        checkedAt: serverTimestamp(),
        date: todayStr
      });
      
      // Update total earnings and balance on user doc
      await setDoc(doc(db, 'users', userId), {
        totalEarnings: increment(500),
        balance: increment(500)
      }, { merge: true });

      toast.success('Daily check-in reward: ₦500 added to balance!');

      // Log global activity
      await addDoc(collection(db, 'activities'), {
        userId,
        username: username || auth.currentUser?.email?.split('@')[0] || 'Anonymous',
        type: 'checkin',
        amount: 500,
        createdAt: serverTimestamp()
      });

      // Trigger confetti for check-in
      triggerConfetti();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `users/${userId}/checkins/${todayStr}`);
    } finally {
      setCheckInLoading(false);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const hasCheckedInToday = checkins.some(c => c.date === todayStr);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 800 * 1024) { // Slightly less than 1MB to be safe for Firestore string limit
        toast.error('Image is too large. Please upload an image smaller than 800KB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setActivationReceipt(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleActivationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !activationReceipt) return;

    setActivationLoading(true);
    try {
      await addDoc(collection(db, 'activations'), {
        userId,
        username,
        receiptImage: activationReceipt,
        status: 'pending',
        createdAt: serverTimestamp()
      });

      await setDoc(doc(db, 'users', userId), {
        activationStatus: 'pending'
      }, { merge: true });

      toast.success('Activation receipt submitted! Please wait for admin approval.');
      setActivationReceipt(null);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.CREATE, 'activations');
    } finally {
      setActivationLoading(false);
    }
  };

  const isEligibleForActivation = (userBalance || 0) >= 300000;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-900" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <AnimatePresence>
        {showAchievementBadge && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.5, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.5, opacity: 0, y: 50 }}
              className="bg-white rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl text-center p-8"
            >
              <div className="h-24 w-24 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trophy className="h-12 w-12 text-yellow-600" />
              </div>
              <h2 className="text-2xl font-black text-gray-900 mb-2">Achievement Unlocked!</h2>
              <p className="text-gray-600 mb-6 font-medium">{showAchievementBadge.title}</p>
              
              <div className="bg-green-50 rounded-2xl p-4 mb-8 flex items-center justify-center">
                <Banknote className="h-6 w-6 text-green-600 mr-2" />
                <span className="text-xl font-bold text-green-700">+₦1,000 Bonus</span>
              </div>

              <button
                onClick={() => setShowAchievementBadge(null)}
                className="w-full py-4 bg-blue-900 text-white rounded-2xl font-bold hover:bg-blue-950 transition-colors"
              >
                Awesome!
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showWelcomeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl"
            >
              <div className="bg-gradient-to-br from-blue-900 to-purple-800 p-8 text-center text-white relative">
                <div className="absolute top-4 right-4">
                  <button 
                    onClick={() => {
                      setShowWelcomeModal(false);
                      if (userId) localStorage.setItem(`welcome_seen_${userId}`, 'true');
                    }}
                    className="p-1 hover:bg-white/20 rounded-full transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
                <div className="h-20 w-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
                  <Trophy className="h-10 w-10 text-yellow-300" />
                </div>
                <h2 className="text-3xl font-black mb-2">Welcome to ClickAds!</h2>
                <p className="text-blue-100">Your journey to earning starts here.</p>
              </div>
              
              <div className="p-8">
                <div className="bg-green-50 border border-green-100 rounded-2xl p-4 mb-6 flex items-center">
                  <div className="h-12 w-12 bg-green-100 rounded-xl flex items-center justify-center mr-4">
                    <Wallet className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-green-700 font-bold uppercase tracking-wider">Sign-up Bonus Credited</p>
                    <p className="text-2xl font-black text-green-800">₦80,000.00</p>
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  <h3 className="font-bold text-gray-900">Platform Rules:</h3>
                  <div className="flex items-start">
                    <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center mr-3 mt-0.5">
                      <span className="text-xs font-bold text-blue-900">1</span>
                    </div>
                    <p className="text-sm text-gray-600">Daily Check-in rewards you with <span className="font-bold text-gray-900">₦500</span> instantly.</p>
                  </div>
                  <div className="flex items-start">
                    <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center mr-3 mt-0.5">
                      <span className="text-xs font-bold text-blue-900">2</span>
                    </div>
                    <p className="text-sm text-gray-600">Complete up to <span className="font-bold text-gray-900">5 ad clicks</span> daily to boost your earnings.</p>
                  </div>
                  <div className="flex items-start">
                    <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center mr-3 mt-0.5">
                      <span className="text-xs font-bold text-blue-900">3</span>
                    </div>
                    <p className="text-sm text-gray-600">Minimum withdrawal limit is <span className="font-bold text-gray-900">₦300,000</span>.</p>
                  </div>
                  <div className="flex items-start">
                    <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center mr-3 mt-0.5">
                      <span className="text-xs font-bold text-blue-900">4</span>
                    </div>
                    <p className="text-sm text-gray-600">Withdrawals are processed every <span className="font-bold text-gray-900">First Friday</span> of the month.</p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setShowWelcomeModal(false);
                    if (userId) localStorage.setItem(`welcome_seen_${userId}`, 'true');
                  }}
                  className="w-full py-4 bg-blue-900 text-white rounded-2xl font-bold hover:bg-blue-950 transition-colors shadow-lg shadow-blue-900/20"
                >
                  Start Earning Now
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <MousePointerClick className="h-8 w-8 text-blue-900" />
              <span className="ml-2 text-xl font-bold text-gray-900">ClickAds</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'home' && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
              <div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Hi, {username}! 👋</h2>
                <p className="text-gray-500 mt-1 font-medium">Ready to earn some rewards today?</p>
              </div>
              <div className="mt-4 sm:mt-0 bg-blue-900 px-6 py-4 rounded-2xl flex items-center shadow-lg shadow-blue-900/20">
                <div className="h-10 w-10 bg-white/20 rounded-xl flex items-center justify-center mr-4 backdrop-blur-sm">
                  <Wallet className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-[10px] text-blue-200 font-black uppercase tracking-widest text-left">Available Balance</p>
                  <p className="text-xl font-black text-white leading-none">₦{balance.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Daily Check-in Card */}
            <div className="bg-white p-1 rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-5 flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center mr-4 ${hasCheckedInToday ? 'bg-green-100' : 'bg-blue-100'}`}>
                    <Calendar className={`h-6 w-6 ${hasCheckedInToday ? 'text-green-600' : 'text-blue-900'}`} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Daily Check-in</h3>
                    <p className="text-xs text-gray-500 font-medium">Claim ₦500.00 every 24 hours</p>
                  </div>
                </div>
                <button
                  onClick={handleCheckIn}
                  disabled={hasCheckedInToday || checkInLoading}
                  className={`px-6 py-2.5 rounded-xl text-sm font-black transition-all shadow-sm ${
                    hasCheckedInToday 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200' 
                      : 'bg-blue-900 text-white hover:bg-blue-950 active:scale-95 shadow-blue-900/10'
                  } disabled:opacity-70`}
                >
                  {checkInLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : hasCheckedInToday ? (
                    'Claimed'
                  ) : (
                    'Claim Reward'
                  )}
                </button>
              </div>
            </div>

            {/* Tasks Section */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-gray-900 flex items-center uppercase tracking-widest">
                  Available Tasks
                  <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-lg text-[10px] font-black bg-blue-100 text-blue-900">
                    {availableAds.length} LEFT
                  </span>
                </h3>
                {verifyingAdId && (
                  <div className="flex items-center text-amber-600 bg-amber-50 px-3 py-1 rounded-lg border border-amber-100">
                    <Clock className="h-3.5 w-3.5 mr-1.5 animate-spin text-amber-600" />
                    <span className="text-[10px] font-black">{countdown}s</span>
                  </div>
                )}
              </div>
              
              {isLimitReached ? (
                <div className="bg-gray-100 rounded-2xl border border-gray-200 p-8 text-center">
                  <ShieldAlert className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Limit Reached</h3>
                  <p className="mt-1 text-xs text-gray-500 font-medium max-w-[240px] mx-auto">You've completed all tasks for today. Return tomorrow for fresh rewards.</p>
                </div>
              ) : availableAds.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center">
                  <MousePointerClick className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-black text-gray-900 uppercase tracking-wider">No tasks available</h3>
                  <p className="mt-1 text-xs text-gray-500 font-medium">Check back later for more earning opportunities.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <AnimatePresence mode="popLayout">
                    {availableAds.map((ad) => (
                      <motion.button
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        key={ad.id}
                        onClick={() => handleClickAd(ad)}
                        disabled={!!verifyingAdId}
                        className="group relative bg-white p-1 rounded-2xl shadow-sm border border-gray-200 hover:border-blue-300 transition-all hover:shadow-md disabled:opacity-50 text-left"
                      >
                        <div className="p-4 flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="h-10 w-10 bg-blue-50 rounded-xl flex items-center justify-center mr-4 group-hover:bg-blue-100 transition-colors">
                              <ExternalLink className="h-5 w-5 text-blue-900" />
                            </div>
                            <div>
                              <p className="text-xs font-black text-gray-900 uppercase tracking-tighter line-clamp-1">{ad.title}</p>
                              <p className="text-[10px] text-gray-500 font-medium mt-1">Reward: <span className="text-blue-900 font-bold">₦{ad.rewardAmount.toLocaleString()}</span></p>
                            </div>
                          </div>
                          <div className="h-8 w-8 rounded-lg bg-gray-50 flex items-center justify-center group-hover:bg-blue-900 group-hover:text-white transition-all text-gray-400">
                            <ChevronRight className="h-4 w-4" />
                          </div>
                        </div>
                      </motion.button>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Achievements Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
                <div>
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center">
                    <Trophy className="h-4 w-4 text-amber-500 mr-2 animate-bounce" />
                    Achievements & Milestones
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 font-medium">Unlock exclusive badges and cash rewards (₦100 to ₦5,000)</p>
                </div>
                <div className="bg-blue-50 px-3 py-1.5 rounded-full flex items-center border border-blue-100 self-start sm:self-center">
                  <Award className="h-3.5 w-3.5 text-blue-900 mr-1.5 animate-pulse" />
                  <span className="text-[10px] font-black text-blue-900 uppercase tracking-wider">
                    {achievements.length} / 7 Earned
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { id: 'clicker_rookie', title: 'Clicker Rookie', req: '10 Ad Clicks', current: clicks.length, target: 10, reward: 200, icon: <MousePointerClick className="h-5 w-5" />, color: 'bg-amber-50 text-amber-600 border-amber-100', textColors: 'text-amber-900' },
                  { id: 'ad_enthusiast', title: 'Ad Enthusiast', req: '25 Ad Clicks', current: clicks.length, target: 25, reward: 500, icon: <Award className="h-5 w-5" />, color: 'bg-orange-50 text-orange-600 border-orange-100', textColors: 'text-orange-900' },
                  { id: 'click_specialist', title: 'Click Specialist', req: '50 Ad Clicks', current: clicks.length, target: 50, reward: 1000, icon: <Zap className="h-5 w-5" />, color: 'bg-blue-50 text-blue-600 border-blue-100', textColors: 'text-blue-900', legacyId: 'ads_clicked_50' },
                  { id: 'ad_titan', title: 'Ad Titan', req: '100 Ad Clicks', current: clicks.length, target: 100, reward: 2500, icon: <Trophy className="h-5 w-5" />, color: 'bg-purple-50 text-purple-600 border-purple-100', textColors: 'text-purple-900' },
                  { id: 'click_emperor', title: 'Click Emperor', req: '200 Ad Clicks', current: clicks.length, target: 200, reward: 5000, icon: <Crown className="h-5 w-5" />, color: 'bg-rose-50 text-rose-600 border-rose-100', textColors: 'text-rose-900' },
                  { id: 'active_days', title: '10 Days Active', req: '10 Check-ins', current: new Set(checkins.map(c => c.date)).size, target: 10, reward: 1000, icon: <Calendar className="h-5 w-5" />, color: 'bg-indigo-50 text-indigo-600 border-indigo-100', textColors: 'text-indigo-900' },
                  { id: 'earnings_100k', title: 'First 100k Earned', req: '₦100,000 Earnings', current: welcomeBonus + clicks.reduce((acc, curr) => acc + curr.rewardAmount, 0) + checkins.reduce((acc, curr) => acc + curr.rewardAmount, 0), target: 100000, reward: 1000, icon: <Banknote className="h-5 w-5" />, color: 'bg-green-50 text-green-600 border-green-100', textColors: 'text-green-900' }
                ].map((badge) => {
                  const isEarned = achievements.some(a => a.type === badge.id || (badge.legacyId && a.type === badge.legacyId));
                  const progressPct = Math.min(100, (badge.current / badge.target) * 100);
                  
                  return (
                    <div 
                      key={badge.id}
                      className={`relative overflow-hidden p-4 rounded-xl border flex flex-col justify-between transition-all ${
                        isEarned 
                          ? `${badge.color} shadow-sm border-2` 
                          : 'border-gray-200 bg-gray-50/40 opacity-75 hover:opacity-100 hover:border-gray-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                            isEarned ? 'bg-white shadow-sm' : 'bg-gray-100 text-gray-400'
                          }`}>
                            {badge.icon}
                          </div>
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                            isEarned 
                              ? 'bg-green-500/10 text-green-700' 
                              : 'bg-gray-100 text-gray-500'
                          }`}>
                            +₦{badge.reward.toLocaleString()}
                          </span>
                        </div>
                        
                        <h4 className={`text-[11px] font-black tracking-tight ${isEarned ? badge.textColors : 'text-gray-700'}`}>
                          {badge.title}
                        </h4>
                        <p className="text-[9px] text-gray-400 font-medium mt-0.5">{badge.req}</p>
                      </div>

                      <div className="mt-4">
                        {isEarned ? (
                          <div className="flex items-center text-green-600 text-[9px] font-bold uppercase tracking-widest space-x-1">
                            <CheckCircle className="h-3.5 w-3.5 flex-shrink-0 animate-pulse" />
                            <span>Unlocked & Paid</span>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div className="flex justify-between text-[8px] font-black text-gray-400 uppercase tracking-tighter">
                              <span>Progress</span>
                              <span>
                                {badge.target >= 1000 
                                  ? `₦${badge.current.toLocaleString()} / ₦${badge.target.toLocaleString()}`
                                  : `${badge.current} / ${badge.target}`}
                              </span>
                            </div>
                            <div className="h-1.5 w-full bg-gray-200/60 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-blue-900 rounded-full transition-all duration-300" 
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {welcomeBonus > 0 && clicks.length === 0 && (
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 flex items-start">
                  <div className="h-10 w-10 bg-blue-100 rounded-xl flex items-center justify-center mr-4 flex-shrink-0">
                    <Trophy className="h-5 w-5 text-blue-900" />
                  </div>
                  <div>
                    <h3 className="text-blue-900 font-black text-xs uppercase tracking-wider">Welcome Bonus</h3>
                    <p className="text-blue-800 text-[11px] mt-1 font-medium leading-relaxed">
                      ₦{welcomeBonus.toLocaleString()} credited to your balance. Start tasks to withdraw!
                    </p>
                  </div>
                </div>
              )}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex items-start">
                <div className="h-10 w-10 bg-gray-800 rounded-xl flex items-center justify-center mr-4 flex-shrink-0">
                  <ShieldAlert className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-white font-black text-xs uppercase tracking-wider">Secure Withdrawals</h3>
                  <p className="text-gray-400 text-[11px] mt-1 font-medium leading-relaxed">
                    Minimum withdrawal is ₦300,000. Processed first Fridays.
                  </p>
                </div>
              </div>
            </div>

            {/* Live Activity Feed */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center">
                  <BarChart3 className="h-4 w-4 text-blue-900 mr-2" />
                  <h3 className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Live Platform Activity</h3>
                </div>
                <div className="flex items-center space-x-1.5">
                  <div className="h-1.5 w-1.5 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-[9px] font-black text-green-600 uppercase tracking-widest">Real-time</span>
                </div>
              </div>
              <div className="h-48 overflow-y-auto relative bg-white">
                <div className="divide-y divide-gray-50 px-6">
                  <AnimatePresence initial={false}>
                    {[...simulatedActivities, ...activities].sort((a, b) => {
                      const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt).getTime();
                      const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt).getTime();
                      return timeB - timeA;
                    }).slice(0, 15).map((act) => (
                      <motion.div
                        key={act.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className="py-3 flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                            act.type === 'withdrawal' ? 'bg-green-50 text-green-600' :
                            act.type === 'achievement' ? 'bg-yellow-50 text-yellow-600' :
                            act.type === 'checkin' ? 'bg-orange-50 text-orange-600' :
                            'bg-blue-50 text-blue-600'
                          }`}>
                            {act.type === 'withdrawal' ? <Banknote className="h-4 w-4" /> :
                             act.type === 'achievement' ? <Trophy className="h-4 w-4" /> :
                             act.type === 'checkin' ? <Calendar className="h-4 w-4" /> :
                             <MousePointerClick className="h-4 w-4" />}
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-gray-900 uppercase tracking-tight">
                              {act.username}
                              <span className="font-medium text-gray-400 normal-case ml-1 lowercase">
                                {act.isSimulated ? act.text : (
                                  act.type === 'withdrawal' ? 'requested a withdrawal' :
                                  act.type === 'achievement' ? `earned "${act.title}"` :
                                  act.type === 'checkin' ? 'performed a daily check-in' :
                                  'completed a task'
                                )}
                              </span>
                            </p>
                            <p className="text-[8px] font-black text-gray-300 uppercase tracking-widest mt-0.5">
                              {act.createdAt?.toDate ? new Date(act.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 
                               act.isSimulated ? new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'JUST NOW'}
                            </p>
                          </div>
                        </div>
                        {act.amount && (
                          <span className="text-[10px] font-black text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">₦{act.amount.toLocaleString()}</span>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'wallet' && (
          <div className="space-y-8 max-w-4xl mx-auto">
            {/* Wallet Header */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="h-12 w-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-900">
                    <Wallet className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Main Balance</h3>
                    <p className="text-2xl font-black text-gray-900">₦{balance.toLocaleString()}</p>
                  </div>
                </div>
                <div className="pt-4 border-t border-gray-50 flex items-center justify-between text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  <span>Pending: ₦0.00</span>
                  <span className="text-green-600">Active</span>
                </div>
              </div>
              <div className="bg-blue-900 p-6 rounded-3xl shadow-xl shadow-blue-900/10 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 bg-white/10 rounded-full blur-xl" />
                <div className="relative z-10">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="h-12 w-12 bg-white/20 rounded-2xl flex items-center justify-center text-white backdrop-blur-md">
                      <Trophy className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-[10px] font-black text-blue-200 uppercase tracking-widest">Total Earnings</h3>
                      <p className="text-2xl font-black">₦{totalEarnings.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-white/10 flex items-center justify-between text-[10px] font-black text-blue-300 uppercase tracking-widest">
                    <span>Rank: Challenger</span>
                    <span className="flex items-center">
                      <div className="h-1 w-1 bg-green-400 rounded-full mr-2" />
                      Verified
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Stats Chart */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Growth Analytics</h3>
                  <p className="text-xs text-gray-500 mt-1 font-medium italic">Visualization of earnings trend</p>
                </div>
                <div className="flex space-x-1 bg-gray-50 p-1 rounded-xl border border-gray-100">
                  <div className="px-3 py-1 bg-white rounded-lg shadow-sm border border-gray-200 text-[10px] font-black text-blue-900 uppercase tracking-widest">Overview</div>
                </div>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1e3a8a" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#1e3a8a" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                      dy={10}
                    />
                    <YAxis hide={true} />
                    <Tooltip 
                      contentStyle={{ 
                        borderRadius: '16px', 
                        border: 'none', 
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                        fontSize: '12px',
                        fontWeight: '800'
                      }}
                      formatter={(value: number) => [`₦${value.toLocaleString()}`, 'Profit']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="amount" 
                      stroke="#1e3a8a" 
                      strokeWidth={4}
                      fillOpacity={1} 
                      fill="url(#colorAmount)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Withdrawal Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden h-fit">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center">
                    <CreditCard className="h-4 w-4 text-blue-900 mr-2" />
                    <h3 className="text-[11px] font-black text-gray-900 uppercase tracking-widest">Withdrawal Form</h3>
                  </div>
                  {!canWithdraw && (
                    <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest bg-amber-50 px-2 py-0.5 rounded border border-amber-100 animate-pulse">Closed</span>
                  )}
                </div>
                <div className="p-6">
                  {isEligibleForActivation && activationStatus !== 'approved' ? (
                    <div className="space-y-6">
                      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
                        <div className="flex items-start">
                          <ShieldAlert className="h-5 w-5 text-blue-900 mt-0.5 mr-3 flex-shrink-0" />
                          <div>
                            <h4 className="text-[11px] font-black text-blue-900 uppercase tracking-widest mb-1">Account Activation Required</h4>
                            <p className="text-blue-800 text-[10px] font-bold leading-relaxed uppercase tracking-tight">
                              You are eligible for withdrawal! To activate your account and process your payout, please pay the one-time activation fee.
                            </p>
                          </div>
                        </div>
                        <a 
                          href="https://paystack.shop/pay/ads-click" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="mt-4 flex items-center justify-between bg-blue-900 text-white p-4 rounded-xl hover:bg-blue-950 transition-all group"
                        >
                          <span className="text-[10px] font-black uppercase tracking-widest">Pay Activation Fee</span>
                          <ExternalLink className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </a>
                      </div>

                      {activationStatus === 'pending' ? (
                        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
                          <Clock className="h-8 w-8 text-amber-600 mx-auto mb-3 animate-pulse" />
                          <h4 className="text-[11px] font-black text-amber-900 uppercase tracking-widest">Activation Pending</h4>
                          <p className="text-amber-800 text-[10px] font-bold uppercase tracking-tight mt-1">
                            Your receipt has been submitted and is currently being reviewed by our team.
                          </p>
                        </div>
                      ) : (
                        <form onSubmit={handleActivationSubmit} className="space-y-4">
                          {activationStatus === 'rejected' && (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start">
                              <X className="h-4 w-4 text-red-600 mr-2 flex-shrink-0" />
                              <p className="text-red-700 text-[10px] font-black uppercase tracking-tight">Your previous activation request was rejected. Please upload a valid receipt.</p>
                            </div>
                          )}
                          <div className="space-y-2">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Upload Payment Receipt</label>
                            <div className="relative">
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                required
                                className="hidden"
                                id="receipt-upload"
                              />
                              <label
                                htmlFor="receipt-upload"
                                className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-200 rounded-2xl hover:border-blue-300 hover:bg-blue-50 transition-all cursor-pointer overflow-hidden"
                              >
                                {activationReceipt ? (
                                  <div className="relative w-full h-full">
                                    <img src={activationReceipt} alt="Receipt" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                      <p className="text-white text-[10px] font-black uppercase tracking-widest">Change Image</p>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <Upload className="h-6 w-6 text-gray-400 mb-2" />
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Click to upload image</p>
                                    <p className="text-[8px] font-bold text-gray-300 uppercase tracking-tight mt-1">MAX SIZE 800KB</p>
                                  </>
                                )}
                              </label>
                            </div>
                          </div>
                          <button
                            type="submit"
                            disabled={!activationReceipt || activationLoading}
                            className="w-full py-4 rounded-xl bg-blue-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-950 transition-all disabled:opacity-50 shadow-lg shadow-blue-900/20"
                          >
                            {activationLoading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Submit Activation Receipt'}
                          </button>
                        </form>
                      )}
                    </div>
                  ) : (
                    <>
                      {!canWithdraw && (
                        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start">
                          <Info className="h-4 w-4 text-amber-600 mt-0.5 mr-3 flex-shrink-0" />
                          <p className="text-amber-800 text-[11px] font-bold leading-relaxed uppercase tracking-tight">
                            Payouts open first Fridays (8:00 AM - 10:00 AM UTC). Min ₦300k required.
                          </p>
                        </div>
                      )}
                      
                      <form onSubmit={handleWithdraw} className="space-y-4">
                        {withdrawError && (
                          <div className="text-[11px] font-black text-red-600 bg-red-50 p-4 rounded-xl border border-red-100 uppercase tracking-tight">{withdrawError}</div>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Select Bank</label>
                            <select
                              required
                              value={bankName}
                              onChange={(e) => setBankName(e.target.value)}
                              disabled={!canWithdraw || withdrawLoading}
                              className="block w-full border border-gray-200 rounded-xl py-2.5 px-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-900 transition-all bg-white disabled:bg-gray-50 disabled:text-gray-400 shadow-sm"
                            >
                              <option value="" disabled>Select Bank</option>
                              {NIGERIAN_BANKS.map(bank => (
                                <option key={bank} value={bank}>{bank}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Account No.</label>
                            <input
                              type="text"
                              required
                              value={accountNumber}
                              onChange={(e) => setAccountNumber(e.target.value)}
                              disabled={!canWithdraw || withdrawLoading}
                              className="block w-full border border-gray-200 rounded-xl py-2.5 px-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-900 transition-all disabled:bg-gray-50 disabled:text-gray-400 shadow-sm"
                              placeholder="0123456789"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Account Name</label>
                          <input
                            type="text"
                            required
                            value={accountName}
                            onChange={(e) => setAccountName(e.target.value)}
                            disabled={!canWithdraw || withdrawLoading}
                            className="block w-full border border-gray-200 rounded-xl py-2.5 px-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-900 transition-all disabled:bg-gray-50 disabled:text-gray-400 shadow-sm"
                            placeholder="Holder's Name"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Amount (₦)</label>
                          <input
                            type="number"
                            required
                            min="300000"
                            max={balance}
                            step="0.01"
                            value={withdrawAmount}
                            onChange={(e) => setWithdrawAmount(e.target.value)}
                            disabled={!canWithdraw || withdrawLoading}
                            className="block w-full border border-gray-200 rounded-xl py-2.5 px-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-900 transition-all disabled:bg-gray-50 disabled:text-gray-400 shadow-sm"
                            placeholder="Min ₦300,000"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={!canWithdraw || withdrawLoading || balance < 300000 || activationStatus !== 'approved'}
                          className="w-full flex justify-center py-4 px-4 rounded-xl text-xs font-black uppercase tracking-widest text-white bg-blue-900 hover:bg-blue-950 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/20"
                        >
                          {withdrawLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Withdrawal Request'}
                        </button>
                      </form>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between ml-1">
                  <h3 className="text-[11px] font-black text-gray-900 uppercase tracking-widest">Withdrawal History Log</h3>
                  <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-ping" />
                </div>
                {withdrawals.length === 0 ? (
                  <div className="bg-white rounded-3xl border border-dashed border-gray-200 p-12 text-center h-[400px] flex flex-col items-center justify-center">
                    <CheckCircle className="mx-auto h-12 w-12 text-gray-200 mb-4" />
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No payout history yet</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden h-[400px] flex flex-col">
                    <div className="divide-y divide-gray-100 overflow-y-auto">
                      {withdrawals.sort((a, b) => {
                        const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
                        const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
                        return timeB - timeA;
                      }).map(w => (
                        <div key={w.id} className="p-5 hover:bg-gray-50 transition-colors">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center">
                              <div className={`h-8 w-8 rounded-lg flex items-center justify-center mr-3 ${
                                w.status === 'approved' ? 'bg-green-50 text-green-600' :
                                w.status === 'rejected' ? 'bg-red-50 text-red-600' :
                                'bg-blue-50 text-blue-600'
                              }`}>
                                <Banknote className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="text-[11px] font-black text-gray-900 uppercase tracking-widest">₦{w.amount.toLocaleString()}</p>
                                <p className="text-[8px] font-bold text-gray-400 uppercase tracking-tight">{w.createdAt?.toDate ? new Date(w.createdAt.toDate()).toLocaleDateString() : 'N/A'}</p>
                              </div>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                              w.status === 'approved' ? 'bg-green-100 text-green-700' :
                              w.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                              w.status === 'rejected' ? 'bg-red-100 text-red-700' :
                              'bg-amber-100 text-amber-700'
                            }`}>
                              {w.status === 'approved' ? 'Paid' : w.status}
                            </span>
                          </div>

                          {/* Visual Status Steps */}
                          {w.status !== 'rejected' ? (
                            <div className="mb-4">
                              <div className="flex items-center justify-between mb-1">
                                <span className={`text-[7px] font-black uppercase tracking-tighter ${w.status === 'pending' || w.status === 'processing' || w.status === 'approved' ? 'text-blue-900' : 'text-gray-300'}`}>Pending</span>
                                <span className={`text-[7px] font-black uppercase tracking-tighter ${w.status === 'processing' || w.status === 'approved' ? 'text-blue-900' : 'text-gray-300'}`}>Processing</span>
                                <span className={`text-[7px] font-black uppercase tracking-tighter ${w.status === 'approved' ? 'text-green-600' : 'text-gray-300'}`}>Paid</span>
                              </div>
                              <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden flex">
                                <div className={`h-full transition-all duration-500 ${
                                  w.status === 'pending' ? 'w-1/3 bg-blue-400' :
                                  w.status === 'processing' ? 'w-2/3 bg-blue-600' :
                                  w.status === 'approved' ? 'w-full bg-green-500' : 'w-0'
                                }`} />
                              </div>
                            </div>
                          ) : (
                            <div className="mb-4 p-2 bg-red-50 rounded-lg border border-red-100">
                              <p className="text-[7px] font-black text-red-600 uppercase tracking-widest text-center">Request Declined - Contact Support</p>
                            </div>
                          )}

                          <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-widest text-gray-400">
                            <span>Ref: {w.referenceId || `CAD-${w.id.substring(0, 8).toUpperCase()}`}</span>
                            <span>{w.bankName}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <div className="space-y-6 max-w-2xl mx-auto">
            <div className="bg-blue-900 rounded-3xl p-8 text-center shadow-xl shadow-blue-900/20 mb-8 overflow-hidden relative">
              <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
              <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-32 h-32 bg-purple-500/20 rounded-full blur-2xl" />
              
              <div className="relative z-10">
                <div className="h-16 w-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Trophy className="h-8 w-8 text-yellow-300" />
                </div>
                <h2 className="text-2xl font-black text-white uppercase tracking-wider">Top Earners</h2>
                <p className="text-blue-200 text-xs font-bold mt-2 uppercase tracking-widest">Global Rankings • Live Updates</p>
              </div>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="divide-y divide-gray-100">
                {leaderboard.length === 0 ? (
                  <div className="p-12 text-center text-gray-400">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3" />
                    <p className="text-xs font-bold uppercase tracking-widest">Loading Rankings...</p>
                  </div>
                ) : (
                  leaderboard.map((user, index) => (
                    <div key={user.id} className="flex items-center justify-between px-6 py-5 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mr-4 font-black text-sm shadow-sm ${
                          index === 0 ? 'bg-yellow-100 text-yellow-700' :
                          index === 1 ? 'bg-slate-100 text-slate-700' :
                          index === 2 ? 'bg-orange-100 text-orange-700' :
                          'bg-gray-50 text-gray-400'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <p className="text-sm font-black text-gray-900 uppercase tracking-tight">{user.username}</p>
                          <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${
                            index === 0 ? 'text-yellow-600' :
                            index === 1 ? 'text-slate-500' :
                            index === 2 ? 'text-orange-500' :
                            'text-gray-400'
                          }`}>
                            {index === 0 ? 'Grandmaster' : index === 1 ? 'Master' : index === 2 ? 'Pro' : 'Elite'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-black text-blue-900 leading-none">₦{user.totalEarnings.toLocaleString()}</p>
                        <p className="text-[9px] text-gray-400 font-black uppercase tracking-tighter mt-1.5">Total Profit</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200">
              <div className="flex items-center space-x-4">
                <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center border border-gray-200 text-blue-900">
                  <Info className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Rank Up!</h4>
                  <p className="text-[11px] text-gray-500 font-medium leading-tight mt-1">Keep clicking and checking in daily to climb the leaderboard and unlock exclusive rewards.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="max-w-2xl mx-auto space-y-6 pb-20">
            {/* Profile Card */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="h-24 bg-blue-900 relative">
                <div className="absolute -bottom-10 left-8">
                  <div className="h-20 w-20 bg-white rounded-2xl shadow-xl border-4 border-white flex items-center justify-center text-blue-900">
                    <User className="h-10 w-10" />
                  </div>
                </div>
              </div>
              <div className="pt-12 p-8">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">{username}</h2>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Platinum Member • Active</p>
                  </div>
                  <div className="bg-green-50 text-green-700 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-green-100 flex items-center">
                    <div className="h-1.5 w-1.5 bg-green-500 rounded-full mr-2" />
                    Verified
                  </div>
                </div>

                {(profileSuccess || profileError) && (
                  <div className={`p-4 rounded-2xl mb-6 flex items-center border ${profileSuccess ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                    {profileSuccess ? <CheckCircle className="h-4 w-4 mr-3 flex-shrink-0" /> : <AlertCircle className="h-4 w-4 mr-3 flex-shrink-0" />}
                    <span className="text-[11px] font-black uppercase tracking-tight">{profileSuccess || profileError}</span>
                  </div>
                )}

                <div className="space-y-4">
                  {/* Display Name */}
                  <div className="group">
                    <div className="flex items-center justify-between mb-2 px-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Username</label>
                      {!isEditingUsername ? (
                        <button onClick={() => { setNewUsername(username); setIsEditingUsername(true); }} className="text-[10px] font-black text-blue-900 uppercase tracking-widest hover:underline">Edit</button>
                      ) : (
                        <button onClick={() => setIsEditingUsername(false)} className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cancel</button>
                      )}
                    </div>
                    {!isEditingUsername ? (
                      <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm font-bold text-gray-900">{username}</div>
                    ) : (
                      <form onSubmit={handleUpdateUsername} className="flex gap-2">
                        <input
                          type="text"
                          value={newUsername}
                          onChange={(e) => setNewUsername(e.target.value)}
                          className="flex-1 bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-900 transition-all"
                          placeholder="New username"
                          disabled={profileLoading}
                        />
                        <button type="submit" disabled={profileLoading} className="bg-blue-900 text-white rounded-2xl px-6 py-3 text-[11px] font-black uppercase tracking-widest hover:bg-blue-950 disabled:opacity-50">
                          {profileLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                        </button>
                      </form>
                    )}
                  </div>

                  {/* Email Section */}
                  <div className="group">
                    <div className="flex items-center justify-between mb-2 px-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Email Address</label>
                      {!isEditingEmail ? (
                        <button onClick={() => { setNewEmail(auth.currentUser?.email || ''); setIsEditingEmail(true); setProfileError(''); setProfileSuccess(''); }} className="text-[10px] font-black text-blue-900 uppercase tracking-widest hover:underline">Change</button>
                      ) : (
                        <button onClick={() => setIsEditingEmail(false)} className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cancel</button>
                      )}
                    </div>
                    {!isEditingEmail ? (
                      <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm font-bold text-gray-900">{auth.currentUser?.email}</div>
                    ) : (
                      <form onSubmit={handleUpdateEmail} className="space-y-3">
                        <input
                          type="email"
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-900 transition-all"
                          placeholder="New email"
                          disabled={profileLoading}
                          required
                        />
                        <input
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-900 transition-all"
                          placeholder="Confirm current password"
                          disabled={profileLoading}
                          required
                        />
                        <button type="submit" disabled={profileLoading} className="w-full bg-blue-900 text-white rounded-2xl py-3 text-[11px] font-black uppercase tracking-widest hover:bg-blue-950 disabled:opacity-50 shadow-lg shadow-blue-900/10">
                          {profileLoading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Confirm Email Change'}
                        </button>
                      </form>
                    )}
                  </div>

                  {/* Password Section */}
                  <div className="group">
                    <div className="flex items-center justify-between mb-2 px-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Account Security</label>
                      {!isEditingPassword ? (
                        <button onClick={() => { setIsEditingPassword(true); setProfileError(''); setProfileSuccess(''); }} className="text-[10px] font-black text-blue-900 uppercase tracking-widest hover:underline">Security Settings</button>
                      ) : (
                        <button onClick={() => setIsEditingPassword(false)} className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cancel</button>
                      )}
                    </div>
                    {!isEditingPassword ? (
                      <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex items-center justify-between">
                        <span className="text-sm font-bold text-gray-900">••••••••••••</span>
                        <Lock className="h-4 w-4 text-gray-300" />
                      </div>
                    ) : (
                      <form onSubmit={handleUpdatePassword} className="space-y-3">
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-900 transition-all"
                          placeholder="New password (min 6 chars)"
                          disabled={profileLoading}
                          required
                        />
                        <input
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-900 transition-all"
                          placeholder="Confirm current password"
                          disabled={profileLoading}
                          required
                        />
                        <button type="submit" disabled={profileLoading} className="w-full bg-blue-900 text-white rounded-2xl py-3 text-[11px] font-black uppercase tracking-widest hover:bg-blue-950 disabled:opacity-50 shadow-lg shadow-blue-900/10">
                          {profileLoading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Update Security Credentials'}
                        </button>
                      </form>
                    )}
                  </div>

                  {/* Account Information */}
                  <div className="bg-blue-50/50 rounded-2xl p-4 flex items-center justify-between border border-blue-100/50">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 text-blue-400 mr-3" />
                      <span className="text-[10px] font-black text-blue-900 uppercase tracking-widest">Member Since</span>
                    </div>
                    <span className="text-xs font-black text-blue-900 uppercase tracking-tight">
                      {userCreatedAt ? userCreatedAt.toDate().toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* FAQ Section Moved Here */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center">
                  <HelpCircle className="h-4 w-4 text-blue-900 mr-2" />
                  <h3 className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Support & Guidelines</h3>
                </div>
              </div>
              <div className="divide-y divide-gray-100">
                {faqData.map((item, i) => (
                  <div key={i} className="group">
                    <button
                      onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                    >
                      <span className="text-[11px] font-black text-gray-900 group-hover:text-blue-900 transition-colors uppercase tracking-tight">
                        {item.q}
                      </span>
                      {openFaq === i ? (
                        <ChevronUp className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                    <AnimatePresence>
                      {openFaq === i && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-6 pb-4 text-[11px] font-bold text-gray-500 leading-relaxed uppercase tracking-tight italic">
                            {item.a}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {isAdmin && (
                <button
                  onClick={() => navigate('/admin')}
                  className="w-full flex items-center justify-center p-5 rounded-3xl bg-amber-50 border border-amber-100 text-amber-900 hover:bg-amber-100 transition-all group"
                >
                  <ShieldAlert className="h-5 w-5 mr-3 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Admin Control Panel</span>
                </button>
              )}
              <button
                onClick={handleSignOut}
                className={`w-full flex items-center justify-center p-5 rounded-3xl bg-red-50 border border-red-100 text-red-600 hover:bg-red-100 transition-all group ${!isAdmin ? 'sm:col-span-2' : ''}`}
              >
                <LogOut className="h-5 w-5 mr-3 group-hover:translate-x-1 transition-transform" />
                <span className="text-[10px] font-black uppercase tracking-widest">Terminate Session</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 w-full bg-white border-t border-gray-200 flex justify-around items-center h-16 z-40 pb-safe">
        <button 
          onClick={() => setActiveTab('home')} 
          className={`flex flex-col items-center justify-center w-full h-full transition-colors ${activeTab === 'home' ? 'text-blue-900 border-t-2 border-blue-900' : 'text-gray-400 hover:text-gray-900'}`}
        >
          <Home className="h-5 w-5" />
          <span className="text-[10px] mt-1 font-black uppercase tracking-widest">Home</span>
        </button>
        <button 
          onClick={() => setActiveTab('wallet')} 
          className={`flex flex-col items-center justify-center w-full h-full transition-colors ${activeTab === 'wallet' ? 'text-blue-900 border-t-2 border-blue-900' : 'text-gray-400 hover:text-gray-900'}`}
        >
          <Wallet className="h-5 w-5" />
          <span className="text-[10px] mt-1 font-black uppercase tracking-widest">Wallet</span>
        </button>
        <button 
          onClick={() => setActiveTab('leaderboard')} 
          className={`flex flex-col items-center justify-center w-full h-full transition-colors ${activeTab === 'leaderboard' ? 'text-blue-900 border-t-2 border-blue-900' : 'text-gray-400 hover:text-gray-900'}`}
        >
          <BarChart3 className="h-5 w-5" />
          <span className="text-[10px] mt-1 font-black uppercase tracking-widest">Rank</span>
        </button>
        <button 
          onClick={() => setActiveTab('profile')} 
          className={`flex flex-col items-center justify-center w-full h-full transition-colors ${activeTab === 'profile' ? 'text-blue-900 border-t-2 border-blue-900' : 'text-gray-400 hover:text-gray-900'}`}
        >
          <User className="h-5 w-5" />
          <span className="text-[10px] mt-1 font-black uppercase tracking-widest">Account</span>
        </button>
      </div>

      {/* Welcome Modal */}
      <AnimatePresence>
        {showWelcomeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowWelcomeModal(false);
                if (userId) localStorage.setItem(`welcome_seen_${userId}`, 'true');
              }}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white rounded-[2rem] shadow-2xl max-w-lg w-full overflow-hidden"
            >
              <div className="bg-blue-900 p-8 text-center relative">
                <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                <div className="h-16 w-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20">
                  <Trophy className="h-8 w-8 text-yellow-300" />
                </div>
                <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Welcome to ClickAds!</h2>
                <p className="text-blue-200 text-[10px] font-black uppercase tracking-widest mt-2">Registration Bonus Received</p>
              </div>
              
              <div className="p-8 space-y-6">
                <div className="bg-green-50 rounded-2xl p-6 border border-green-100 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-green-800 uppercase tracking-widest">Sign-up Reward</p>
                    <p className="text-3xl font-black text-green-600 mt-1">₦80,000.00</p>
                  </div>
                  <CheckCircle className="h-10 w-10 text-green-600" />
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center">
                    <ShieldAlert className="h-4 w-4 mr-2 text-blue-900" />
                    Platform Rules
                  </h3>
                  <ul className="space-y-3">
                    {[
                      "Complete daily ad tasks to accumulate profits.",
                      "Perform a Daily Check-in to maintain your active status.",
                      "Minimum withdrawal is set at ₦300,000 for all members.",
                      "Payouts are processed on the First Friday of every month."
                    ].map((rule, i) => (
                      <li key={i} className="flex items-start text-[11px] font-bold text-gray-500 uppercase tracking-tight">
                        <span className="h-1.5 w-1.5 bg-blue-900 rounded-full mt-1.5 mr-3 flex-shrink-0" />
                        {rule}
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={() => {
                    setShowWelcomeModal(false);
                    if (userId) localStorage.setItem(`welcome_seen_${userId}`, 'true');
                  }}
                  className="w-full bg-blue-900 hover:bg-blue-950 text-white font-black py-4 rounded-2xl text-xs uppercase tracking-widest shadow-lg shadow-blue-900/20 transition-all active:scale-95"
                >
                  Enter Platform
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Achievement Badge Pop-up */}
      <AnimatePresence>
        {showAchievementBadge && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm">
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              className="bg-white rounded-2xl shadow-2xl border-2 border-yellow-400 p-4 flex items-center space-x-4 overflow-hidden relative"
            >
              <div className="absolute top-0 right-0 -mr-4 -mt-4 w-16 h-16 bg-yellow-400/20 rounded-full blur-xl" />
              <div className="h-12 w-12 bg-yellow-100 rounded-xl flex items-center justify-center flex-shrink-0 border border-yellow-200">
                <Trophy className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="flex-1">
                <p className="text-[9px] font-black text-yellow-600 uppercase tracking-widest mb-0.5">Achievement Unlocked!</p>
                <h4 className="text-xs font-black text-gray-900 uppercase tracking-tight">{showAchievementBadge.title}</h4>
                <p className="text-[10px] font-bold text-green-600 mt-0.5">+₦{showAchievementBadge.rewardAmount.toLocaleString()} Reward Added</p>
              </div>
              <button 
                onClick={() => setShowAchievementBadge(null)}
                className="h-8 w-8 rounded-lg hover:bg-gray-50 flex items-center justify-center text-gray-400 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Live Activity Notification (Floating Toast) */}
      <div className="fixed bottom-20 left-4 z-[45] pointer-events-none space-y-2">
        <AnimatePresence>
          {simulatedActivities.slice(0, 1).map((act) => (
            <motion.div
              key={act.id}
              initial={{ opacity: 0, x: -50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8, x: -20 }}
              className="bg-white/95 backdrop-blur-md shadow-2xl border border-blue-100 rounded-2xl p-4 flex items-center space-x-4 max-w-xs pointer-events-auto"
            >
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                act.type === 'withdrawal' ? 'bg-green-50 text-green-600' :
                act.type === 'achievement' ? 'bg-yellow-50 text-yellow-600' :
                'bg-blue-50 text-blue-600'
              }`}>
                {act.type === 'withdrawal' ? <Banknote className="h-5 w-5" /> :
                 act.type === 'achievement' ? <Trophy className="h-5 w-5" /> :
                 <MousePointerClick className="h-5 w-5" />}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <p className="text-[10px] font-black text-gray-900 uppercase tracking-tighter">{act.username}</p>
                  <div className="h-1 w-1 bg-green-500 rounded-full animate-pulse" />
                </div>
                <p className="text-[9px] font-bold text-gray-500 lowercase leading-tight mt-0.5">
                  {act.text} {act.amount && <span className="text-blue-900 font-black">₦{act.amount.toLocaleString()}</span>}
                </p>
                <p className="text-[7px] font-black text-gray-300 uppercase tracking-widest mt-1">Live from {NIGERIAN_BANKS[Math.floor(Math.random() * NIGERIAN_BANKS.length)].split(' ')[0]} User</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
