# // switchboard

A composite event listener.  Waits for several events to occur before firing the handler.

Switchboard returns the arguments of each respective `emit` to the specified handler.  These arguments can be named if desired.

## Why do I need this?

Sometimes you have to wait for 2 or more things to happen before a certain part
of your program can move forward.  Let's say you're rendering a bunch of view
partials, for example.  You want to do it asynchronously, but it's kind of a
pain to figure out when everything's done without something kludgey (like a
static counter or a jungle of if statements).  Let Switchboard hide the
kludge for you.

Familiar syntax, too.  Just uses the classic EventEmitter 'on/once' pattern.
Except instead of a single event name, you specify an array.

## How to use

You've got two choices, cowboy.

### 1. Extremely simple way

```javascript
var switchboard = require('switchboard');

var events = [
  'firstEvent',
  'secondEvent',
  'thirdEvent'
];

switchboard.onceSeveral(events, function(args) {
  console.log(args)
});
```

### 2. With a little bit more code, you get your results returned in a dictionary!

```javascript
var switchboard = require('switchboard');

var events = [
  'firstEvent',
  'secondEvent',
  'thirdEvent'
];

switchboard.registerEventArguments({
  'firstEvent': ['err', 'resultA', 'resultB']
});

// multiple calls to registerEventArguments are a-okay
// (hint: good for loops or for registering callbacks from
// within other callbacks)
switchboard.registerEventArguments({
  'secondEvent': ['resultC', 'resultD', 'resultE'],
  'thirdEvent': ['err', 'myVar', 'someJunk']
});

switchboard.onceSeveral(events, function(args) {
  console.log(args)
});
```

Now that you've defined your events, you can go ahead and emit things...

```javascript
switchboard.emit('firstEvent', null, 'aaaa', 'bbbbb')
switchboard.emit('thirdEvent', {err: 'someErr'}, 'mvvvarrr', 'junk~!')
switchboard.emit('secondEvent', 'CCCC', 222222, 'EEEE')
```

Which will produce the following output:

```javascript
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
```

As you can see, each event's arguments are enumerated as well as being named.  The point: you can skip the call to `registerEventArguments()` if you want.


