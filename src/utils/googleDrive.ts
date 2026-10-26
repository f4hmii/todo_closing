const GAS_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbxbybClGo6asoEv6kYFsu9xS1LFrSNV6Jc8Q1-q29-y2ejJKPknrYh31UIz9jwNTzoJ5w/exec";
const SECRET_KEY = "RAHASIA_CLOSING_FNB_2026";

export function compressImage(file: File, picName: string, timestamp: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Foto tidak dapat dibaca."));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("Format foto tidak valid."));
      image.onload = () => {
        const scale = Math.min(1, 1000 / image.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale);
        const context = canvas.getContext("2d");
        if (!context) return reject(new Error("Canvas tidak tersedia."));
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        context.fillStyle = "rgba(255,255,255,.9)"; context.font = "16px sans-serif"; context.textAlign = "right";
        context.fillText(`${timestamp} WIB · ${picName}`, canvas.width - 16, canvas.height - 16);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export async function uploadPhoto(base64: string, fileName: string): Promise<{ imageUrl: string; viewUrl: string }> {
  const response = await fetch(GAS_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ secretKey: SECRET_KEY, base64, mimeType: "image/jpeg", fileName })
  });
  if (!response.ok) throw new Error(`Upload gagal (${response.status}).`);
  const result = await response.json() as { status: string; imageUrl?: string; viewUrl?: string };
  if (result.status !== "success" || !result.imageUrl || !result.viewUrl) throw new Error("Respons webhook tidak valid.");
  return { imageUrl: result.imageUrl, viewUrl: result.viewUrl };
}
