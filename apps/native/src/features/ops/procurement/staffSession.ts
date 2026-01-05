import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'procurement_staff_session_v1';

export type ProcurementStaffSession = {
  staff: {
    id: string;
    full_name: string;
    role: string;
    workspace_id: string;
    permissions: Record<string, boolean>;
  };
  workspace: { id: string; name: string };
  createdAt: string;
};

export async function getProcurementStaffSession(): Promise<ProcurementStaffSession | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ProcurementStaffSession;
  } catch {
    return null;
  }
}

export async function setProcurementStaffSession(s: ProcurementStaffSession): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(s));
}

export async function clearProcurementStaffSession(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}

