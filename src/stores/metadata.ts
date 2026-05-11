import { type IdentitySnapshot } from 'src/core/bcmr/bcmr-v2.schema';
import { defineStore } from 'pinia'
import { db } from 'src/core/client-db';

type TokenId = string;

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
      const record = await db.identitySnapshot.where('category').equals(category).first()
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
          const existing = await db.identitySnapshot.where('category').equals(category).first()
          if (existing) {
            await db.identitySnapshot.update(existing.id, { identitySnapshot: JSON.parse(JSON.stringify((this.identitySnapshot![category]))) })
          } else {
            await db.identitySnapshot.add({
              authbase: category,
              category: category,
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
    }
  }
});


