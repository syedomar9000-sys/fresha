import { Link } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';

export default function BookingSuccess() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white max-w-md w-full rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <CheckCircle className="mx-auto text-green-500 mb-6" size={64} />
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Booking Confirmed!</h1>
        <p className="text-gray-600 mb-8">
          Your payment was successful and your appointment has been confirmed. You can view the details in your dashboard.
        </p>
        <Link 
          to="/dashboard"
          className="block w-full bg-black text-white font-bold py-3 rounded-full hover:bg-gray-900 transition-colors"
        >
          Go to My Bookings
        </Link>
      </div>
    </div>
  );
}
