import { UserSubscription } from '../types';

export const initialUserSubscriptions: UserSubscription[] = [
  {
    id: 'user_01',
    username: 'أحمد القحطاني',
    email: 'ahmed.q@sahlah.com',
    role: 'admin',
    plan: 'enterprise',
    calculationsCount: 1450,
    expiryDate: '2028-12-31',
    isActive: true
  },
  {
    id: 'user_02',
    username: 'سارة الدوسري',
    email: 'sara.d@fintech.sa',
    role: 'user',
    plan: 'premium',
    calculationsCount: 420,
    expiryDate: '2027-06-30',
    isActive: true
  },
  {
    id: 'user_03',
    username: 'فيصل الحربي',
    email: 'faisal.h@gmail.com',
    role: 'user',
    plan: 'free',
    calculationsCount: 12,
    expiryDate: '2026-10-15',
    isActive: true
  }
];
