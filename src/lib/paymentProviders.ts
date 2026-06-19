/**
 * HESBA Subscription System
 * Payment Providers Abstraction Layer
 * Prepares the platform for future payment gateway integrations (e.g. Moyasar, PayTabs, Tap, or Stripe)
 */

import { supabase } from './supabase';

export interface CheckoutSessionParams {
  userId: string;
  planCode: 'monthly' | 'six_months';
  amountSar: number;
  customerPhone: string;
  customerEmail: string;
}

export interface PaymentTransactionResponse {
  transactionId: string;
  checkoutUrl: string;
  status: 'pending' | 'completed' | 'failed';
}

/**
 * Interface representing a generic e-payment provider in Saudi Arabia
 */
export interface PaymentProvider {
  /** Uniquely identifies the provider, e.g., 'moyasar', 'paytabs', 'stripe' */
  id: string;
  
  /** Human-readable commercial name of the provider */
  name: string;

  /**
   * Initializes a new online checkout transaction and returns payment links
   */
  createCheckoutSession(params: CheckoutSessionParams): Promise<PaymentTransactionResponse>;

  /**
   * Validates if a specific payment session was successfully fulfilled
   */
  verifyPayment(transactionId: string): Promise<boolean>;
}

/**
 * Mock implementation of futuristic Moyasar/PayTabs payment gateways
 * Handles recording pending transactions into `payment_transactions`
 */
export class MockSaudiSmartPaymentProvider implements PaymentProvider {
  id = 'saudi_smart_pay';
  name = 'بوابة الدفع الذكية المدمجة (مدى، سداد، فيزا)';

  async createCheckoutSession(params: CheckoutSessionParams): Promise<PaymentTransactionResponse> {
    console.log(`[PAYMENT PROVIDER] Initializing checkout session with ${this.name}...`, params);

    // 1. Generate unique merchant reference
    const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    
    // 2. Draft transactional record inside payment_transactions database table
    try {
      const { error } = await supabase
        .from('payment_transactions')
        .insert({
          user_id: params.userId,
          transaction_id: transactionId,
          provider: this.id,
          amount: params.amountSar,
          currency: 'SAR',
          status: 'pending',
          metadata: {
            plan_code: params.planCode,
            customer_email: params.customerEmail,
            customer_phone: params.customerPhone,
            payment_initiated_at: new Date().toISOString()
          }
        });

      if (error) {
        console.error('[PAYMENT SEED ERROR] Failed to log transaction state:', error);
      } else {
        console.log(`[PAYMENT SEED SUCCESS] Logged pending gateway session under Reference: ${transactionId}`);
      }
    } catch (e) {
      console.warn('[PAYMENT SEED WARNING] Running offline or missing DB access, proceeding with mock metadata:', e);
    }

    // 3. Return dummy checkout redirects
    const mockCheckoutUrl = `/subscription?checkout_session=${transactionId}&plan=${params.planCode}&gateway=${this.id}`;
    
    return {
      transactionId,
      checkoutUrl: mockCheckoutUrl,
      status: 'pending'
    };
  }

  async verifyPayment(transactionId: string): Promise<boolean> {
    console.log(`[PAYMENT VERIFIER] Verifying transaction status for reference: ${transactionId}`);
    
    try {
      // Look up current status from our DB
      const { data, error } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('transaction_id', transactionId)
        .single();
        
      if (error || !data) {
        return false;
      }
      
      return data.status === 'completed' || data.status === 'paid';
    } catch {
      return false;
    }
  }
}

/**
 * Active payment gateway loader
 */
export function getActivePaymentProvider(): PaymentProvider {
  return new MockSaudiSmartPaymentProvider();
}
