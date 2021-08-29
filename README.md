# Simple Concurrency Queue
Promises based queue which allow you to specify a certain concurrency and retrieve, process and complete functions to handle a certain workload.

## Getting started
```javascript
const processingQueue = require('processingqueue');
const config = {
  concurrency: 10, //default 1
  timeout: 1000, //ms
  bufferSize: 20, //default 1
  retrieveFunction: retrieve
}
const myQueue = new processingQueue(process, config);
myQueue.start();

async function process(item) {
  //do something with item
  return response; //optional
}

async function retrieve() {
  //retrieve items for the queue
  return items; //return array of items
}

myQueue.on("completed", (result, item) => console.log("Item completed yay:", result, item));
myQueue.on("error", (error) => console.log("Error: ", error));
myQueue.on("timeout", (item) => console.log("My item timed out: ", item));
```

## Constructor
```javascript
new processingQueue(processingFunction, configurationObject);
```
  * processingFunction: Function to be called when an item is called for processing.
  * configurationObject: Object with the configuration for the queue. (optional)

## Methods
### start
Start the queue.
### add (...items)
Add items to the queue.
### stop
Stop the queue.
### clear
Clear the queue.

## Properties
  * length: length of the queue
  * currentConcurrency: current concurrency of the queue

## Configuration
All configuration options are optional.
  * concurrency (number): number of concurrent tasks to run. Default 1.
  * timeout (number): time in ms to wait for a task to complete before it is considered to be timed out. Default disabled.
  * bufferSize (number): if queue length is below this number, retrieveFunction will be called again. Default 1.
  * retrieveFunction(function(Promise)): function to retrieve items for the queue. Default disabled.

## Events
  * completed(item, queue): emitted when a task is completed
  * error(error, item, queue): emitted when an error occurs on an item
  * timeout(item, queue): emitted when a task is timed out