var Events = require('events'),
    crypto = require('crypto');
    
module.exports = new Events.EventEmitter;
module.exports.entries = [];
module.exports.eventTable = [];
module.exports.hasFired = [];
module.exports.argumentRegistry = [];
module.exports.argumentStore = [];
module.exports.lock = false;

/**
 * registerEventArguments()
 *
 * registers the names of the arguments passed to each respective event
 * callback so that they can be referred to by name.  not required to use
 * switchboard functionality.
 */
module.exports.registerEventArguments = function(list) {
  for (event in list) {
    module.exports.argumentRegistry[event] = list[event];
  }
}

/**
 * onSeveral()
 *
 * registers a callback to be executed only after all listed events have
 * occurred.  functions very similarly to Events.EventEmitter.on().
 */
module.exports.onSeveral = function(events, callback, once) {
  once = once || false;
  
  // create unique hash key for this entry
  var key = crypto.createHash('md5').update((Math.random() * new Date().getTime()).toString()).digest('base64');
  if (typeof events != 'object') {
    events = [events];
  }
  
  this.entries[key] = {
    events: events,
    callback: callback,
    once: once,
  };
  
  for (i in events) {
    var fn = null;
    if (!this.eventTable[events[i]]) {
      fn = (function(event, once) {
        return function() {
          this.obtainEvaluateEventLock(event, once, arguments);
        };
      })(events[i], once);
      
      this.on(events[i], fn);
      this.eventTable[events[i]] = [];
    }
    this.eventTable[events[i]][key] = fn; // key = value to prevent duplicates
  }
  return key;
};

/**
 * onceSeveral()
 *
 * registers a callback to be executed only after all listed events have
 * occurred. the callback will only be executed once, regardless of whether
 * the events occur again, the switchboard is reset, etc.  functions very
 * similarly to Events.EventEmitter.once().
 */
module.exports.onceSeveral = function(events, callback) {
  return this.onSeveral(events, callback, true);
};

/**
 * vanGogh()
 *
 * remove multi-listeners added with onSeveral/onceSeveral.
 */
module.exports.vanGogh = function(keys) {
  if (typeof events != 'object') {
    keys = [keys];
  }
  
  for (i in keys) {
    var key = keys[i];
    for (x in this.entries[key].events) {
      var event = this.entries[key].events[x];
      this.removeListener(event, this.eventTable[event][key]);
    }
  }
};

/**
 * resetEvents()
 *
 * reset all of the 'event has occurred' flags, either for a single event,
 * a list of events, or all events (if no argument is passed).
 */
module.exports.resetEvents = function(events) {
  if (typeof events == 'undefined') {
    module.exports.hasFired = [];
  }
  else {
    if (typeof events != 'object') {
      events = [events];
    }
    for (i in events) {
      delete module.exports.hasFired[events[i]];
    }
  }
};

/**
 * evaluateEvent()
 *
 * this is called by switchboard when any of the registered events is fired.
 */
module.exports.obtainEvaluateEventLock = function(event, once, eventArgs) {
  with ({theModule: this, lock: this.lock, evaluateEvent: this.evaluateEvent}) {
    require('timers').setInterval(function(isLocked) {
      if (isLocked == false) {
        this.lock = true;
        this.evaluateEvent(event, once, eventArgs);
        this.lock = false;
      }
    }, 10, lock);
  }
};


module.exports.evaluateEvent = function(event, once, eventArgs) {
  console.log('evaluating event', event);
  this.theModule.hasFired[event] = true;

  // add args to stored arguments by name
  this.theModule.argumentStore[event] = eventArgs;
  var i = 0;
  for (arg in this.theModule.argumentRegistry[event]) {
    this.theModule.argumentStore[event][this.theModule.argumentRegistry[event][arg]] = eventArgs[i];
    i++;
  }

  for (key in this.theModule.eventTable[event]) {
    var allFired = true;
    var toDelete = [];

    // check to see whether all relevant events have fired
    for (evt in this.theModule.entries[key].events) {
      if (!this.theModule.hasFired[this.theModule.entries[key].events[evt]]) {
        allFired = false;
        break;
      }
    }

    if (allFired) {
      // build the list of arguments for all registered event callbacks
      var args = {};
      for (evt in this.theModule.entries[key].events) {
        var eventName = this.theModule.entries[key].events[evt];
        args[eventName] = this.theModule.argumentStore[eventName];
      }

      // execute the callback
      console.log('>>> KEY', key);
      require('inspect')(this.theModule.entries);
      with ({callbackArgs: args, theCallback: this.theModule.entries[key].callback, key: null}) {
        theCallback(callbackArgs);
      }
      console.log('>>> KEY AFTER', key);
      require('inspect')(this.theModule.entries);
      console.log('>>> (EVENT)', event);

      // delete entry if it's a "once" event
      if (this.theModule.entries[key].once) {
        for (i in this.theModule.entries[key].events) {
          var evt = this.theModule.entries[key].events[i];
          delete this.theModule.eventTable[evt][key];
        }
        delete this.theModule.entries[key];
      }
    }
  }
}