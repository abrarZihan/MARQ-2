export default async function handler(req, res) {
  const { clientId } = req.query;
  const APP_URL = process.env.APP_URL || "https://marq-builders.vercel.app";

  // SSLCommerz calls this on failure/cancel
  // Redirect client back with ?payment=failed
  return res.redirect(302, `${APP_URL}?payment=failed&clientId=${clientId}`);
}
