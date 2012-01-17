var Events = require('events'),
    crypto = require('crypto')

function Switchboard() {
  Events.EventEmitter.call(this)
  this.entries = []
  this.eventTable = []
  this.hasFired = []
  this.argumentRegistry = []
  this.argumentStore = []
  this.lock = false
}
require('util').inherits(Switchboard, Events.EventEmitter)

module.exports = Switchboard

/*Switchboard.prototype = new Events.EventEmitter
Switchboard.prototype.entries = []
Switchboard.prototype.eventTable = []
Switchboard.prototype.hasFired = []
Switchboard.prototype.argumentRegistry = []
Switchboard.prototype.argumentStore = []
Switchboard.prototype.lock = false*/

/**
 * registerEventArguments()
 *
 * registers the names of the arguments passed to each respective event
 * callback so that they can be referred to by name.  not required to use
 * switchboard functionality.
 */
Switchboard.prototype.registerEventArguments = function(list) {
  var self = this
  for (var event in list)
    self.argumentRegistry[event] = list[event]
}

/**
 * onSeveral()
 *
 * registers a callback to be executed only after all listed events have
 * occurred.  functions very similarly to Events.EventEmitter.on().
 */
Switchboard.prototype.onSeveral = function(events, callback, once) {
  var self = this
  once = once || false

  // create unique hash key for self entry
  var key = crypto.createHash('md5').update((Math.random() * new Date().getTime()).toString()).digest('base64')
  if (typeof events != 'object') {
    events = [events]
  }

  self.entries[key] = {
    events: events,
    callback: callback,
    once: once
  }

  for (var i in events) {
    var fn = null
    if (!self.eventTable[events[i]]) {
      fn = (function(event, once) {
        return function() {
          self.obtainLockAndCall(self.evaluateEvent, event, once, arguments)
          //self.obtainEvaluateEventLock(event, once, arguments)
        }
      })(events[i], once)
    
      self.on(events[i], fn)
      self.eventTable[events[i]] = []
    }
    self.eventTable[events[i]][key] = fn // key = value to prevent duplicates
  }
  return key
}

/**
 * onceSeveral()
 *
 * registers a callback to be executed only after all listed events have
 * occurred. the callback will only be executed once, regardless of whether
 * the events occur again, the switchboard is reset, etc.  functions very
 * similarly to Events.EventEmitter.once().
 */
Switchboard.prototype.onceSeveral = function(events, callback) {
  var self = this
  return self.onSeveral(events, callback, true)
}

/**
 * vanGogh()
 *
 * remove multi-listeners added with onSeveral/onceSeveral.
 */
Switchboard.prototype.vanGogh = function(keys) {
  var self = this
  self.obtainLockAndCall(function(keys) {
    if (typeof keys == 'undefined') {
      for (key in self.entries) {
        for (x in self.entries[key].events) {
          var event = self.entries[key].events[x]
          self.removeListener(event, self.eventTable[event][key])
        }
      }
      return
    }
    else if (typeof keys != 'object') {
      keys = [keys]
    }

    for (i in keys) {
      var key = keys[i]
      for (x in self.entries[key].events) {
        var event = self.entries[key].events[x]
        self.removeListener(event, self.eventTable[event][key])
      }
    }
  }, keys)
}

/**
 * resetEvents()
 *
 * reset all of the 'event has occurred' flags, either for a single event,
 * a list of events, or all events (if no argument is passed).
 */
Switchboard.prototype.resetEvents = function(events) {
  var self = this
  if (typeof events == 'undefined') {
    Switchboard.prototype.hasFired = []
  }
  else {
    if (typeof events != 'object') {
      events = [events]
    }
    for (i in events) {
      delete Switchboard.prototype.hasFired[events[i]]
    }
  }
}

Switchboard.prototype.obtainLockAndCall = function(callback) {
  var self = this
  var args = Array.prototype.slice.call(arguments).slice(1)

  var t = require('timers')
  t.setInterval(
    function() {
      if (self.lock == false) {
        self.lock = true
        callback.apply(self, args)
        self.lock = false
        t.clearInterval(self)
      }
    }, 10) // @@TODO: use that locking module you found the other day...
}

Switchboard.prototype.obtainEvaluateEventLock = function(event, once, eventArgs) {
  var self = this
  var t = require('timers')

  t.setInterval(
    function() {
      if (self.lock == false) {
        self.lock = true
        self.evaluateEvent(event, once, eventArgs)
        self.lock = false
        t.clearInterval(self)
      }
    }, 10) // @@TODO: use that locking module you found the other day...
}

/**
 * evaluateEvent()
 *
 * self is called by switchboard when any of the registered events is fired.
 */
Switchboard.prototype.evaluateEvent = function(event, once, eventArgs) {
  var self = this

  self.hasFired[event] = true

  // add args to stored arguments by name
  self.argumentStore[event] = eventArgs
  var i = 0
  for (arg in self.argumentRegistry[event]) {
    self.argumentStore[event][self.argumentRegistry[event][arg]] = eventArgs[i]
    i++
  }

  for (key in self.eventTable[event]) {
    var allFired = true
    var toDelete = []

    // check to see whether all relevant events have fired
    for (evt in self.entries[key].events) {
      if (!self.hasFired[self.entries[key].events[evt]]) {
        allFired = false
        break
      }
    }

    if (allFired) {
      // build the list of arguments for all registered event callbacks
      var args = {}
      for (evt in self.entries[key].events) {
        var eventName = self.entries[key].events[evt]
        args[eventName] = self.argumentStore[eventName]
      }

      // execute the callback
      self.entries[key].callback(args)

      // delete entry if it's a "once" event
      if (self.entries[key].once) {
        for (i in self.entries[key].events) {
          var evt = self.entries[key].events[i]
          delete self.eventTable[evt][key]
        }
        delete self.entries[key]
      }
    }
  }
}
