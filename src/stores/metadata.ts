import { Registry, type IdentitySnapshot } from 'src/core/bcmr/bcmr-v2.schema';
import { defineStore } from 'pinia'
import { db } from 'src/core/client-db';
import { WorkerResponse } from 'src/workers/registry-worker';
import { retrieveLastRegistryPublication } from 'src/core/chaingraph';

type TokenId = string;

let registryWorker: Worker | undefined

export const useMetadataStore = defineStore('metadataStore', {
  state: (): {
    identitySnapshot?: Record<TokenId, IdentitySnapshot>
  } => ({}),
  actions: {
    async fetchIdentitySnapshot(category: string) {
      const response = await fetch(`${import.meta.env.VITE_BCMR_INDEXER_URL}/api/tokens/${category}`);
      if (!response.ok) throw new Error('Network response was not ok');
      return await response.json();
    },

    async loadIdentitySnapshot(category: string, forceFetch = false): Promise<IdentitySnapshot | undefined> {
      console.log('LOADING IDENTITY SNAPSHOT')
      const record = await db.registryIdentitySnapshot.where('category').equals(category).first()
      if (record?.identitySnapshot) {
        if (!this.identitySnapshot) {
          this.identitySnapshot = {}
        }
        this.identitySnapshot[category] = structuredClone(record.identitySnapshot)
      }

      const networkFetch = async () => {
        try {
          const identitySnapshot = await this.fetchIdentitySnapshot(category)
          if (!this.identitySnapshot) {
            this.identitySnapshot = {}
          }
          this.identitySnapshot[category] = structuredClone(identitySnapshot)
          return identitySnapshot
        } finally {
          if (!this.identitySnapshot?.[category]) return
          const existing = await db.registryIdentitySnapshot.where('authbase').equals(category).first()
          if (existing) {
            await db.registryIdentitySnapshot.update(existing.id, { identitySnapshot: JSON.parse(JSON.stringify((this.identitySnapshot![category]))) })
          } else {
            await db.registryIdentitySnapshot.add({
              authbase: category,
              timestamp: '',
              contentHash: '',
              category: category,
              status: 'published',
              identitySnapshot: JSON.parse(JSON.stringify((this.identitySnapshot![category])))
            })
          }
        }
      }

      if (forceFetch) {
        return await networkFetch()
      } else {
        networkFetch()
        return this.identitySnapshot?.[category]
      }
    },

    async loadRegistry(authbase: string) {
      console.log('AUTHBASEz', authbase)
      if (authbase === 'f9a89eaed8338067a2e881a205ff50de595755670e7c1f731d227071a50dc338') return
      // console.log('AUTHBASE', authbase)
      
      // const pub = await retrieveLastRegistryPublication({ authbase })
      // const uris: string[] = pub[0]?.uris || []
      // if (!uris.length) return
      console.log('Hello', authbase)

      if (!registryWorker) {
        registryWorker = new Worker(
            new URL('src/workers/registry-worker.ts', import.meta.url),
            { type: 'module' }
        )

        registryWorker.onmessage = async (event: MessageEvent<WorkerResponse>) => {
          console.log('Message received from worker', event)
            // const msg = event.data
            // if (msg.type === 'error') {
            //     reject(new Error(msg.message))
            //     return
            // }

            // if (msg.type === 'complete') {
            //     const record = await db.registry
            //         .where('contentHash')
            //         .equals(msg.contentHash)
            //         .first()

            //     if (record) {
            //         resolve(record.registry)
            //     }
            //     resolve()
            // }
        }

        // registryWorker.onerror = () => reject(new Error('Worker error'))
        registryWorker.onerror = () => console.log('Error Received From Worker')

      }
      

      registryWorker.postMessage({ type: 'downloadRegistry', authbase })
    }
  }
});


