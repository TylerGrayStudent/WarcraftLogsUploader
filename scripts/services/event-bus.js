let _listeners = [];

function arrayRemove(arr, value) {
  return arr.filter(function (ele) {
    return ele != value;
  });
}

function addListener(eventHandler) {
  _listeners.push(eventHandler);
}

function removeListener(eventHandler) {
  _listeners = arrayRemove(_listeners, eventHandler);
}

function trigger(eventName, data) {
  for (let listener of _listeners) {
    listener(eventName, data);
  }
}

const eventBus = {
  addListener,
  removeListener,
  trigger,
};

module.exports = { eventBus };
