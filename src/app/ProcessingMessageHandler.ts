/**
 * This is just a class which we could pass around async methods so 
 * we can get the status of the method.
 */
export class ProcessingMessageHandler{
  private _processing?: string
  
  get processing():string|undefined {
    return this._processing
  }

  setProcessing(msg:string) {
    this._processing = msg
  }

  deleteProcessing() {
    delete this._processing
  }
  
}