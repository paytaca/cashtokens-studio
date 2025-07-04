import { IconStorageArtifact } from './types';

/**
 * Stores this registry to the ipfs server.
 */
export const uploadIcon = async (
  iconFile: File,
  tokenId: string
): Promise<IconStorageArtifact | undefined> => {
  try {
    const formData = new FormData();
    formData.append('icon', iconFile);
    const resp = await fetch(`api/tokens/icon/upload?tokenId=${tokenId}`, {
      method: 'POST',
      body: formData,
    });
    if (resp.status >= 400) {
      throw new Error(
        'Error, storing registry in IPFS, please try again later.'
      );
    }
    return await resp.json();
  } catch (error: any) {
    console.log(error);
    throw new Error(error?.message || error.toString());
  }
};
