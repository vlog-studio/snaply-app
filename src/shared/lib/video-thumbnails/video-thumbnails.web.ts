// Videos never persist on web (the file adapter lists none), so there is
// nothing to derive a thumbnail from.
export async function getVideoThumbnail(_uri: string): Promise<string | undefined> {
  return undefined;
}

export function deleteVideoThumbnail(_uri: string): void {}
