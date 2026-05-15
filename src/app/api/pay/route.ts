import AfricasTalking from 'africastalking';

const at = AfricasTalking({
  apiKey: process.env.AT_API_KEY!,
  username: process.env.AT_USERNAME!
});

export async function POST(req: Request) {
  try {
    const { phoneNumber, amount, userId } = await req.json();

    const result = await at.PAYMENTS.mobileCheckout({
      productName: 'NexusLiveTokens', // MUST match the name in your Africa's Talking dashboard
      phoneNumber: phoneNumber,      // e.g. +2567...
      currencyCode: 'UGX',
      amount: Number(amount),
      metadata: {
        userId: userId               // Passes your Supabase User ID so we know who to give tokens to
      }
    });

    return Response.json(result);
  } catch (error: any) {
    console.error('Payment Trigger Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
