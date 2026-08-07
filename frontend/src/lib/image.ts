export interface CompressedImage {
  dataUrl: string;
  mimeType: string;
}

const MAX_DIMENSION = 1280;
const JPEG_QUALITY = 0.8;

export class ImageCompressor {
  async compress(file: File): Promise<CompressedImage> {
    const dataUrl = await ImageCompressor.toDataUrl(file);

    const img = await ImageCompressor.loadImage(dataUrl);

    const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
    const width = Math.round(img.width * scale);
    const height = Math.round(img.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas tidak tersedia.");
    ctx.drawImage(img, 0, 0, width, height);

    const output = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
    return { dataUrl: output, mimeType: "image/jpeg" };
  }

  private static toDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Gagal membaca file gambar."));
      reader.readAsDataURL(file);
    });
  }

  private static loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("File bukan gambar yang valid."));
      img.src = src;
    });
  }
}

export const imageCompressor = new ImageCompressor();