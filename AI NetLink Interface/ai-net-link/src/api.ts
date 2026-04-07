/**
 * © 2026 SAS NET. All Rights Reserved.
 * Developer: Muhammad Rateb Jabarin
 * Website: aljabareen.com
 * Contact: admin@aljabareen.com | +970597409040
 */
const getDefaultBaseUrl = () => {
  if (typeof window === 'undefined') return 'http://localhost:3001/api';
  const { protocol, hostname } = window.location;
  const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1';
  const isIpAddress = /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname);

  if (isLocalHost || isIpAddress) {
    return `${protocol}//${hostname}:3001/api`;
  }

  return '/api';
};

const ENV_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').trim();
export const BASE_URL = (ENV_BASE_URL || getDefaultBaseUrl()).replace(/\/$/, '');

export const getMessageData = async () => {
  try {
    const res = await fetch(`${BASE_URL}/messages/data`);
    const data = await res.json();
    return data.data;
  } catch (e) { return { templates: [], groups: [] }; }
};

export const saveMessageData = async (data: any) => {
  try {
    const res = await fetch(`${BASE_URL}/messages/data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.ok;
  } catch (e) { return false; }
};

export const getGatewaysConfig = async () => {
  try {
    const res = await fetch(`${BASE_URL}/gateways`);
    const data = await res.json();
    return data.data;
  } catch (e) { return null; }
};

export const saveGatewaysConfig = async (config: any) => {
  try {
    const res = await fetch(`${BASE_URL}/gateways`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });
    return res.ok;
  } catch (e) { return false; }
};

export const getWhatsappStatus = async () => {
  try {
    const res = await fetch(`${BASE_URL}/whatsapp/status`);
    return await res.json();
  } catch (e) { return null; }
};

export const restartWhatsappEngine = async () => {
  try {
    const res = await fetch(`${BASE_URL}/whatsapp/restart`, { method: 'POST' });
    return res.ok;
  } catch (e) { return false; }
};

export const fetchManagers = async () => {
  try {
    const res = await fetch(`${BASE_URL}/managers`);
    if (!res.ok) throw new Error('Failed to fetch managers');
    const data = await res.json();
    return data.data; // array of users based on our backend mapping
  } catch (error) {
    console.error(error);
    return [];
  }
};

export const fetchSubscribers = async () => {
  try {
    const res = await fetch(`${BASE_URL}/subscribers`);
    if (!res.ok) throw new Error('Failed to fetch subscribers');
    const data = await res.json();
    return data.data; // returns array from sas4_subscribers.json
  } catch (error) {
    console.error(error);
    return [];
  }
};

export const addSubscriber = async (data: any) => {
  try {
    const res = await fetch(`${BASE_URL}/subscribers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create subscriber');
    return await res.json();
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const updateSubscriber = async (id: string, data: any) => {
  try {
    const res = await fetch(`${BASE_URL}/subscribers/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update subscriber');
    return await res.json();
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const extendSubscriber = async (id: string, duration: { unit: 'hours' | 'days', value: number }, target: string = 'all') => {
  try {
    const res = await fetch(`${BASE_URL}/subscribers/${encodeURIComponent(id)}/extend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ duration, target }),
    });
    if (!res.ok) throw new Error('Failed to extend subscriber');
    return await res.json();
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const deleteSubscriber = async (id: string) => {
  try {
    const res = await fetch(`${BASE_URL}/subscribers/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete subscriber');
    return await res.json();
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const fetchSuppliers = async () => {
  try {
    const res = await fetch(`${BASE_URL}/suppliers`);
    if (!res.ok) throw new Error('Failed to fetch suppliers');
    const data = await res.json();
    return data.data;
  } catch (error) {
    console.error(error);
    return [];
  }
};

export const addSupplier = async (data: any) => {
  try {
    const res = await fetch(`${BASE_URL}/suppliers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create supplier');
    return await res.json();
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const updateSupplier = async (id: string, data: any) => {
  try {
    const res = await fetch(`${BASE_URL}/suppliers/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update supplier');
    return await res.json();
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const deleteSupplier = async (id: string) => {
  try {
    const res = await fetch(`${BASE_URL}/suppliers/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete supplier');
    return await res.json();
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const fetchInvestors = async () => {
  try {
    const res = await fetch(`${BASE_URL}/investors`);
    if (!res.ok) throw new Error('Failed to fetch investors');
    const data = await res.json();
    return data.data; // returns shareholders wrapper
  } catch (error) {
    console.error(error);
    return null;
  }
};

export const fetchManagersRaw = async () => {
  try {
    const res = await fetch(`${BASE_URL}/managers/raw`);
    if (!res.ok) throw new Error('Failed to fetch managers');
    const data = await res.json();
    return data.data;
  } catch (error) {
    console.error(error);
    return [];
  }
};

export const addInvestor = async (data: any) => {
  try {
    const res = await fetch(`${BASE_URL}/investors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create investor');
    return await res.json();
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const updateInvestor = async (id: string, data: any) => {
  try {
    const res = await fetch(`${BASE_URL}/investors/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update investor');
    return await res.json();
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const deleteInvestor = async (id: string) => {
  try {
    const res = await fetch(`${BASE_URL}/investors/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete investor');
    return await res.json();
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const addManager = async (data: any) => {
  try {
    const res = await fetch(`${BASE_URL}/managers/raw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create manager');
    return await res.json();
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const updateManager = async (id: string, data: any) => {
  try {
    const res = await fetch(`${BASE_URL}/managers/raw/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update manager');
    return await res.json();
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const deleteManager = async (id: string) => {
  try {
    const res = await fetch(`${BASE_URL}/managers/raw/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete manager');
    return await res.json();
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const topUpManager = async (id: string, amount: number) => {
  try {
    const res = await fetch(`${BASE_URL}/managers/${encodeURIComponent(id)}/topup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount }),
    });
    if (!res.ok) throw new Error('Failed to top up manager');
    return await res.json();
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const updateManagerTxLimit = async (id: string, limit: number, enabled: boolean) => {
  try {
    const res = await fetch(`${BASE_URL}/managers/${encodeURIComponent(id)}/limit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ limit, enabled }),
    });
    if (!res.ok) throw new Error('Failed to update manager tx limit');
    return await res.json();
  } catch (error) {
    console.error(error);
    throw error;
  }
};

// Generic CRUD factory for simple endpoints
const createCrudEndpoints = (resourceName: string) => {
  return {
    fetch: async () => {
      try {
        const res = await fetch(`${BASE_URL}/${resourceName}`);
        if (!res.ok) throw new Error(`Failed to fetch ${resourceName}`);
        const data = await res.json();
        return data.data;
      } catch (error) {
        console.error(error);
        return [];
      }
    },
    add: async (data: any) => {
      try {
        const res = await fetch(`${BASE_URL}/${resourceName}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error(`Failed to create ${resourceName}`);
        return await res.json();
      } catch (error) {
        console.error(error);
        throw error;
      }
    },
    update: async (id: string, data: any) => {
      try {
        const res = await fetch(`${BASE_URL}/${resourceName}/${encodeURIComponent(id)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error(`Failed to update ${resourceName}`);
        return await res.json();
      } catch (error) {
        console.error(error);
        throw error;
      }
    },
    remove: async (id: string) => {
      try {
        const res = await fetch(`${BASE_URL}/${resourceName}/${encodeURIComponent(id)}`, {
          method: 'DELETE',
        });
        if (!res.ok) throw new Error(`Failed to delete ${resourceName}`);
        return await res.json();
      } catch (error) {
        console.error(error);
        throw error;
      }
    }
  };
};

export const directorsApi = createCrudEndpoints('directors');
export const deputiesApi = createCrudEndpoints('deputies');
export const iptvApi = createCrudEndpoints('iptv');

export const getNetworkConfig = async () => {
    try {
        const res = await fetch(`${BASE_URL}/network/config`);
        const data = await res.json();
        return data.data;
    } catch (e) { return null; }
};

export const saveNetworkConfig = async (config: any) => {
    try {
        const res = await fetch(`${BASE_URL}/network/config`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });
        return res.ok;
    } catch (e) { return false; }
};

export const testMikrotikConnection = async (host?: string, user?: string, password?: string, port?: number) => {
    try {
        const bodyData = host ? JSON.stringify({ host, user, password, port }) : undefined;
        const res = await fetch(`${BASE_URL}/network/test-connection`, { 
            method: 'POST',
            headers: bodyData ? { 'Content-Type': 'application/json' } : undefined,
            body: bodyData 
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Connection test failed');
        }
        return await res.json();
    } catch (e: any) { 
        throw e;
    }
};

export const getMikrotikStatus = async (username: string) => {
    try {
        const res = await fetch(`${BASE_URL}/network/status/${encodeURIComponent(username)}`);
        if (!res.ok) return null;
        const data = await res.json();
        return data.data;
    } catch (e) { return null; }
};

export const getMikrotikStatusBatch = async () => {
    try {
        const res = await fetch(`${BASE_URL}/network/status-batch`);
        if (!res.ok) return { onlineUsers: [] };
        const data = await res.json();
        return data.data;
    } catch (e) { return { onlineUsers: [] }; }
};
export const disconnectSubscriber = async (username: string) => {
    try {
        const res = await fetch(`${BASE_URL}/network/disconnect/${encodeURIComponent(username)}`, {
            method: 'POST'
        });
        if (!res.ok) return { message: 'Failed to disconnect' };
        return await res.json();
    } catch (e) { return { message: 'Network error during disconnect' }; }
};

export const disconnectAllSubscribers = async () => {
    try {
        const res = await fetch(`${BASE_URL}/network/disconnect-all`, {
            method: 'POST'
        });
        if (!res.ok) return { message: 'Failed to disconnect all' };
        return await res.json();
    } catch (e) { return { message: 'Network error during bulk disconnect' }; }
};

// Secret Management
export const deleteSecret = async (username: string) => {
    const res = await fetch(`${BASE_URL}/network/secrets/delete/${encodeURIComponent(username)}`, { method: 'POST' });
    return await res.json();
};

export const disableSecret = async (username: string) => {
    const res = await fetch(`${BASE_URL}/network/secrets/disable/${encodeURIComponent(username)}`, { method: 'POST' });
    return await res.json();
};

export const enableSecret = async (username: string) => {
    const res = await fetch(`${BASE_URL}/network/secrets/enable/${encodeURIComponent(username)}`, { method: 'POST' });
    return await res.json();
};

export const fetchProfiles = async () => {
    try {
        const res = await fetch(`${BASE_URL}/network/profiles`);
        return await res.json();
    } catch (e) { return []; }
};

export const addProfile = async (profile: any) => {
    const res = await fetch(`${BASE_URL}/network/profiles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
    });
    if (!res.ok) throw new Error('Failed to add profile');
    return await res.json();
};

export const updateProfile = async (id: string, profile: any) => {
    const res = await fetch(`${BASE_URL}/network/profiles/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
    });
    if (!res.ok) throw new Error('Failed to update profile');
    return await res.json();
};

export const deleteProfile = async (id: string) => {
    const res = await fetch(`${BASE_URL}/network/profiles/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete profile');
    return await res.json();
};

export const pushProfile = async (id: string, target: string = 'all') => {
    const res = await fetch(`${BASE_URL}/network/profiles/${id}/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target })
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to push profile to MikroTik');
    }
    return await res.json();
};

export const syncSubscriberToMikrotik = async (subscriberId: string, target: string = 'all') => {
    const res = await fetch(`${BASE_URL}/subscribers/${subscriberId}/sync-mikrotik`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target })
    });

    // Always parse the JSON body (both success and error)
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
        // Attach the details array to the error so the UI can show per-router errors
        const err: any = new Error(data.error || 'Failed to sync subscriber to MikroTik');
        err.details = data.details || [];
        throw err;
    }

    return data;
};

export const activateSubscriber = async (id: string, startDateOption: 'today' | 'first_of_month', target: string = 'all') => {
    const res = await fetch(`${BASE_URL}/subscribers/${encodeURIComponent(id)}/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDateOption, target })
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to activate subscriber');
    }
    return await res.json();
};


export const fetchRoutersList = async () => {
    try {
        const res = await fetch(`${BASE_URL}/network/routers`);
        if (!res.ok) throw new Error('Failed to fetch routers');
        return await res.json();
    } catch (error) {
        console.error(error);
        return [];
    }
};

// System Update & Sync
export const checkSystemUpdate = async () => {
    const res = await fetch(`${BASE_URL}/system/check-update`);
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to check for updates');
    }
    return await res.json();
};

export const startSystemUpdate = async () => {
    const res = await fetch(`${BASE_URL}/system/update`, { method: 'POST' });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to start update');
    }
    return await res.json();
};

export const testAiProvider = async (payload: any) => {
    const res = await fetch(`${BASE_URL}/ai/test-provider`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(data.error || 'Failed to test AI provider');
    }
    return data.data;
};

export const executiveChat = async (payload: any) => {
    const res = await fetch(`${BASE_URL}/ai/executive-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(data.error || 'Failed to query Executive AI');
    }
    return data.data;
};
