import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MousePointerClick, CheckCircle2, Wallet, ArrowRight } from 'lucide-react';

export function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <MousePointerClick className="h-8 w-8 text-indigo-600" />
            <span className="ml-2 text-2xl font-bold text-gray-900">ClickAds</span>
          </div>
          <button
            onClick={() => navigate('/auth')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Login / Register
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl mb-6">
              <span className="block">ClickAds: Turn Your</span>
              <span className="block text-indigo-600">Clicks into Cash</span>
            </h1>
            <p className="mt-3 text-base text-gray-500 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl">
              Looking for a simple way to boost your daily income without spending a kobo? Meet ClickAds, the ultimate rewards platform designed for the world market. No hidden fees, no "activation deposits," and no stress—just straightforward earning.
            </p>
            <div className="mt-8 sm:flex sm:justify-center">
              <div className="rounded-md shadow">
                <button
                  onClick={() => navigate('/auth')}
                  className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 md:py-4 md:text-lg md:px-10"
                >
                  Get Started Now
                  <ArrowRight className="ml-2 h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          {/* How It Works */}
          <div className="mb-20">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-extrabold text-gray-900">How It Works</h2>
              <p className="mt-4 max-w-2xl text-xl text-gray-500 mx-auto">
                ClickAds connects you with top brands looking for engagement. All you have to do is register and log in, click on the available ad links, and watch your balance grow. It’s the perfect side hustle for students, freelancers, or anyone looking to monetize their spare time.
              </p>
            </div>
          </div>

          {/* Why Choose ClickAds */}
          <div className="mb-20">
            <h2 className="text-3xl font-extrabold text-gray-900 text-center mb-10">Why Choose ClickAds?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center mb-4">
                  <CheckCircle2 className="h-6 w-6 text-green-500 mr-3" />
                  <h3 className="text-xl font-bold text-gray-900">Zero Investment</h3>
                </div>
                <p className="text-gray-600">You never have to pay a deposit or "upgrade fee" to start earning. It is 100% free.</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center mb-4">
                  <CheckCircle2 className="h-6 w-6 text-green-500 mr-3" />
                  <h3 className="text-xl font-bold text-gray-900">High Daily Limits</h3>
                </div>
                <p className="text-gray-600">Earn up to ₦2,000 every single day just by interacting with ads.</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center mb-4">
                  <CheckCircle2 className="h-6 w-6 text-green-500 mr-3" />
                  <h3 className="text-xl font-bold text-gray-900">Instant Access</h3>
                </div>
                <p className="text-gray-600">Sign up in seconds and start clicking immediately.</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center mb-4">
                  <CheckCircle2 className="h-6 w-6 text-green-500 mr-3" />
                  <h3 className="text-xl font-bold text-gray-900">Transparent Tracking</h3>
                </div>
                <p className="text-gray-600">Monitor your earnings in real-time with our easy-to-use dashboard.</p>
              </div>
            </div>
          </div>

          {/* Withdrawal Made Easy */}
          <div className="mb-20 bg-indigo-50 rounded-2xl p-8 md:p-12">
            <div className="text-center mb-10">
              <Wallet className="h-12 w-12 text-indigo-600 mx-auto mb-4" />
              <h2 className="text-3xl font-extrabold text-gray-900">Withdrawal Made Easy</h2>
              <p className="mt-4 max-w-2xl text-xl text-gray-600 mx-auto">
                We believe you should have access to your hard-earned money without the hassle.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <div className="bg-white p-6 rounded-xl shadow-sm">
                <h4 className="font-bold text-gray-900 mb-2">Minimum Withdrawal</h4>
                <p className="text-indigo-600 font-semibold text-lg">₦5,000</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm">
                <h4 className="font-bold text-gray-900 mb-2">Direct Payouts</h4>
                <p className="text-gray-600">Withdraw directly to your local Nigerian bank account.</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm">
                <h4 className="font-bold text-gray-900 mb-2">Fast Processing</h4>
                <p className="text-gray-600">No long waiting periods; get your funds when you need them.</p>
              </div>
            </div>
          </div>

          {/* Getting Started is Simple */}
          <div className="mb-16">
            <h2 className="text-3xl font-extrabold text-gray-900 text-center mb-10">Getting Started is Simple</h2>
            <div className="max-w-3xl mx-auto">
              <ol className="relative border-l border-indigo-200 ml-3 md:ml-0">
                <li className="mb-10 ml-6">
                  <span className="absolute flex items-center justify-center w-8 h-8 bg-indigo-100 rounded-full -left-4 ring-4 ring-white">
                    <span className="text-indigo-600 font-bold">1</span>
                  </span>
                  <h3 className="font-bold text-lg text-gray-900 mb-1">Download & Register</h3>
                  <p className="text-gray-600">Create your free account in minutes.</p>
                </li>
                <li className="mb-10 ml-6">
                  <span className="absolute flex items-center justify-center w-8 h-8 bg-indigo-100 rounded-full -left-4 ring-4 ring-white">
                    <span className="text-indigo-600 font-bold">2</span>
                  </span>
                  <h3 className="font-bold text-lg text-gray-900 mb-1">Click Ads</h3>
                  <p className="text-gray-600">Browse our list of daily ad links and engage.</p>
                </li>
                <li className="mb-10 ml-6">
                  <span className="absolute flex items-center justify-center w-8 h-8 bg-indigo-100 rounded-full -left-4 ring-4 ring-white">
                    <span className="text-indigo-600 font-bold">3</span>
                  </span>
                  <h3 className="font-bold text-lg text-gray-900 mb-1">Reach the Goal</h3>
                  <p className="text-gray-600">Accumulate up to ₦5,000 in your wallet.</p>
                </li>
                <li className="ml-6">
                  <span className="absolute flex items-center justify-center w-8 h-8 bg-indigo-100 rounded-full -left-4 ring-4 ring-white">
                    <span className="text-indigo-600 font-bold">4</span>
                  </span>
                  <h3 className="font-bold text-lg text-gray-900 mb-1">Cash Out</h3>
                  <p className="text-gray-600">Hit the withdraw button and enjoy your earnings!</p>
                </li>
              </ol>
            </div>
          </div>

          {/* CTA */}
          <div className="bg-indigo-600 rounded-2xl p-8 md:p-12 text-center text-white">
            <h2 className="text-3xl font-extrabold mb-4">Stop scrolling for free and start getting paid for it.</h2>
            <p className="text-xl text-indigo-100 mb-8">Join ClickAds today and make every click count!</p>
            <button
              onClick={() => navigate('/auth')}
              className="inline-flex items-center justify-center px-8 py-4 border border-transparent text-lg font-medium rounded-md text-indigo-600 bg-white hover:bg-gray-50 shadow-lg transition-colors"
            >
              Create Free Account
              <ArrowRight className="ml-2 h-5 w-5" />
            </button>
          </div>

        </div>
      </main>
      
      <footer className="bg-white border-t border-gray-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-500 text-sm">
          &copy; {new Date().getFullYear()} ClickAds. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
