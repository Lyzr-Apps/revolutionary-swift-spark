import React, { useState, useEffect, useRef } from 'react';
import parseLLMJson from './utils/jsonParser';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface Location {
  lat: number;
  lng: number;
  address: string;
}

interface RideOption {
  id: string;
  name: string;
  icon: string;
  fare: number;
  eta: string;
  capacity: number;
}

interface Ride {
  id: string;
  pickup: Location;
  dropoff: Location;
  option: RideOption;
  driver?: Driver;
  status: 'pending' | 'accepted' | 'arrived' | 'in_progress' | 'completed' | 'cancelled';
  createdAt: Date;
  fare: number;
  paymentMethod: string;
}

interface Driver {
  id: string;
  name: string;
  photo: string;
  rating: number;
  vehicle: {
    make: string;
    model: string;
    color: string;
    plate: string;
  };
  location: Location;
}

interface PaymentMethod {
  id: string;
  type: 'card' | 'paypal';
  last4?: string;
  email?: string;
  isDefault: boolean;
}

function App() {
  // State Management
  const [user, setUser] = useState<User | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [pickup, setPickup] = useState<Location | null>(null);
  const [dropoff, setDropoff] = useState<Location | null>(null);
  const [currentRide, setCurrentRide] = useState<Ride | null>(null);
  const [rideOptions, setRideOptions] = useState<RideOption[]>([]);
  const [selectedOption, setSelectedOption] = useState<RideOption | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [showProfile, setShowProfile] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState('');
  const [driverLocation, setDriverLocation] = useState<Location | null>(null);
  const [toasts, setToasts] = useState<{id: string; message: string; type: 'info' | 'success' | 'error'}[]>([]);
  const [rideHistory, setRideHistory] = useState<Ride[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showPaymentFAQ, setShowPaymentFAQ] = useState(false);
  const [faqQuery, setFaqQuery] = useState('');
  const [faqResponse, setFaqResponse] = useState('');

  const mapRef = useRef<HTMLDivElement>(null);

  // Color Palette
  const colors = {
    primary: '#1A73E8',
    secondary: '#212121',
    success: '#22C55E',
    warning: '#FACC15',
    error: '#EF4444',
    info: '#3B82F6',
    background: '#F9FAFB',
    surface: '#FFFFFF',
    text: '#18181B'
  };

  // Lyzr Agent API Integration
  const agentIds = {
    rideFeedbackSummarizer: '68e13c55f21978807e7e9c2e',
    paymentHelper: '68e13c61010a31eba9890875'
  };

  const callAgent = async (agentId: string, message: string) => {
    const userId = `user${Math.random().toString(36).substr(2, 9)}@test.com`;
    const sessionId = `${agentId}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      const response = await fetch('https://agent-prod.studio.lyzr.ai/v3/inference/chat/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'sk-default-obhGvAo6gG9YT9tu6ChjyXLqnw7TxSGY'
        },
        body: JSON.stringify({
          user_id: userId,
          agent_id: agentId,
          session_id: sessionId,
          message: message
        })
      });

      const data = await response.json();
      if (data.response) {
        const parsed = parseLLMJson(data.response);
        return parsed;
      }
      return null;
    } catch (error) {
      console.error('Agent API error:', error);
      return null;
    }
  };

  // Authentication
  const handleLogin = async () => {
    // Simulate OAuth login
    const mockUser: User = {
      id: '1',
      name: 'John Doe',
      email: 'john@test.com',
      avatar: 'https://randomuser.me/api/portraits/men/1.jpg'
    };
    setUser(mockUser);
    setShowLogin(false);
    showToast('Login successful!', 'success');

    // Load user data
    await loadUserData();
  };

  const loadUserData = async () => {
    // Load payment methods
    setPaymentMethods([
      { id: '1', type: 'card', last4: '4242', isDefault: true },
      { id: '2', type: 'paypal', email: 'john@test.com', isDefault: false }
    ]);
  };

  // Maps and Location
  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location: Location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            address: 'Your Location'
          };
          setPickup(location);
          showToast('Pickup location set to current position', 'success');
        },
        (error) => {
          console.error('Geolocation error:', error);
          // Fallback to a default location
          const defaultLocation: Location = {
            lat: 37.7749,
            lng: -122.4194,
            address: '123 Market St, San Francisco'
          };
          setPickup(defaultLocation);
          showToast('Pickup location set to default address', 'info');
        }
      );
    } else {
      // Fallback for browsers without geolocation
      const fallbackLocation: Location = {
        lat: 37.7749,
        lng: -122.4194,
        address: '123 Market St, San Francisco'
      };
      setPickup(fallbackLocation);
      showToast('Pickup location set to default address', 'info');
    }
  };

  const handleLocationSelect = (type: 'pickup' | 'dropoff', location: Location) => {
    if (type === 'pickup') {
      setPickup(location);
    } else {
      setDropoff(location);
    }

    if (pickup && dropoff) {
      loadRideOptions();
    }
  };

  const loadRideOptions = () => {
    const options: RideOption[] = [
      { id: 'uberx', name: 'UberX', icon: '🚗', fare: 12.50, eta: '3 min', capacity: 4 },
      { id: 'ubercomfort', name: 'Comfort', icon: '🏎️', fare: 18.75, eta: '4 min', capacity: 4 },
      { id: 'uberxl', name: 'UberXL', icon: '🚙', fare: 25.00, eta: '5 min', capacity: 6 },
      { id: 'uberblack', name: 'Black', icon: '⚫', fare: 45.00, eta: '7 min', capacity: 4 }
    ];
    setRideOptions(options);
    setSelectedOption(options[0]);
  };

  // Booking
  const handleBookRide = async () => {
    if (!pickup || !dropoff || !selectedOption) return;

    const ride: Ride = {
      id: `ride_${Date.now()}`,
      pickup,
      dropoff,
      option: selectedOption,
      status: 'pending',
      createdAt: new Date(),
      fare: selectedOption.fare,
      paymentMethod: paymentMethods.find(pm => pm.isDefault)?.id || '1'
    };

    setCurrentRide(ride);
    showToast('Finding your driver...', 'info');

    // Simulate driver assignment
    setTimeout(() => {
      const driver: Driver = {
        id: 'driver1',
        name: 'Michael Johnson',
        photo: 'https://randomuser.me/api/portraits/men/2.jpg',
        rating: 4.8,
        vehicle: {
          make: 'Toyota',
          model: 'Camry',
          color: 'Silver',
          plate: '7SXM345'
        },
        location: { lat: pickup.lat + 0.001, lng: pickup.lng + 0.001, address: 'Nearby' }
      };

      const updatedRide = { ...ride, driver, status: 'accepted' as const };
      setCurrentRide(updatedRide);
      setDriverLocation(driver.location);
      showToast('Driver assigned!', 'success');

      // Simulate driver arrival
      setTimeout(() => {
        setCurrentRide(prev => prev ? { ...prev, status: 'arrived' } : null);
        showToast('Your driver has arrived!', 'success');

        // Simulate ride completion
        setTimeout(() => {
          handleCompleteRide(ride);
        }, 10000);
      }, 5000);
    }, 3000);
  };

  const handleCompleteRide = (ride: Ride) => {
    const completedRide = { ...ride, status: 'completed' as const };
    setCurrentRide(completedRide);
    setRideHistory(prev => [completedRide, ...prev]);
    setShowRatingModal(true);
  };

  // Feedback System
  const handleSubmitFeedback = async () => {
    const feedbackMessage = `Rating: ${rating}, Feedback: ${feedback}`;

    const feedbackData = await callAgent(agentIds.rideFeedbackSummarizer, feedbackMessage);
    if (feedbackData) {
      console.log('Feedback summary:', feedbackData);
      setShowRatingModal(false);
      showToast('Thank you for your feedback!', 'success');
    }
  };

  // Payment FAQ
  const handlePaymentFAQ = async () => {
    const faqData = await callAgent(agentIds.paymentHelper, faqQuery);
    if (faqData && faqData.payment_assistance) {
      setFaqResponse(faqData.payment_assistance.direct_answer);
    }
  };

  // UI Utilities
  const showToast = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  const handleShareRide = () => {
    const shareUrl = `${window.location.origin}/ride/${currentRide?.id}`;
    navigator.clipboard.writeText(shareUrl);
    showToast('Share link copied to clipboard!', 'success');
  };

  useEffect(() => {
    // Initialize map
    const loadMap = () => {
      if (mapRef.current) {
        // Mock map loading
        setTimeout(() => {
          showToast('Map loaded', 'info');
        }, 1000);
      }
    };

    loadMap();
  }, []);

  return (
    <div className="min-h-screen relative" style={{ backgroundColor: colors.background }}>
      {/* Header */}
      <header className="bg-white shadow-sm p-4 flex justify-between items-center relative z-50">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold" style={{ color: colors.primary }}>Uber</h1>
        </div>
        <div className="flex items-center space-x-4">
          {user ? (
            <div className="flex items-center space-x-2">
              <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full" />
              <button
                onClick={() => setShowProfile(true)}
                className="text-sm font-medium"
                style={{ color: colors.text }}
              >
                {user.name}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowLogin(true)}
              className="px-4 py-2 rounded-lg font-medium"
              style={{ backgroundColor: colors.primary, color: 'white' }}
            >
              Sign In
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative">
        {/* Map Container */}
        <div className="relative h-screen">
          <div
            ref={mapRef}
            className="w-full h-full bg-gray-200 relative"
            style={{ minHeight: '80vh' }}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-4">🗺️</div>
                <p className="text-gray-600">Interactive Map Interface</p>
                {!pickup && (
                  <div className="mt-4 bg-white p-6 rounded-lg shadow-lg">
                    <h3 className="text-lg font-semibold mb-3" style={{ color: colors.text }}>
                      Ready to book your ride?
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Click the button below to set your pickup location
                    </p>
                    <button
                      onClick={handleGetCurrentLocation}
                      className="px-8 py-4 text-white font-bold rounded-lg"
                      style={{ backgroundColor: colors.primary }}
                    >
                      📍 Set Pickup Location
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Current Location Picker */}
            {(pickup && !currentRide) && (
              <div className="absolute top-4 left-4 bg-white rounded-lg p-4 shadow-lg max-w-sm">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-green-500">●</span>
                  <span className="font-medium" style={{ color: colors.text }}>Pickup: {pickup.address}</span>
                </div>
                {!pickoff && (
                  <button
                    onClick={() => setShowLocationModal(true)}
                    className="w-full mt-3 py-2 px-4 rounded-lg font-medium"
                    style={{ backgroundColor: colors.primary, color: 'white' }}
                  >
                    🎯 Set Dropoff Location
                  </button>
                )}
                {dropoff && (
                  <div className="flex items-center space-x-2 mt-2">
                    <span className="text-red-500">●</span>
                    <span className="font-medium" style={{ color: colors.text }}>Dropoff: {dropoff.address}</span>
                  </div>
                )}
              </div>
            )}

            {/* Driver Location */}
            {driverLocation && currentRide?.status === 'accepted' && (
              <div className="absolute top-4 right-4 bg-white rounded-lg p-4 shadow-lg">
                <div className="flex items-center space-x-2">
                  <span className="text-blue-500">●</span>
                  <span className="font-medium" style={{ color: colors.text }}>
                    Driver En Route
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Panel for Ride Selection */}
          {pickup && dropoff && !currentRide && (
            <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-xl shadow-lg p-6 max-h-96 overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4" style={{ color: colors.text }}>Choose your ride</h3>
              <div className="flex space-x-4 overflow-x-auto pb-4">
                {rideOptions.map((option) => (
                  <div
                    key={option.id}
                    onClick={() => setSelectedOption(option)}
                    className={`min-w-32 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedOption?.id === option.id
                        ? 'border-primary'
                        : 'border-gray-200'
                    }`}
                    style={{
                      borderColor: selectedOption?.id === option.id ? colors.primary : '#E5E7EB'
                    }}
                  >
                    <div className="text-3xl mb-2">{option.icon}</div>
                    <div className="font-medium" style={{ color: colors.text }}>{option.name}</div>
                    <div className="text-sm" style={{ color: colors.text }}>${option.fare.toFixed(2)}</div>
                    <div className="text-sm text-gray-500">{option.eta}</div>
                  </div>
                ))}
              </div>
              <button
                onClick={handleBookRide}
                disabled={!selectedOption || !user}
                className="w-full mt-4 py-3 text-white font-medium rounded-lg disabled:opacity-50"
                style={{ backgroundColor: colors.primary }}
              >
                {user ? 'Request Uber' : 'Please Sign In'}
              </button>
            </div>
          )}

          {/* Driver Card */}
          {currentRide?.driver && (
            <div className="absolute bottom-4 left-4 right-4 bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold" style={{ color: colors.text }}>
                    {currentRide.driver.name}
                  </h3>
                  <div className="flex items-center space-x-1">
                    <span className="text-yellow-500">★</span>
                    <span className="text-sm" style={{ color: colors.text }}>
                      {currentRide.driver.rating}
                    </span>
                  </div>
                </div>
                <img
                  src={currentRide.driver.photo}
                  alt={currentRide.driver.name}
                  className="w-16 h-16 rounded-full"
                />
              </div>
              <div className="mb-4">
                <div className="text-sm" style={{ color: colors.text }}>
                  {currentRide.driver.vehicle.make} {currentRide.driver.vehicle.model}
                </div>
                <div className="text-sm" style={{ color: colors.text }}>
                  {currentRide.driver.vehicle.color} • {currentRide.driver.vehicle.plate}
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: colors.info, color: 'white' }}>
                  {currentRide.status.replace('_', ' ').toUpperCase()}
                </span>
                <button
                  onClick={handleShareRide}
                  className="text-sm px-4 py-2 rounded-lg"
                  style={{ backgroundColor: colors.primary, color: 'white' }}
                >
                  Share Ride
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Login Modal */}
      {showLogin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold mb-6" style={{ color: colors.text }}>Sign In</h2>
            <div className="space-y-4">
              <button
                onClick={handleLogin}
                className="w-full py-3 px-4 text-white font-medium rounded-lg"
                style={{ backgroundColor: colors.primary }}
              >
                Continue with Google
              </button>
              <button
                onClick={handleLogin}
                className="w-full py-3 px-4 text-white font-medium rounded-lg"
                style={{ backgroundColor: colors.secondary }}
              >
                Continue with Apple
              </button>
            </div>
            <button
              onClick={() => setShowLogin(false)}
              className="w-full mt-6 py-3 text-gray-500"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Location Modal */}
      {showLocationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4" style={{ color: colors.text }}>Set Locations</h3>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Enter pickup address"
                className="w-full p-3 border rounded-lg"
                value={pickup?.address || ''}
                onChange={(e) => setPickup(prev => prev ? {...prev, address: e.target.value} : null)}
              />
              <input
                type="text"
                placeholder="Enter dropoff address"
                className="w-full p-3 border rounded-lg"
                value={dropoff?.address || ''}
                onChange={(e) => setDropoff({lat: 37.7749, lng: -122.4194, address: e.target.value})}
              />
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowLocationModal(false)}
                  className="flex-1 py-3 text-white font-medium rounded-lg"
                  style={{ backgroundColor: colors.primary }}
                >
                  Confirm
                </button>
                <button
                  onClick={() => setShowLocationModal(false)}
                  className="flex-1 py-3 text-gray-500 border rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rating Modal */}
      {showRatingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4" style={{ color: colors.text }}>Rate Your Ride</h3>
            <div className="flex justify-center space-x-2 mb-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className={`text-3xl ${rating >= star ? 'text-yellow-500' : 'text-gray-300'}`}
                >
                  ★
                </button>
              ))}
            </div>
            <textarea
              placeholder="Share your feedback (optional)"
              className="w-full p-3 border rounded-lg mb-4"
              rows={3}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
            />
            <div className="flex space-x-3">
              <button
                onClick={handleSubmitFeedback}
                className="flex-1 py-3 text-white font-medium rounded-lg"
                style={{ backgroundColor: colors.primary }}
              >
                Submit
              </button>
              <button
                onClick={() => setShowRatingModal(false)}
                className="flex-1 py-3 text-gray-500 border rounded-lg"
              >
                Skip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {showProfile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 max-h-96 overflow-y-auto">
            <div className="flex items-center mb-6">
              <img src={user?.avatar} alt={user?.name} className="w-16 h-16 rounded-full mr-4" />
              <div>
                <h3 className="text-lg font-semibold" style={{ color: colors.text }}>{user?.name}</h3>
                <p className="text-sm text-gray-500">{user?.email}</p>
              </div>
            </div>
            <div className="space-y-4">
              <button
                onClick={() => {setShowProfile(false); setShowHistory(true);}}
                className="w-full py-3 text-left border-b"
              >
                Ride History
              </button>
              <button
                onClick={() => {setShowProfile(false); setShowPaymentFAQ(true);}}
                className="w-full py-3 text-left border-b"
              >
                Payment FAQ
              </button>
              <button
                onClick={() => {setUser(null); setShowProfile(false);}}
                className="w-full py-3 text-left border-b"
              >
                Sign Out
              </button>
            </div>
            <button
              onClick={() => setShowProfile(false)}
              className="w-full mt-6 py-3 text-gray-500"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Ride History Modal */}
      {showHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 max-h-96 overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4" style={{ color: colors.text }}>Ride History</h3>
            <div className="space-y-3">
              {rideHistory.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No recent rides</p>
              ) : (
                rideHistory.map((ride) => (
                  <div key={ride.id} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-medium" style={{ color: colors.text }}>
                          {ride.option.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {ride.pickup.address} → {ride.dropoff.address}
                        </div>
                      </div>
                      <div className="font-medium" style={{ color: colors.primary }}>
                        ${ride.fare.toFixed(2)}
                      </div>
                    </div>
                    <button
                      onClick={() => showToast('Receipt downloaded!', 'success')}
                      className="text-sm text-blue-500 hover:text-blue-700"
                    >
                      Download Receipt
                    </button>
                  </div>
                ))
              )}
            </div>
            <button
              onClick={() => setShowHistory(false)}
              className="w-full mt-6 py-3 text-gray-500"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Payment FAQ Modal */}
      {showPaymentFAQ && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 max-h-96 overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4" style={{ color: colors.text }}>Payment Help</h3>
            <div className="mb-4">
              <input
                type="text"
                placeholder="What would you like to know about payments?"
                className="w-full p-3 border rounded-lg mb-3"
                value={faqQuery}
                onChange={(e) => setFaqQuery(e.target.value)}
              />
              <button
                onClick={handlePaymentFAQ}
                className="w-full py-2 text-white font-medium rounded-lg"
                style={{ backgroundColor: colors.primary }}
              >
                Ask
              </button>
            </div>
            {faqResponse && (
              <div className="p-4 bg-gray-100 rounded-lg mb-4 text-sm">
                {faqResponse}
              </div>
            )}
            <button
              onClick={() => setShowPaymentFAQ(false)}
              className="w-full py-3 text-gray-500"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Toasts */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-4 py-3 rounded-lg shadow-lg text-white font-medium transition-all`}
            style={{
              backgroundColor: toast.type === 'error' ? colors.error :
                toast.type === 'success' ? colors.success : colors.info
            }}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;