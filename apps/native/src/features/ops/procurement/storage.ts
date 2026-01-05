import * as DocumentPicker from 'expo-document-picker';
import { supabase } from '../../../lib/supabase';

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

function contentTypeFromExt(ext: string | null) {
  switch (ext) {
    case 'pdf':
      return 'application/pdf';
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'heic':
      return 'image/heic';
    default:
      return 'application/octet-stream';
  }
}

export async function pickAndUploadProcurementDocument({
  userId,
}: {
  userId: string;
}): Promise<{ path: string; name: string; mimeType: string } | null> {
  const res = await DocumentPicker.getDocumentAsync({
    copyToCacheDirectory: false,
    multiple: false,
    type: ['application/pdf', 'image/*'],
  });

  if (res.canceled) return null;
  const file = res.assets?.[0];
  if (!file) return null;

  const ext = extFromName(file.name) ?? 'bin';
  const contentType = file.mimeType ?? contentTypeFromExt(ext);
  const path = `${userId}/${Date.now()}-${rand()}.${ext}`;

  const blob = await fetch(file.uri).then((r) => r.blob());
  const up = await supabase.storage.from('purchase-orders').upload(path, blob, { contentType, upsert: false });
  if (up.error) throw up.error;

  return { path, name: file.name ?? path, mimeType: contentType };
}

export async function createSignedProcurementDocUrl(path: string, expiresInSeconds = 60 * 30) {
  const res = await supabase.storage.from('purchase-orders').createSignedUrl(path, expiresInSeconds);
  if (res.error) throw res.error;
  return res.data.signedUrl;
}

