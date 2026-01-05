import * as ImagePicker from 'expo-image-picker';
import { supabase } from './supabase';

function rand() {
  return Math.random().toString(36).slice(2, 10);
}

function extFromName(name?: string | null) {
  if (!name) return null;
  const parts = name.split('.');
  if (parts.length < 2) return null;
  const ext = parts.pop();
  return ext ? ext.toLowerCase() : null;
}

function extFallback(asset: ImagePicker.ImagePickerAsset) {
  const fromName = extFromName(asset.fileName);
  if (fromName) return fromName;
  if (asset.type === 'video') return 'mp4';
  return 'jpg';
}

export async function uploadAssetToBucket({
  bucket,
  userId,
  asset,
}: {
  bucket: string;
  userId: string;
  asset: ImagePicker.ImagePickerAsset;
}) {
  const ext = extFallback(asset);
  const path = `${userId}/${Date.now()}-${rand()}.${ext}`;
  const contentType = asset.mimeType ?? (asset.type === 'video' ? 'video/mp4' : 'image/jpeg');

  const blob = await fetch(asset.uri).then((r) => r.blob());
  const { error } = await supabase.storage.from(bucket).upload(path, blob, {
    contentType,
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { publicUrl: data.publicUrl, path };
}

