
export async function broadcast(trahsactionHex: string): Promise<any> {
    return await fetch(`${import.meta.env.VITE_WATCHTOWER_URL}/api/broadcast/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transaction: trahsactionHex,
        }),
      });
  }