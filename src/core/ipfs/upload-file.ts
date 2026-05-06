import { UploadResponse } from "pinata";

export async function uploadFile(file: File|Blob, filename: string): Promise<UploadResponse> {
    try {
        const formData = new FormData();
        formData.append('file', file, filename);
        
        const resp = await fetch('/api/ipfs', {
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
}