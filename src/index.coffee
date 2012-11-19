{EventEmitter2} = require 'eventemitter2'
uuid = require 'node-uuid'

class Switchboard extends EventEmitter2
    entries: {}
    _globalEventHandlers: {}
    _hasFired: {}
    argumentNames: {}
    firedEventArgumentStore: {}
    lock: no

    hasFired: (eventNames, val) =>
        eventNames = [ eventNames ] unless eventNames instanceof Array
        allFired   = yes

        for eventName in eventNames
            if val?
                _hasFired[eventName] = val
            else if _hasFired[eventName] is no
                allFired = no
                break

        return allFired

    setNamedArgsForEvent: (eventName, eventArgs) =>
        for argName, i in @argumentNames[eventName]
            @firedEventArgumentStore[eventName][argName] = eventArgs[i]

    setUnnamedArgsForEvent: (eventName, eventArgs) =>
        @firedEventArgumentStore[eventName] = eventArgs

    setArgsForEvent: (eventName, eventArgs) =>
        if @argumentNames[eventName]?
            @setNamedArgsForEvent(eventName, argName, eventArgs[i])
        else
            @setUnnamedArgsForEvent(eventName, eventArgs)

    possibleHandlersForSingleEvent: (event) =>
        handlers = []
        uuids = Object.keys( @_globalEventHandlers[event] )
        for uuid in uuids
            handlers.push( @entries[uuid] )
        return handlers


    getArgsForEvents: (events) =>
        args = {}
        args[event] = @firedEventArgumentStore[event] for event in events
        return args

    destroyHandler: (fnOrUUID) =>
        handler = fnOrUUID

        if typeof fnOrUUID is 'string'
            handler = @entries[fnOrUUID]

        # determine which events to remove our global listeners for
        eventsToUnlisten = handler.events
        for uuid, handler of @entries
            for event in handler.events
                if event in eventsToUnlisten
                    eventsToUnlisten = eventsToUnlisten.filter (item) -> item isnt event

                break if eventsToUnlisten.length is 0
            break if eventsToUnlisten.length is 0

        # now remove those events
        @removeListener(event, @_globalEventHandlers[event]) for event in eventsToUnlisten

        # destroy the handler
        delete @entries[handler.uuid]


    #
    # ## registerEventArguments
    #
    # registers the names of the arguments passed to each respective event
    # callback so that they can be referred to by name.  not required to use
    # switchboard functionality.
    #
    registerEventArguments: (events) =>
        @argumentNames[event] = args for event, args of events


    #
    # ## onSeveral
    #
    # registers a callback to be executed only after all listed events have
    # occurred.  functions very similarly to Events.EventEmitter.on().
    #
    on: (events, callback, once = no) =>
      events = [ events ] unless events instanceof Array

      event_uuid = uuid.v4()

      new_entry = (args...) -> callback(args...)
      new_entry.uuid   = event_uuid
      new_entry.events = events
      new_entry.once   = once
      @entries[event_uuid] = new_entry

      for event, i in events then do (event) =>
          unless @_globalEventHandlers[event]?
              handlerFn = (args...) => @evaluateEvent(event, args...)
              @_globalEventHandlers[event] = handlerFn

              if once then @once(event, handlerFn)
              else super(event, handlerFn)

      return event_uuid


    #
    # ## onceSeveral
    #
    # registers a callback to be executed only after all listed events have
    # occurred. the callback will only be executed once, regardless of whether
    # the events occur again, the switchboard is reset, etc.  functions very
    # similarly to Events.EventEmitter.once().
    #
    once: (events, callback) =>
        @on events, callback, yes


    #
    # ## vanGogh
    #
    # remove multi-listeners added with `onSeveral`/`onceSeveral`.
    #
    vanGogh: (uuids) =>
        ## @obtainLockAndCall do (uuids) =>
        uuids = Object.keys(@entries) if not uuids?
        uuids = [ uuids ] unless uuids instanceof Array

        @destroyHandler(uuid) for uuid in uuids


    #
    # ## resetEvents
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




    obtainLockAndCall: (fn, args...) =>
        # timer = setInterval (=>
        #     if @lock is no
        #         clearInterval(timer)
        #         @lock = yes
        fn(args)
        #         @lock = no
        # ), 10


    #
    # evaluateEvent()
    #
    # called when any of the registered events is fired.
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


exports.Switchboard = Switchboard

