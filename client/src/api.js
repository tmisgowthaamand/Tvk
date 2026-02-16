// Ensure API_BASE is clean and has the /api prefix correctly
let base = import.meta.env.VITE_API_URL || '';
if (base.endsWith('/')) base = base.slice(0, -1);
const API_BASE = base.includes('/api') ? base : `${base}/api`;

export async function apiGet(path, params = {}) {
    const url = new URL(`${API_BASE}${path}`);
    Object.entries(params).forEach(([k, v]) => {
        if (v !== '' && v !== undefined && v !== null) url.searchParams.set(k, v);
    });

    const res = await fetch(url);
    const contentType = res.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
        return res.json();
    } else {
        const text = await res.text();
        console.error("Non-JSON response received:", text.substring(0, 100));
        return { success: false, error: "Server returned non-JSON response. Check API URL." };
    }
}

export async function apiPost(path, body = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    const contentType = res.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
        return res.json();
    } else {
        return { success: false, error: "Server returned non-JSON response." };
    }
}

export async function apiPatch(path, body = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    const contentType = res.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
        return res.json();
    } else {
        return { success: false, error: "Server returned non-JSON response." };
    }
}

export function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function truncate(str, len = 40) {
    if (!str) return '—';
    return str.length > len ? str.substring(0, len) + '…' : str;
}
