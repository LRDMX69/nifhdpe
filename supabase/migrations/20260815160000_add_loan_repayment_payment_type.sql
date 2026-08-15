-- Distinguish staff-loan repayments from salary payments in the central worker-payment ledger.
ALTER TYPE public.payment_type ADD VALUE IF NOT EXISTS 'loan_repayment';
