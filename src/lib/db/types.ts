export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "patient" | "doctor" | "admin";
export type BookingStatus =
  | "pending_doctor_review"
  | "needs_more_information"
  | "ready_for_payment"
  | "confirmed"
  | "completed"
  | "cancelled";
export type PaymentStatus = "not_required" | "pending" | "paid" | "refunded" | "failed";
export type IntakeReviewStatus =
  | "not_started"
  | "submitted"
  | "needs_more_information"
  | "approved"
  | "rejected";

export type UserProfile = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  created_at: string;
};

export type PatientProfile = {
  user_id: string;
  date_of_birth: string | null;
  gender: string | null;
  address: string | null;
  emergency_contact: string | null;
  allergies: string | null;
  medications: string | null;
  contraindications: string | null;
  profile_completion_status: string;
  created_at: string;
  updated_at: string;
};

export type Booking = {
  id: string;
  patient_id: string;
  doctor_id: string | null;
  treatment_id: string;
  appointment_type: string;
  location: string;
  appointment_date: string | null;
  appointment_time: string | null;
  status: BookingStatus;
  payment_status: PaymentStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
};
