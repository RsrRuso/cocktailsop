import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'fifo_staff_session_v1';

export type FifoStaffSession = {
  member: {
    id: string;
    user_id: string;
    role: string;
    workspace_id: string;
  };
  workspace: {
    id: string;
    name: string;
  };
  name: string;
  createdAt: string;
};

export async function getFifoStaffSession(): Promise<FifoStaffSession | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as FifoStaffSession;
  } catch {
    return null;
  }
}

export async function setFifoStaffSession(session: FifoStaffSession): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(session));
}

export async function clearFifoStaffSession(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}

