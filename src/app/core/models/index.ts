// ─── Auth ───────────────────────────────────────────────────
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  planSlug?: string | null;    // 'basic' | 'premium' | 'platinum' | null
  planName?: string | null;
  avatarUrl?: string;
  tenantId?: string;
  permissions?: Record<string, string[]>;
  tenant?: Tenant;
  mustChangePassword?: boolean;
}

export interface LoginResponse extends AuthTokens {
  user: AuthUser;
}

// ─── Enums ──────────────────────────────────────────────────
export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'SECRETARY' | 'DOCTOR_ADMIN' | 'DOCTOR' | 'RECEPTIONIST' | 'NURSE' | 'ACCOUNTANT';
export type TenantStatus = 'ACTIVE' | 'SUSPENDED' | 'TRIAL' | 'CANCELLED';
export type AppointmentStatus = 'SCHEDULED' | 'CONFIRMED' | 'WAITING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW' | 'RESCHEDULED';
export type WhatsappSessionStatus = 'DISCONNECTED' | 'QR_PENDING' | 'CONNECTED' | 'RECONNECTING' | 'BANNED';

// ─── Pagination ──────────────────────────────────────────────
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

// ─── Plan ────────────────────────────────────────────────────
export interface Plan {
  id: string;
  name: string;
  slug: string;
  description?: string;
  monthlyPrice: number;
  annualPrice: number;
  maxUsers: number;
  maxBranches: number;
  maxClinics: number;
  maxWhatsappMessages: number;
  hasExternalPortal: boolean;
  hasAdvancedDashboard: boolean;
  hasPredictiveAnalytics: boolean;
  hasInventoryTransfer: boolean;
  hasQuotes: boolean;
  hasApiAccess?: boolean;
  hasWhatsappBasic: boolean;
  hasWhatsappAdvanced: boolean;
  hasDataImport: boolean;
  hasStatisticalReports: boolean;
  storageGb: number;
  isActive: boolean;
  isFeatured: boolean;
  sortOrder: number;
}

// ─── Tenant ──────────────────────────────────────────────────
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone?: string;
  status: TenantStatus;
  logoUrl?: string;
  country: string;
  extraClinics?: number;
  isDemo?: boolean;
  demoEndsAt?: string;
  subscriptions?: Subscription[];
  _count?: { users: number; clinics: number };
}

export interface Subscription {
  id: string;
  planId: string;
  status: string;
  billingCycle: 'MONTHLY' | 'ANNUAL';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEndsAt?: string;
  price: number;
  currency?: string;
  metadata?: any;
  plan?: Plan;
}

// ─── Clinic ──────────────────────────────────────────────────
export interface Clinic {
  id: string;
  tenantId: string;
  name: string;
  legalName?: string;
  taxId?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  quotePrefix?: string;
  website?: string;
  isActive: boolean;
  _count?: { branches: number; doctors: number };
}

// ─── Branch ──────────────────────────────────────────────────
export interface Branch {
  id: string;
  clinicId: string;
  name: string;
  address?: string;
  city?: string;
  phone?: string;
  isMain: boolean;
  isActive: boolean;
}

// ─── User ────────────────────────────────────────────────────
export interface User {
  id: string;
  tenantId?: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: string;
  phone?: string;
  avatarUrl?: string;
  lastLoginAt?: string;
  doctorProfile?: DoctorProfile;
  tenant?: { id: string; name: string; slug: string; status: string; extraClinics?: number };
}

// ─── Doctor ──────────────────────────────────────────────────
export interface DoctorProfile {
  id: string;
  userId: string;
  clinicId: string;
  licenseNumber?: string;
  specialties: string[];
  bio?: string;
  consultationFee?: number;
  commissionType: string;
  commissionValue: number;
  isActive: boolean;
  user?: User;
  schedules?: DoctorSchedule[];
}

export interface DoctorSchedule {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotMinutes: number;
  branchId?: string;
  isActive?: boolean;
}

// ─── Patient ─────────────────────────────────────────────────
export interface Patient {
  id: string;
  clinicId: string;
  branchId?: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  whatsapp?: string;
  birthDate?: string;
  gender?: string;
  documentType?: string;
  documentNumber?: string;
  allergies?: string;
  bloodType?: string;
  notes?: string;
  whatsappConsent?: boolean;
  isActive: boolean;
  lastVisitAt?: string;
  branch?: { id: string; name: string; isMain: boolean };
  _count?: { appointments: number };
}

// ─── Appointment ─────────────────────────────────────────────
export interface Appointment {
  id: string;
  branchId: string;
  clinicId: string;
  patientId: string;
  doctorId: string;
  scheduledAt: string;
  durationMinutes: number;
  status: AppointmentStatus;
  source: string;
  totalAmount: number;
  paymentStatus: string;
  paidAmount: number;
  notes?: string;
  createdAt?: string;
  patient?: Patient;
  doctor?: DoctorProfile;
  treatments?: AppointmentTreatment[];
  payments?: AppointmentPayment[];
}

export interface AppointmentTreatment {
  id: string;
  treatmentId: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  totalPrice: number;
  treatment?: Treatment;
}

export interface AppointmentPayment {
  id: string;
  amount: number;
  method: string;
  reference?: string;
  status: string;
  paidAt: string;
}

// ─── Treatment ───────────────────────────────────────────────
export interface Treatment {
  id: string;
  clinicId: string;
  name: string;
  description?: string;
  price: number;
  durationMinutes: number;
  categoryId?: string;
  isActive: boolean;
  isPromoted: boolean;
  promotionPrice?: number;
  category?: TreatmentCategory;
}

export interface TreatmentCategory {
  id: string;
  name: string;
  color?: string;
}

// ─── Inventory ───────────────────────────────────────────────
export interface InventoryProduct {
  id: string;
  name: string;
  description?: string;
  sku?: string;
  unit: string;
  hasExpiry: boolean;
  minimumStock: number;
  isActive: boolean;
  totalStock?: number;
  isLowStock?: boolean;
  isExpiringSoon?: boolean;
  category?: { name: string };
}

// ─── Quote ───────────────────────────────────────────────────
export interface Quote {
  id: string;
  quoteNumber: string;
  status: string;
  issueDate: string;
  expiryDate: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  notes?: string;
  patient?: Patient;
  items?: QuoteItem[];
}

export interface QuoteItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  totalPrice: number;
  treatment?: Treatment;
}

// ─── Patient Files & Odontogram ──────────────────────────────
export interface PatientFile {
  id: string;
  patientId: string;
  name: string;
  description?: string;
  fileUrl: string;
  fileType: string;
  mimeType?: string;
  sizeBytes?: number;
  createdAt: string;
}

export interface OdontogramRecord {
  id: string;
  patientId: string;
  toothNumber: number;
  surface?: string;
  condition: string;
  notes?: string;
  appointmentId?: string;
  createdAt: string;
}

// ─── Commissions ─────────────────────────────────────────────
export interface CommissionRecord {
  id: string;
  tenantId: string;
  doctorId: string;
  appointmentId: string;
  baseAmount: number;
  commissionType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  commissionRate: number;
  commissionAmount: number;
  status: 'PENDING' | 'PAID';
  period: string;
  paidAt?: string;
  appointment?: { scheduledAt: string; patient?: Patient };
}

// ─── WhatsApp ────────────────────────────────────────────────
export interface WhatsappSession {
  id: string;
  tenantId: string;
  phoneNumber?: string;
  status: WhatsappSessionStatus;
  qrCode?: string;
  connectedAt?: string;
  isClientActive: boolean;
  isInitializing?: boolean;
}

// ─── Dashboard ───────────────────────────────────────────────
export interface DashboardOverview {
  financial: {
    totalRevenue: number;
    revenueGrowth: number;
    avgTicket: number;
    prevRevenue: number;
  };
  medical: {
    totalAppointments: number;
    completedAppointments: number;
    cancelledAppointments: number;
    noShowAppointments: number;
    noShowRate: number;
    completionRate: number;
    cancellationRate: number;
    newPatients: number;
    retentionRate: number;
    activeDoctors: number;
  };
  today?: {
    total: number;
    inProgress: number;
    confirmed: number;
    completed: number;
    pending: number;
  };
  topDoctor?: { name: string; revenue: number };
  inventoryAlerts?: { id: string; name: string; totalStock: number; minimumStock: number }[];
}
