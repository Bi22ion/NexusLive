import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Use Service Role to bypass RLS
);

export async function POST(req: Request) {
  try {
    const data = await req.json();
    
    // Africa's Talking sends status in the 'status' or 'category' field
    if (data.status === 'Success') {
      const { transactionId, value, phoneNumber } = data;
      const amount = parseFloat(value.replace('UGX ', ''));
      const tokensToAdd = amount / 10; // 2500 UGX = 250 Tokens

      // Update the database
      const { error } = await supabase.from('payment_logs').insert({
        transaction_id: transactionId,
        phone_number: phoneNumber,
        amount: amount,
        status: 'Success'
        // Note: You'll need to pass the user_id in metadata if you want to link it to a specific user
      });

      if (error) throw error;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('Callback Error:', err);
    return NextResponse.json({ error: 'Callback failed' }, { status: 500 });
  }
}
