export interface Business {
  id: number;
  name: string;
  slug: string;
  description: string;
  category: string;
  city: string;
  address: string;
  phoneNumber: string;
  contactEmail: string;
}

export interface Service {
  id: number;
  name: string;
  description: string;
  price: string; // or number, but decimal is serialized as string usually
  deposit: string;
  durationMinutes: number;
  category: string;
  categoryName?: string;
  isActive: boolean;
}

export interface StaffAvailability {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface StaffMember {
  id: number;
  firstName: string;
  lastName: string;
  bio: string;
  services: number[];
  availabilities: StaffAvailability[];
  isActive: boolean;
}

export interface User {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'CUSTOMER' | 'BUSINESS' | 'BUSINESS_OWNER' | 'STAFF' | 'ADMIN' | string;
}

export interface Appointment {
  id: number;
  customer?: User;
  service?: Service;
  staffMember?: StaffMember;
  startTime: string;
  endTime: string;
  status: string;
  paymentStatus: string;
  notes: string;
  createdAt: string;
}

export interface Review {
  id: number;
  appointmentId: number;
  rating: number;
  comment: string;
  createdAt: string;
  customerName: string;
}

export interface Analytics {
  totalRevenue: number;
  totalBookings: number;
  weeklyBookings: Array<{ week: string; count: number }>;
}
