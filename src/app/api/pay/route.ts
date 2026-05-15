import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { amount, phoneNumber } = await req.json();

    if (!amount || !phoneNumber) {
      return NextResponse.json({ success: false, error: "Missing amount or phone number" }, { status: 400 });
    }

    // This calls Africa's Talking Sandbox
    const response = await fetch("https://payments.africastalking.com/mobile/checkout/request", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": process.env.AT_API_KEY || "",
      },
      body: JSON.stringify({
        username: process.env.AT_USERNAME,
        productName: "NexusLiveTokens", 
        phoneNumber: phoneNumber, 
        currencyCode: "UGX",
        amount: Number(amount),
        metadata: {
          "admin_revenue_phone": "+256708109280"
        }
      }),
    });

    const data = await response.json();
    
    if (data.status === 'PendingConfirmation' || data.status === 'Success') {
      return NextResponse.json({ success: true, transactionId: data.transactionId });
    } else {
      return NextResponse.json({ success: false, error: data.errorMessage }, { status: 400 });
    }

  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}