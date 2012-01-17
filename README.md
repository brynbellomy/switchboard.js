# switchboard.js

A composite event listener.  Waits for several events to occur before firing the handler.

switchboard.js returns the arguments of each respective `emit` to the specified handler.  These arguments can be named if desired.

__BOTTOM LINE: This is another way to do the whole Promises/Futures thing.__  Someone else has probably implemented this, but hey, who doesn’t like options?

## How to use

    var switchboard = require(‘switchboard’)
    
    var events = [
      ‘firstEvent’,
      ‘secondEvent’,
      ‘thirdEvent’
    ]
  
    switchboard.registerEventArguments({
      ‘firstEvent’: [‘err’, ‘resultA’, ‘resultB’]
    })
    
    // multiple calls to registerEventArguments are a-okay
    // (hint: good for loops or for registering callbacks from
    // within other callbacks)
    switchboard.registerEventArguments({
      ‘secondEvent’: [‘resultC’, ‘resultD’, ‘resultE’],
      ‘thirdEvent’: [‘err’, ‘myVar’, ‘someJunk’]
    })

    switchboard.onceSeveral(events, function(args) {
      console.log(args)
    })

Now that you’ve defined your events, you can go ahead and emit things...

    switchboard.emit('firstEvent', null, 'aaaa', 'bbbbb')
    switchboard.emit('thirdEvent', {err: 'someErr'}, 'mvvvarrr', 'junk~!')
    switchboard.emit('secondEvent', 'CCCC', 222222, 'EEEE')

Which will produce the following output:

    { firstEvent: 
      { '0': null,
        '1': 'aaaa',
        '2': 'bbbbb',
        err: null,
        resultA: 'aaaa',
        resultB: 'bbbbb' },
    secondEvent: 
      { '0': 'CCCC',
        '1': 222222,
        '2': 'EEEE',
        resultC: 'CCCC',
        resultD: 222222,
        resultE: 'EEEE' },
    thirdEvent: 
      { '0': { err: 'someErr' },
        '1': 'mvvvarrr',
        '2': 'junk~!',
        err: { err: 'someErr' },
        myVar: 'mvvvarrr',
        someJunk: 'junk~!' } }

As you can see, each event’s arguments are enumerated as well as being named.  The point: you can skip the call to `registerEventArguments()` if you want.


