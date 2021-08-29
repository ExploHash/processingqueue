const EventEmitter = require('events');

class ProcessingQueue extends EventEmitter {
  #config = {
    concurrency: 1,
    timeout: 0,
    bufferSize: 1,
    retrieveFunction: null
  }

  #processingFunction;

  #optionMapping = {
    concurrency: "number",
    timeout: "number",
    bufferSize: "number",
    retrieveFunction: "function"
  }
  
  #tickSpeed = 10;
  #intervalId;

  #queueu = [];
  #currentConcurrency = 0;

  #bufferLowRunning = false;

  get length(){
    return this.#queueu.length;
  }

  get currentConcurrency(){
    return this.#currentConcurrency;
  }

  constructor(processingFunction, options = {}) {
    super();
    //Check arguments
    if(!processingFunction){
      throw new Error("No processing function given");
    }else{
      this.#processingFunction = processingFunction;
    }
    Object.entries(options).forEach(([key, value]) => {
      if(!this.#optionMapping[key]) {
        throw new Error(`Unknown option: ${key}`);
      }else if(typeof value !== this.#optionMapping[key]) {
        throw new Error(`Option ${key} must be a ${this.#optionMapping[key]}`);
      }else{
        this.#config[key] = value;
      }
    });
  }

  start(){
    if(!this.#intervalId){
      this.#intervalId = setInterval(() => this.#tick.call(this), this.#tickSpeed);
      this.#tick();
    }
  }

  async #tick(){
    const promises = [];
    //Check if buffer needs new items
    if(this.#queueu.length < this.#config.bufferSize && this.#config.retrieveFunction && !this.#bufferLowRunning){
      promises.push(this.#bufferLow(this.#config.bufferSize - this.#queueu.length));
    }

    //Check if concurrency is on point
    if(this.#currentConcurrency < this.#config.concurrency){
      const items = this.#queueu.splice(0, this.#config.concurrency - this.#currentConcurrency);
      promises.push(Promise.all(items.map(item => this.#runItem(item))));
    }

    //Run all promises
    await Promise.all(promises);
  }

  async #bufferLow(neededItems){
    this.#bufferLowRunning = true;
    const items = await this.#config.retrieveFunction(neededItems, this);

    if(!items || typeof items !== "object" || !Array.isArray(items)){
      throw new Error("ProcessingQueue: Retrieve functions should return array of items")
    }
    this.#queueu.push(...items);
    this.#bufferLowRunning = false;
  }

  async #runItem(item){
    let result;
    try {
      this.#currentConcurrency++;
      const promises = [this.#processingFunction(item, this)];
      if(this.#config.timeout){
        promises.push(new Promise((res, rej) => setTimeout(() => rej("timeout"), this.#config.timeout)));
      }

      result = await Promise.race(promises);
      this.emit("completed", result, item, this);
    }catch(err){
      if(err === "timeout"){
        this.emit("timeout", item, this);
      }else{
        this.emit("error", err, item, this);
      }
    }finally{
      this.#currentConcurrency--;
    }
  }

  add(...items){
    this.#queueu.push(...items);
  }

  clear(){
    this.#queueu = [];
  }

  stop(){
    clearInterval(this.#intervalId);
    this.#intervalId = null;
  }
}

module.exports = ProcessingQueue;