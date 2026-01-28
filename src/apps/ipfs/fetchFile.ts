/**
 * Fetch file from ipfs using the paytaca gateway
 * @param cid - The cid of the file
 * @param filePath - The path of the file
 * @returns Fetch response
 */
export const fetchFile = async (
  cid: string,
  filePath?: string
): Promise<any> => {
  try {
    return await fetch(`api/ipfs/${cid}?filePath=${filePath}`);
  } catch (error: any) {
    throw new Error(error?.message || error.toString());
  }
};
