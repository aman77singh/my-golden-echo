import { apiFetch, API_BASE_URL, getStoredToken } from "./api";

/**
 * Compresses an image file on the client using HTML5 Canvas.
 * Resizes down if larger than maxDimension, exports to WebP or JPEG.
 */
export async function compressImage(
  file: File,
  maxDimension = 1280,
  quality = 0.8
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      if (!e.target?.result) return reject(new Error("Failed to read image file"));
      img.src = e.target.result as string;
    };

    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Failed to get canvas 2D context"));

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Image compression failed"));
          }
        },
        "image/jpeg",
        quality
      );
    };

    img.onerror = (err) => reject(err);
    reader.onerror = (err) => reject(err);

    reader.readAsDataURL(file);
  });
}

/**
 * Uploads compressed image directly to Cloudinary using signed params
 * with automatic fallback to data URI if Cloudinary credentials are demo.
 */
export async function uploadImage(imageBlob: Blob): Promise<string> {
  try {
    const signData = await apiFetch<{
      signature: string;
      timestamp: number;
      apiKey: string;
      cloudName: string;
      folder: string;
    }>("/media/sign", {
      method: "POST",
    });

    // If real Cloudinary cloud name
    if (signData.cloudName && signData.cloudName !== "demo") {
      const formData = new FormData();
      formData.append("file", imageBlob);
      formData.append("api_key", signData.apiKey);
      formData.append("timestamp", String(signData.timestamp));
      formData.append("signature", signData.signature);
      formData.append("folder", signData.folder);

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${signData.cloudName}/image/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (res.ok) {
        const json = await res.json();
        if (json.secure_url) {
          return json.secure_url;
        }
      }
    }
  } catch (err) {
    console.warn("Direct Cloudinary upload skipped, falling back to local data URL:", err);
  }

  // Fallback: Convert to Data URL
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(imageBlob);
  });
}

/**
 * Uploads recorded voice note blob to server
 */
export async function uploadVoiceNote(voiceBlob: Blob): Promise<string> {
  try {
    const formData = new FormData();
    formData.append("voice", voiceBlob, "voice-memo.webm");

    const token = getStoredToken();
    const headers = new Headers();
    if (token) headers.set("Authorization", `Bearer ${token}`);

    const res = await fetch(`${API_BASE_URL}/media/voice`, {
      method: "POST",
      headers,
      body: formData,
      credentials: "include",
    });

    if (res.ok) {
      const data = await res.json();
      if (data.url) return data.url;
    }
  } catch (err) {
    console.warn("Server voice upload failed, falling back to data URL:", err);
  }

  // Fallback: Local Data URL
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(voiceBlob);
  });
}
