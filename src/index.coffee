#
# # // switchboard.js
#
# bryn austin bellomy < <bryn.bellomy@gmail.com> >
#

EventEmitter2 = undefined
EventEmitter = undefined
Emitter = undefined
nodeUUID = undefined


if window?
    {EventEmitter2, EventEmitter, Emitter, uuid} = window

else if require?
    try {EventEmitter2} = require 'eventemitter2'
    catch err
        {EventEmitter} = require 'events'
    nodeUUID = require 'node-uuid'


#
# # class Switchboard
#
class exports.Switchboard extends (EventEmitter2 ? EventEmitter ? Emitter)

    constructor: () ->
        @_globalEventHandlers = {}
        @_hasFired = {}
        @_entries = {}
        @_argumentNames = {}
        @_firedEventArgumentStore = {}


    #
    # ## Public instance methods
    #


    #
    # ### registerEventArguments
    #
    # registers the names of the arguments passed to each respective event
    # callback so that they can be referred to by name.  not required to use
    # switchboard functionality.
    #
    registerEventArguments: (events) =>
        @_argumentNames[event] = args for event, args of events


    #
    # ### on
    #
    # registers a callback to be executed only after all listed events have
    # occurred.  functions very similarly to `EventEmitter.on()`.
    #
    on: (events, callback, once = no) =>
      events = [ events ] unless events instanceof Array

      event_uuid = nodeUUID.v4()

      new_entry = (args...) -> callback(args...)
      new_entry.uuid   = event_uuid
      new_entry.events = events
      new_entry.once   = once
      @_entries[event_uuid] = new_entry

      for event, i in events
          unless @_globalEventHandlers[event]?
              handlerFn = do (event) => (args...) => @evaluateEvent(event, args...)

              @_globalEventHandlers[event] = handlerFn

              if once then EventEmitter.prototype.once.call(this, event, handlerFn)
              else super(event, handlerFn)

      return event_uuid


    #
    # ### once
    #
    # registers a callback to be executed only after all listed events have
    # occurred. the callback will only be executed once, regardless of whether
    # the events occur again, the switchboard is reset, etc.  functions very
    # similarly to Events.EventEmitter.once().
    #
    once: (events, callback) =>
        @on events, callback, yes


    #
    # ### vanGogh
    #
    # remove multi-listeners added with `onSeveral`/`onceSeveral`.
    #
    vanGogh: (uuids) =>
        uuids = Object.keys(@_entries) if not uuids?
        uuids = [ uuids ] unless uuids instanceof Array

        @destroyHandler(uuid) for uuid in uuids


    #
    # ### resetEvents
    #
    # reset all of the 'event has occurred' flags, either for a single event,
    # a list of events, or all events (if no argument is passed).
    #
    resetEvents: (events) =>
        if not events?
            @_hasFired = []
        else
            events = [ events ] unless events instanceof Array
            delete @_hasFired[event] for event of events



    #
    # ## Private utility methods
    #

    evaluateEvent: (eventName, eventArgs) =>
        @hasFired( eventName, yes )
        
        # add args to stored arguments by name
        @setArgsForEvent( eventName, eventArgs )

        possibleHandlers = @possibleHandlersForSingleEvent( eventName )
        for handler in possibleHandlers
            if @hasFired( handler.events ) is yes
                args = @getArgsForEvents( handler.events )
                handler(args)

                if handler.once is yes
                    @destroyHandler( handler )



    hasFired: (eventNames, val) =>
        eventNames = [ eventNames ] unless eventNames instanceof Array
        allFired   = yes

        for eventName in eventNames
            if val?
                @_hasFired[eventName] = val
            else unless @_hasFired[eventName] is yes
                allFired = no
                break

        return allFired

    setNamedArgsForEvent: (eventName, eventArgs) =>
        @_firedEventArgumentStore[eventName][argName] = eventArgs[i] for argName, i in @_argumentNames[eventName]

    setUnnamedArgsForEvent: (eventName, eventArgs) =>
        @_firedEventArgumentStore[eventName] = eventArgs

    setArgsForEvent: (eventName, eventArgs) =>
        if @_argumentNames[eventName]?
            @setNamedArgsForEvent(eventName, argName, eventArgs[i])
        else
            @setUnnamedArgsForEvent(eventName, eventArgs)

    possibleHandlersForSingleEvent: (event) =>
        handlers = []
        for uuid, handler of @_entries
            if event in handler.events then handlers.push(handler)

        return handlers


    getArgsForEvents: (events) =>
        args = {}
        args[event] = @_firedEventArgumentStore[event] for event in events
        return args

    destroyHandler: (fnOrUUID) =>
        handler = fnOrUUID

        if typeof fnOrUUID is 'string'
            handler = @_entries[fnOrUUID]

        # determine which events to remove our global listeners for
        eventsToUnlisten = handler.events
        for uuid, handler of @_entries
            for event in handler.events
                if event in eventsToUnlisten
                    eventsToUnlisten = eventsToUnlisten.filter (item) -> item isnt event

                break if eventsToUnlisten.length is 0
            break if eventsToUnlisten.length is 0

        # now remove those events
        @removeListener(event, @_globalEventHandlers[event]) for event in eventsToUnlisten

        # destroy the handler
        delete @_entries[handler.uuid]



# (exports ? window).Switchboard = Switchboard

