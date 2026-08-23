import { Link } from 'react-router-dom';
import { XCircle } from 'lucide-react';

export default function BookingCancel() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white max-w-md w-full rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <XCircle className="mx-auto text-red-500 mb-6" size={64} />
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Payment Cancelled</h1>
        <p className="text-gray-600 mb-8">
          You cancelled the checkout process. Your booking is currently unpaid and pending. You can complete the payment from your dashboard.
        </p>
        <div className="flex flex-col gap-3">
          <Link 
            to="/dashboard"
            className="block w-full bg-black text-white font-bold py-3 rounded-full hover:bg-gray-900 transition-colors"
          >
            Go to My Bookings
          </Link>
          <Link 
            to="/"
            className="block w-full bg-gray-100 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors"
          >
            Return Home
          </Link>
        </div>
      </div>
    </div>
  );
}
