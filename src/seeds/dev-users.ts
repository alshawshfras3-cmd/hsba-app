export interface DevUserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'user';
  subscription: 'free' | 'basic' | 'premium' | 'enterprise';
  subscription_expires_at?: string | null;
  created_at: string;
  last_login?: string | null;
}

export const devUsers: DevUserProfile[] = [
  {
    id: 'owner_id',
    email: 'alshawshfras3@gmail.com',
    full_name: 'فراس الشاوش (مالك المنصة)',
    role: 'admin',
    subscription: 'enterprise',
    created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    last_login: new Date().toISOString(),
  },
  {
    id: 'manager_id_1',
    email: 'manager@hesba.sa',
    full_name: 'مدير الصلاحيات المساعد',
    role: 'admin',
    subscription: 'premium',
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    last_login: new Date().toISOString(),
  },
  {
    id: 'employee_id_1',
    email: 'employee@hesba.sa',
    full_name: 'الموظف الداخلي المالي',
    role: 'user',
    subscription: 'basic',
    created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    last_login: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'user_id_1',
    email: 'user@hesba.sa',
    full_name: 'العميل المالي المعتمد',
    role: 'user',
    subscription: 'free',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    last_login: null,
  }
];
