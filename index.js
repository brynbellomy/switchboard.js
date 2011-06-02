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
          this.obtainLockAndCall(this.evaluateEvent, event, once, arguments);
          //this.obtainEvaluateEventLock(event, once, arguments);
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
  this.obtainLockAndCall(function(keys) {
    require('inspect')(keys);
    if (typeof keys == 'undefined') {
      for (key in this.entries) {
        for (x in this.entries[key].events) {
          var event = this.entries[key].events[x];
          this.removeListener(event, this.eventTable[event][key]);
        }
      }
      return;
    }
    else if (typeof keys != 'object') {
      keys = [keys];
    }

    for (i in keys) {
      var key = keys[i];
      for (x in this.entries[key].events) {
        var event = this.entries[key].events[x];
        this.removeListener(event, this.eventTable[event][key]);
      }
    }
  }, keys);
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

module.exports.obtainLockAndCall = function(callback) {
  var args = Array.prototype.slice.call(arguments).slice(1);
  
  with ({theModule: this, args: args}) {
    var t = require('timers');
    t.setInterval(
      function() {
        if (theModule.lock == false) {
          theModule.lock = true;
          callback.apply(theModule, args);
          theModule.lock = false;
          t.clearInterval(this);
        }
      }, 10);
  }
};

module.exports.obtainEvaluateEventLock = function(event, once, eventArgs) {
  with ({theModule: this}) {
    var t = require('timers');
    t.setInterval(
      function() {
        if (theModule.lock == false) {
          theModule.lock = true;
          theModule.evaluateEvent(event, once, eventArgs);
          theModule.lock = false;
          t.clearInterval(this);
        }
      }, 10);
  }
};

/**
 * evaluateEvent()
 *
 * this is called by switchboard when any of the registered events is fired.
 */
module.exports.evaluateEvent = function(event, once, eventArgs) {
//  console.log('evaluating event', event);
  this.hasFired[event] = true;

  // add args to stored arguments by name
  this.argumentStore[event] = eventArgs;
  var i = 0;
  for (arg in this.argumentRegistry[event]) {
    this.argumentStore[event][this.argumentRegistry[event][arg]] = eventArgs[i];
    i++;
  }

  for (key in this.eventTable[event]) {
    var allFired = true;
    var toDelete = [];

    // check to see whether all relevant events have fired
    for (evt in this.entries[key].events) {
      if (!this.hasFired[this.entries[key].events[evt]]) {
        allFired = false;
        break;
      }
    }

    if (allFired) {
      // build the list of arguments for all registered event callbacks
      var args = {};
      for (evt in this.entries[key].events) {
        var eventName = this.entries[key].events[evt];
        args[eventName] = this.argumentStore[eventName];
      }

      // execute the callback
//      console.log('>>> KEY', key);
//      require('inspect')(this.entries);
      with ({callbackArgs: args, theCallback: this.entries[key].callback, key: null}) {
        require('inspect')(this);
        theCallback(callbackArgs);
      }
//      console.log('>>> KEY AFTER', key);
//      require('inspect')(this.entries);
//      console.log('>>> (EVENT)', event);

      // delete entry if it's a "once" event
      if (this.entries[key].once) {
        for (i in this.entries[key].events) {
          var evt = this.entries[key].events[i];
          delete this.eventTable[evt][key];
        }
        delete this.entries[key];
      }
    }
  }
}