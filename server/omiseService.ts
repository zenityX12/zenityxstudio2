import Omise from "omise";
import { ENV } from "./_core/env";
import { getOmiseKeys } from "./systemSettingsService";

// Cache for Omise keys and client
let cachedKeys: { publicKey: string | null; secretKey: string | null } | null = null;
let cachedOmiseClient: ReturnType<typeof Omise> | null = null;
let lastKeyCheck = 0;
const KEY_CACHE_DURATION = 60000; // 1 minute

/**
 * Get Omise API keys from database with caching
 */
async function getKeys() {
  const now = Date.now();
  
  // Return cached keys if still valid
  if (cachedKeys && (now - lastKeyCheck) < KEY_CACHE_DURATION) {
    return cachedKeys;
  }
  
  // Try to get keys from database first
  const dbKeys = await getOmiseKeys();
  
  // Fallback to environment variables if database keys not found
  const publicKey = dbKeys.publicKey || ENV.omisePublicKey || null;
  const secretKey = dbKeys.secretKey || ENV.omiseSecretKey || null;
  
  cachedKeys = { publicKey, secretKey };
  lastKeyCheck = now;
  
  console.log("[Omise] Keys loaded:", {
    source: dbKeys.publicKey ? "database" : "environment",
    publicKeyExists: !!publicKey,
    secretKeyExists: !!secretKey,
    publicKeyPrefix: publicKey ? publicKey.substring(0, 15) + "..." : "undefined",
  });
  
  return cachedKeys;
}

/**
 * Get or create Omise client instance
 */
async function getOmiseClient() {
  const keys = await getKeys();
  
  if (!keys.publicKey || !keys.secretKey) {
    throw new Error("Omise API keys not configured");
  }
  
  // Create new client if keys changed or client doesn't exist
  if (!cachedOmiseClient) {
    cachedOmiseClient = Omise({
      publicKey: keys.publicKey,
      secretKey: keys.secretKey,
    });
  }
  
  return cachedOmiseClient;
}

/**
 * Clear cached keys and client (call this when keys are updated)
 */
export function clearOmiseCache() {
  cachedKeys = null;
  cachedOmiseClient = null;
  lastKeyCheck = 0;
  console.log("[Omise] Cache cleared");
}

export interface TopupPackage {
  id: string;
  price: number; // in THB
  credits: number;
  discount?: number;
}

export const topupPackages: TopupPackage[] = [
  {
    id: "package_350",
    price: 350,
    credits: 350,
  },
  {
    id: "package_500",
    price: 500,
    credits: 500,
  },
  {
    id: "package_1000",
    price: 1000,
    credits: 1000,
  },
];

export function getPackageById(packageId: string): TopupPackage | null {
  return topupPackages.find((pkg) => pkg.id === packageId) || null;
}

export type PaymentMethod = "credit_card" | "promptpay";

/**
 * Create Omise charge for credit top-up with Credit Card
 */
export async function createCreditCardCharge(
  userId: string,
  packageId: string,
  returnUrl: string,
  token: string // Omise card token from frontend
): Promise<any> {
  const pkg = getPackageById(packageId);
  
  if (!pkg) {
    throw new Error(`Invalid package ID: ${packageId}`);
  }

  try {
    console.log("[Omise] Creating Credit Card charge with token:", token);

    const omise = await getOmiseClient();
    const charge = await omise.charges.create({
      amount: pkg.price * 100, // Convert THB to satang
      currency: "THB",
      card: token, // Use token from frontend
      description: `เติมเครดิต ${pkg.credits} เครดิต (Credit Card)`,
      metadata: {
        userId,
        packageId,
        credits: pkg.credits.toString(),
        paymentMethod: "credit_card",
      },
      return_uri: returnUrl,
    });

    console.log("[Omise] Credit Card charge created:", {
      id: charge.id,
      amount: charge.amount,
      currency: charge.currency,
      status: charge.status,
    });

    return charge;
  } catch (error: any) {
    console.error("[Omise] Failed to create Credit Card charge:", {
      message: error.message,
      code: error.code,
      type: error.type,
    });
    throw new Error(error.message || "Failed to create Credit Card payment");
  }
}

/**
 * Create Omise charge for credit top-up with PromptPay QR
 */
export async function createPromptPayCharge(
  userId: string,
  packageId: string
): Promise<any> {
  // Validate API keys first
  const keys = await getKeys();
  if (!keys.publicKey || !keys.secretKey) {
    throw new Error("ระบบชำระเงินยังไม่พร้อมใช้งาน กรุณาติดต่อผู้ดูแลระบบ");
  }

  const pkg = getPackageById(packageId);
  
  if (!pkg) {
    throw new Error(`Invalid package ID: ${packageId}`);
  }

  try {
    console.log("[Omise] Creating PromptPay charge for package:", packageId);

    try {
      // Step 1: Create a source (PromptPay QR)
      console.log("[Omise] Creating PromptPay source with params:", {
        type: "promptpay",
        amount: pkg.price * 100,
        currency: "THB",
      });

      const omise = await getOmiseClient();
      const source = await omise.sources.create({
        type: "promptpay",
        amount: pkg.price * 100, // Convert THB to satang
        currency: "THB",
      });

      console.log("[Omise] PromptPay source created:", {
        id: source.id,
        type: source.type,
        amount: source.amount,
        flow: source.flow,
      });
      console.log("[Omise] Full source object:", JSON.stringify(source, null, 2));

      // Step 2: Create charge with the source
      const charge = await omise.charges.create({
        amount: pkg.price * 100,
        currency: "THB",
        source: source.id,
        description: `เติมเครดิต ${pkg.credits} เครดิต (PromptPay)`,
        metadata: {
          userId,
          packageId,
          credits: pkg.credits.toString(),
          paymentMethod: "promptpay",
        },
      });

      console.log("[Omise] PromptPay charge created:", {
        id: charge.id,
        amount: charge.amount,
        status: charge.status,
        authorizeUri: charge.authorize_uri,
      });

      // Extract QR code URL from source
      const qrCodeUrl = source.scannable_code?.image?.download_uri;
      
      console.log("[Omise] QR Code URL:", qrCodeUrl);
      console.log("[Omise] Source scannable_code:", JSON.stringify(source.scannable_code, null, 2));

      if (!qrCodeUrl) {
        console.error("[Omise] QR Code URL not found in source response");
        console.error("[Omise] This usually means PromptPay is not activated for this account");
        console.error("[Omise] Source created:", {
          id: source.id,
          type: source.type,
          amount: source.amount,
          scannable_code: source.scannable_code,
        });
        
        throw new Error(
          "ไม่สามารถสร้าง QR Code ได้ เนื่องจาก Omise account ยังไม่ได้เปิดใช้งาน PromptPay \n" +
          "กรุณาติดต่อ Omise Support เพื่อ activate PromptPay feature \n" +
          "หรือใช้วิธีชำระเงินอื่นแทน (บัตรเครดิต)"
        );
      }

      // Return charge with QR code URL
      return {
        ...charge,
        qrCodeUrl,
      };
    } catch (sourceError: any) {
      console.error("[Omise] Failed to create PromptPay source:", sourceError);
      throw sourceError;
    }
  } catch (error: any) {
    console.error("[Omise] Failed to create PromptPay charge:", {
      message: error.message,
      code: error.code,
      type: error.type,
    });
    
    // Provide user-friendly error messages
    if (error.message?.includes("authentication failed")) {
      throw new Error("ระบบชำระเงินยังไม่พร้อมใช้งาน กรุณาติดต่อผู้ดูแลระบบ");
    }
    if (error.message?.includes("not enabled") || error.message?.includes("not supported")) {
      throw new Error("ระบบ PromptPay ยังไม่พร้อมใช้งาน กรุณาลองชำระเงินด้วยบัตรเครดิต");
    }
    
    throw new Error(error.message || "ไม่สามารถสร้างการชำระเงินได้ กรุณาลองใหม่อีกครั้ง");
  }
}

/**
 * Retrieve charge details
 */
export async function getCharge(chargeId: string): Promise<any> {
  try {
    const omise = await getOmiseClient();
    const charge = await omise.charges.retrieve(chargeId);
    console.log("[Omise] Retrieved charge:", {
      id: charge.id,
      status: charge.status,
      paid: charge.paid,
    });
    return charge;
  } catch (error: any) {
    console.error("[Omise] Failed to retrieve charge:", error);
    throw new Error(error.message || "Failed to retrieve charge");
  }
}

/**
 * Verify webhook signature (optional but recommended for production)
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string
): boolean {
  // TODO: Implement webhook signature verification
  // For now, we'll skip this in test mode
  return true;
}

