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

// Cleared of any mock/fake user profiles (manager@hesba.sa, employee@hesba.sa, user@hesba.sa)
export const devUsers: DevUserProfile[] = [];
