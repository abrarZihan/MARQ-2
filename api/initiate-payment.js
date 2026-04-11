import axios from "axios";

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { installmentId, clientId, clientName, clientEmail, clientPhone, amount, installmentNumber } = req.body;
    console.log("Initiating payment for:", { installmentId, clientId, amount });

    if (!installmentId || !clientId || !amount) {
      console.error("Missing required fields");
      return res.status(400).json({ error: "Missing required fields (installmentId, clientId, amount)" });
    }

    const STORE_ID = process.env.SSLCOMMERZ_STORE_ID;
    const STORE_PASSWORD = process.env.SSLCOMMERZ_STORE_PASSWORD;
    const BASE_URL = "https://sandbox.sslcommerz.com";
    const APP_URL = process.env.APP_URL || "https://marq-builders.vercel.app";
    const transactionId = `TXN_${Date.now()}`;

    const params = new URLSearchParams();
    params.append("store_id", STORE_ID);
    params.append("store_passwd", STORE_PASSWORD);
    params.append("total_amount", amount.toString());
    params.append("currency", "BDT");
    params.append("tran_id", transactionId);
    params.append("success_url", `${APP_URL}/api/payment-success`);
    params.append("fail_url", `${APP_URL}/api/payment-fail`);
    params.append("cancel_url", `${APP_URL}/api/payment-fail`);
    
    // Use value_a-d for extra data to keep URLs short and clean
    params.append("value_a", installmentId);
    params.append("value_b", clientId);
    params.append("value_c", amount.toString());
    params.append("value_d", installmentNumber || "General");
    
    params.append("cus_name", clientName || "Client Name");
    params.append("cus_email", clientEmail || "test@test.com");
    params.append("cus_phone", clientPhone || "01700000000");
    params.append("cus_add1", "Dhaka");
    params.append("cus_city", "Dhaka");
    params.append("cus_postcode", "1000");
    params.append("cus_country", "Bangladesh");
    params.append("shipping_method", "NO");
    params.append("product_name", `Installment Payment - ${installmentNumber || "General"}`);
    params.append("product_category", "Real Estate");
    params.append("product_profile", "general");

    console.log("Sending request to SSLCommerz with params:", params.toString());

    const response = await axios.post(`${BASE_URL}/gwprocess/v4/api.php`, params, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    console.log("SSLCommerz response status:", response.status);
    
    if (typeof response.data === 'string' && response.data.includes('<!DOCTYPE html>')) {
      console.error("SSLCommerz returned HTML instead of JSON. First 500 chars:", response.data.substring(0, 500));
      return res.status(500).json({ error: "SSLCommerz returned an error page (HTML)", details: "Check server logs for the HTML content." });
    }

    console.log("SSLCommerz response data:", response.data);

    if (response.data && response.data.GatewayPageURL) {
      console.log("Returning payment URL:", response.data.GatewayPageURL);
      return res.status(200).json({ url: response.data.GatewayPageURL });
    } else {
      console.error("SSLCommerz API error response:", response.data);
      return res.status(500).json({ error: "Failed to get payment URL", details: response.data });
    }
  } catch (error) {
    const errorData = error.response ? error.response.data : error.message;
    console.error("SSLCommerz API error:", errorData);
    return res.status(500).json({ error: "Failed to initiate payment", details: errorData });
  }
}
