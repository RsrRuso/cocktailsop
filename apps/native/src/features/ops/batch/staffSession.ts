import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'batch_calculator_staff_session';

export type BatchStaffSession = {
  member: {
    id: string;
    user_id: string;
    role: string;
    group_id: string;
  };
  group: { id: string; name: string };
  name: string;
  pin: string;
  createdAt: string;
};

export async function getBatchStaffSession(): Promise<BatchStaffSession | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as BatchStaffSession;
  } catch {
    return null;
  }
}

export async function setBatchStaffSession(session: BatchStaffSession) {
  await AsyncStorage.setItem(KEY, JSON.stringify(session));
}

export async function clearBatchStaffSession() {
  await AsyncStorage.removeItem(KEY);
}

