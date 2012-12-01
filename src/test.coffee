assert = require 'assert'
{Switchboard} = require '../'

describe 'switchboard', ->
    this.timeout 1000

    describe 'multi-event handlers', ->

        it 'should not trigger handlers unless all events have occurred', (done) ->
            the_switchboard = new Switchboard()
            the_switchboard.on ['event1', 'event2'], (data) ->
                throw new Error 'should not have triggered'

            the_switchboard.emit 'event1'
            setTimeout (-> done()), 10

        it 'should trigger handlers after all events have been emitted', (done) ->
            the_switchboard = new Switchboard()
            the_switchboard.on ['event1', 'event2'], (data) -> done()
            the_switchboard.emit 'event1'
            the_switchboard.emit 'event2'

        it 'should continue to trigger handlers on every matching event after all events have been emitted', (done) ->
            the_switchboard = new Switchboard()
            the_switchboard.on ['event1', 'event2'], (data) ->
                if triggeredAgainOnce and triggeredAgainTwice then done()

            the_switchboard.emit 'event1'
            the_switchboard.emit 'event2'
            triggeredAgainOnce = yes
            the_switchboard.emit 'event2'
            triggeredAgainTwice = yes
            the_switchboard.emit 'event1'

        it 'should not trigger handlers after a call to .vanGogh()', (done) ->
            the_switchboard = new Switchboard()
            the_switchboard.on ['event1', 'event2'], (data) ->
                throw new Error 'should not have triggered'

            the_switchboard.emit 'event1'
            the_switchboard.vanGogh()
            the_switchboard.emit 'event2'

            setTimeout (-> done()), 10
