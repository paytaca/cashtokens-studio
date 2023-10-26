/**
 * Local client-only database
 */
export default class ClientDB {
  readonly CTS_TRANSACTIONS_STORE = "transactions"
  version: number
  private _transactionsStore: any
  private _db?: IDBDatabase|undefined
  private _connection: any
  private static _instance: ClientDB

  private constructor(version?:number) {
     this.version = version || 1
  }
  
  get connection():any {
    return this._connection
  }

  
  init() {
    this._connection = indexedDB.open("cts", this.version)
    this._connection.onsuccess = (event:any) => {
      this._db = event.target.result
    }
    this._connection.onupgradeneeded = (event:any) => {
      this._db = event.target.result
      this._transactionsStore = this._db?.createObjectStore(this.CTS_TRANSACTIONS_STORE, { keyPath: "txid" , autoIncrement:true});
      this._transactionsStore.createIndex('timestamp', 'timestamp', {unique: false})
    }
  }

  static getInstance(version?:number) {
    if (!ClientDB._instance) {
      ClientDB._instance = new ClientDB(version)
    }
    return ClientDB._instance
  }

  get db():IDBDatabase|undefined {
    return this._db
  }

  get transactionsStore() {
     const transaction = this._db?.transaction([this.CTS_TRANSACTIONS_STORE], 'readwrite')
     return transaction?.objectStore(this.CTS_TRANSACTIONS_STORE)
  }

  /**
   * Log a CashToken Transaction
   */
  newCtsTransaction(txn: object) {
    if (!this.transactionsStore) throw new Error('Transaction store does not exist')
    this.transactionsStore?.add(txn)
  }

  /**
   * Retrieve CashToken Transactions
   */
  async getCtsTransactions(): Promise<any> {
    const ts = this.transactionsStore
    return await new Promise((res, rej) => { 
      const index = ts?.index('timestamp')
      const openCursor = index?.openCursor(null, 'prev')
      const txns:any = []
      if (openCursor) {
        openCursor!.onsuccess = (event:any) => {
          const cursor = event.target.result;
          if (cursor) {
            // Push the object to the array.
            txns.push(cursor.value);
            // Move to the next object.
            cursor.continue();
          } else {
            // The cursor has reached the end of the object store.
            console.log('Retrieved objects:', txns);
            res(txns)
          }
  
        };
        openCursor!.onerror = (event:any) => {
          rej(event.target?.error)
        }
      }
    })
    






  }

  async clearCtsTransactions():Promise<boolean> {
    const db = this._db
    const dbTransaction = db?.transaction([this.CTS_TRANSACTIONS_STORE], 'readwrite')
    const ctsTransactionsStore = dbTransaction?.objectStore(this.CTS_TRANSACTIONS_STORE)
    return await new Promise((res, rej) => { 
      const clearRequest = ctsTransactionsStore?.clear()
      clearRequest!.onsuccess = () => {
        res(true)
      }
      clearRequest!.onerror = () => {
        res(false)
      }
      dbTransaction!.oncomplete = () => {
        db?.close()
      }
    })
  }


}