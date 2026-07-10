export async function ping() {
    const controller = new AbortController();
    const { signal } = controller;

    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
        const response = await fetch(import.meta.env.VITE_WATCHTOWER_URL, { 
        method: 'HEAD',
        signal
        });
        
        return response.ok;

    } catch (error) {
        if ((error as any).name === 'AbortError') {
        console.error('❌ Ping request timed out after 3 seconds');
        } else {
        console.error('❌ Ping failed due to a network error:', (error as any).message);
        }
        return false
    } finally {
        clearTimeout(timeoutId);
    }
}

export async function broadcastTransaction(transactionHex: string) {

    const response = await fetch(`${import.meta.env.VITE_WATCHTOWER_URL}/api/broadcast/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transaction: transactionHex }),
    });
  
    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
    }
  
    return response.json();
  }
  
  