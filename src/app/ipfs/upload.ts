import querify from '../utils/querify';
import { IpfsUploadArtifact } from './types';

/**
 * Stores this registry to the ipfs server.
 */
export const upload = async (
  file: File,
  query?: object
): Promise<IpfsUploadArtifact | undefined> => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    let path = 'api/ipfs';
    if (query) {
      path += `?${querify(query)}`;
    }
    const resp = await fetch(path, {
      method: 'POST',
      body: formData,
    });
    if (resp.status >= 400) {
      throw new Error('Error, uploading to IPFS, please try again later.');
    }
    return await resp.json();
  } catch (error: any) {
    console.log(error);
    throw new Error(error?.message || error.toString());
  }
};
