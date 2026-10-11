import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import type { Id } from "@convex/_generated/dataModel";
import { notify } from "./confirm";

export type Picked = { uri: string; width: number; height: number; mime: string; name: string };

/** Camera or photo library. Empty when cancelled or permission was refused. */
export async function pickImages(from: "camera" | "library", multiple = false): Promise<Picked[]> {
  if (from === "camera") {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      notify("Camera is off for Trans Am", "Turn it on in Settings to shoot photos from the app.");
      return [];
    }
  }
  const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 1, allowsMultipleSelection: multiple, selectionLimit: multiple ? 20 : 1 };
  const res = from === "camera" ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
  if (res.canceled) return [];
  return res.assets.map((a) => ({ uri: a.uri, width: a.width, height: a.height, mime: a.mimeType ?? "image/jpeg", name: a.fileName ?? "photo.jpg" }));
}

/** A PDF or image from Files. */
export async function pickDocument(): Promise<Picked | null> {
  const res = await DocumentPicker.getDocumentAsync({ type: ["application/pdf", "image/*"], copyToCacheDirectory: true });
  if (res.canceled || !res.assets[0]) return null;
  const a = res.assets[0];
  return { uri: a.uri, width: 0, height: 0, mime: a.mimeType ?? "application/pdf", name: a.name };
}

/**
 * Re-encode as JPEG, longest side at most `maxSide`. Same limits as the website:
 * build-log photos 1600px at .85, receipts 2200px at .88 so the small print stays legible.
 */
export async function shrink(p: Picked, maxSide: number, quality: number): Promise<Picked> {
  const ctx = ImageManipulator.manipulate(p.uri);
  if (Math.max(p.width, p.height) > maxSide) ctx.resize(p.width >= p.height ? { width: maxSide } : { height: maxSide });
  const img = await ctx.renderAsync();
  const out = await img.saveAsync({ format: SaveFormat.JPEG, compress: quality });
  return { uri: out.uri, width: out.width, height: out.height, mime: "image/jpeg", name: p.name.replace(/\.\w+$/, "") + ".jpg" };
}

/** POST the file to a Convex upload URL and return its storage id. */
export async function upload(uploadUrl: string, p: Picked): Promise<Id<"_storage">> {
  const blob = await (await fetch(p.uri)).blob();
  const res = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": p.mime }, body: blob });
  if (!res.ok) throw new Error(`Upload failed (${res.status})`);
  const { storageId } = await res.json();
  return storageId;
}
