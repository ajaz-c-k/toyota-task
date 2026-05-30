const encoder = new TextEncoder();

function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  let binary = "";
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const base64Standard = base64
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    + "===".slice(0, (4 - (base64.length % 4)) % 4);
  const binaryString = atob(base64Standard);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function signJWT(payload: any, secret: string): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const headerStr = arrayBufferToBase64(encoder.encode(JSON.stringify(header)));
  const payloadStr = arrayBufferToBase64(encoder.encode(JSON.stringify(payload)));
  
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`${headerStr}.${payloadStr}`)
  );
  
  const signatureStr = arrayBufferToBase64(signatureBuffer);
  return `${headerStr}.${payloadStr}.${signatureStr}`;
}

export async function verifyJWT(token: string, secret: string): Promise<any | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [headerStr, payloadStr, signatureStr] = parts;
    
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    
    const verified = await crypto.subtle.verify(
      "HMAC",
      key,
      base64ToArrayBuffer(signatureStr),
      encoder.encode(`${headerStr}.${payloadStr}`)
    );
    
    if (!verified) return null;
    
    const payloadJson = atob(payloadStr.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(payloadJson);
  } catch (error) {
    return null;
  }
}

export async function checkAdmin() {
  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) return null;
    const payload = await verifyJWT(token, process.env.JWT_SECRET || "super-secret-toyota-incentive-calculator-key-2026");
    if (!payload || payload.role !== "admin") return null;
    return payload;
  } catch (e) {
    return null;
  }
}

export async function checkSales() {
  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) return null;
    const payload = await verifyJWT(token, process.env.JWT_SECRET || "super-secret-toyota-incentive-calculator-key-2026");
    if (!payload || payload.role !== "sales") return null;
    return payload;
  } catch (e) {
    return null;
  }
}

