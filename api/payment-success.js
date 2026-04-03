import axios from "axios";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";
import fs from "fs";
import path from "path";

const configPath = path.join(process.cwd(), "firebase-applet-config.json");
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { 
    val_id, 
    tran_id, 
    value_a: installmentId, 
    value_b: clientId, 
    value_c: amount, 
    value_d: installmentNumber 
  } = req.body;

  if (!val_id) {
    console.error("Missing val_id in callback body:", req.body);
    return res.status(400).json({ error: "Missing validation ID" });
  }

  const STORE_ID = "marqb69c56224e0f27";
  const STORE_PASSWORD = "marqb69c56224e0f27@ssl";
  const VALIDATION_URL = "https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php";
  const APP_URL = process.env.APP_URL || "https://marq-builders.vercel.app";

  try {
    // Validate payment
    const validationResponse = await axios.get(VALIDATION_URL, {
      params: {
        val_id: val_id,
        store_id: STORE_ID,
        store_passwd: STORE_PASSWORD,
        format: "json",
      },
    });

    if (validationResponse.data && validationResponse.data.status === "VALID") {
      // Payment is valid, update Firestore
      const paymentData = {
        clientId: clientId,
        instDefId: installmentId,
        amount: parseFloat(amount),
        status: "approved",
        date: new Date().toISOString().split('T')[0],
        paidAt: serverTimestamp(),
        transactionId: tran_id,
        paymentMethod: "SSLCommerz",
        note: `Online Payment - Installment ${installmentNumber}`,
        val_id: val_id
      };

      await addDoc(collection(db, "payments"), paymentData);

      // Redirect back to client page with success params
      return res.redirect(302, `${APP_URL}?payment=success&transactionId=${tran_id}&amount=${amount}&installmentNumber=${installmentNumber}&installmentId=${installmentId}`);
    } else {
      console.error("SSLCommerz Validation failed:", validationResponse.data);
      return res.redirect(302, `${APP_URL}?payment=failed&error=validation_failed`);
    }
  } catch (error) {
    console.error("Payment success handler error:", error);
    return res.redirect(302, `${APP_URL}?payment=failed&error=server_error`);
  }
}
