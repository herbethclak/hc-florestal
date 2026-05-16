const API_BASE = '/api';

export const api = {
  async get(table: string) {
    const res = await fetch(`${API_BASE}/${table}`);
    if (!res.ok) throw new Error(`Failed to fetch ${table}`);
    return res.json();
  },

  async post(table: string, data: any) {
    const res = await fetch(`${API_BASE}/${table}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`Failed to save to ${table}`);
    return res.json();
  },

  async postBulk(table: string, data: any[]) {
    const res = await fetch(`${API_BASE}/${table}/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`Failed to save bulk to ${table}`);
    return res.json();
  },

  async delete(table: string, id: string) {
    const res = await fetch(`${API_BASE}/${table}/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error(`Failed to delete from ${table}`);
    return res.json();
  },

  async getSetting(key: string) {
    const res = await fetch(`${API_BASE}/settings/${key}`);
    if (!res.ok) throw new Error(`Failed to fetch setting ${key}`);
    const data = await res.json();
    return data.value;
  },

  async postSetting(key: string, value: any) {
    const res = await fetch(`${API_BASE}/settings/${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value }),
    });
    if (!res.ok) throw new Error(`Failed to save setting ${key}`);
    return res.json();
  }
};
