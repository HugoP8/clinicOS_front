import { Routes } from '@angular/router';
import { authGuard, publicGuard, superAdminGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  // Redirect root
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

  // Auth layout
  {
    path: 'auth',
    canActivate: [publicGuard],
    loadComponent: () => import('./layouts/auth-layout/auth-layout.component').then(m => m.AuthLayoutComponent),
    children: [
      { path: '', redirectTo: 'login', pathMatch: 'full' },
      { path: 'login', loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent) },
    ],
  },

  // Main app layout (authenticated)
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layouts/main-layout/main-layout.component').then(m => m.MainLayoutComponent),
    children: [
      // Dashboard
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
      },

      // Profile
      {
        path: 'profile',
        loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent),
      },

      // Clinics
      {
        path: 'clinics',
        loadComponent: () => import('./features/clinics/clinics.component').then(m => m.ClinicsComponent),
      },

      // Branches
      {
        path: 'branches',
        loadComponent: () => import('./features/branches/branches.component').then(m => m.BranchesComponent),
      },

      // Users
      {
        path: 'users',
        loadComponent: () => import('./features/users/users.component').then(m => m.UsersComponent),
      },

      // Doctors
      {
        path: 'doctors',
        loadComponent: () => import('./features/doctors/doctors.component').then(m => m.DoctorsComponent),
      },

      // Patients
      {
        path: 'patients',
        loadComponent: () => import('./features/patients/patients.component').then(m => m.PatientsComponent),
      },

      // Appointments
      {
        path: 'appointments',
        loadComponent: () => import('./features/appointments/appointments.component').then(m => m.AppointmentsComponent),
      },

      // Treatments
      {
        path: 'treatments',
        loadComponent: () => import('./features/treatments/treatments.component').then(m => m.TreatmentsComponent),
      },

      // Inventory
      {
        path: 'inventory',
        loadComponent: () => import('./features/inventory/inventory.component').then(m => m.InventoryComponent),
      },

      // Quotes
      {
        path: 'quotes',
        loadComponent: () => import('./features/quotes/quotes.component').then(m => m.QuotesComponent),
      },

      // WhatsApp
      {
        path: 'whatsapp',
        loadComponent: () => import('./features/whatsapp/whatsapp.component').then(m => m.WhatsappComponent),
      },

      // Commissions
      {
        path: 'commissions',
        loadComponent: () => import('./features/commissions/commissions.component').then(m => m.CommissionsComponent),
      },

      // Accounts Receivable
      {
        path: 'accounts-receivable',
        loadComponent: () => import('./features/accounts-receivable/accounts-receivable.component').then(m => m.AccountsReceivableComponent),
      },

      // Import
      {
        path: 'import',
        loadComponent: () => import('./features/import/import.component').then(m => m.ImportComponent),
      },

      // Audit log
      {
        path: 'audit',
        loadComponent: () => import('./features/audit/audit.component').then(m => m.AuditComponent),
      },

      // Super Admin routes
      {
        path: 'super-admin',
        canActivate: [superAdminGuard],
        children: [
          {
            path: 'tenants',
            loadComponent: () => import('./features/super-admin/tenants/tenants.component').then(m => m.TenantsComponent),
          },
          {
            path: 'plans',
            loadComponent: () => import('./features/super-admin/plans/plans.component').then(m => m.PlansComponent),
          },
          {
            path: 'recharges',
            loadComponent: () => import('./features/super-admin/recharges/recharges.component').then(m => m.RechargesComponent),
          },
        ],
      },
    ],
  },

  // Wildcard
  { path: '**', redirectTo: 'dashboard' },
];
