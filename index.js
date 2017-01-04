'use strict';
var Alexa = require("alexa-sdk");
var appId = undefined; // App ID excluded from repo for security reasons.

exports.handler = function(event, context, callback) {
    var alexa = Alexa.handler(event, context);
    alexa.appId = appId;
    alexa.dynamoDBTableName = 'highLowGuessUsers';
    alexa.registerHandlers(newSessionHandlers, guessModeHandlers, startGameHandlers, guessAttemptHandlers);
    alexa.execute();
};

var states = {
    GUESSMODE: '_GUESSMODE',
    STARTMODE: '_STARTMODE'
};

var newSessionHandlers = {
    'NewSession': function() {
        if (Object.keys(this.attributes).length === 0) {
            this.attributes['endedSessionCount'] = 0;
            this.attributes['gamesPlayed'] = 0;
        }
        this.handler.state = states.STARTMODE;
        var message = 'I will think of a number between zero and one hundred, try to guess and I will tell you if it' +
            ' is higher or lower. Are you ready to play?';
        this.emit(':ask', message, 'Are you ready to play? Just say yes, and we can get started.');
    }
};

var startGameHandlers = Alexa.CreateStateHandler(states.STARTMODE, {
    'NewSession': function() {
        this.emit('NewSession');
    },
    'AMAZON.HelpIntent': function() {
        var message = 'I will think of a number between zero and one hundred, try to guess and I will tell you if it' +
            ' is higher or lower. Are you ready to play?';
        this.emit(':ask', message, message);
    },
    'AMAZON.YesIntent': function() {
        this.attributes["guessNumber"] = Math.floor(Math.random() * 100);
        this.handler.state = states.GUESSMODE;
        this.emit(':ask', 'Great! ' + 'I have thought of a number. Let\'s see if you can guess it.', 'Don\'t be shy, guess a number!');
    },
    'AMAZON.NoIntent': function() {
        this.emit(':tell', 'No problem.');
    },
    'SessionEndedRequest': function() {
        this.attributes['endedSessionCount'] += 1;
        this.emit(':saveState', true);
    },
    'Unhandled': function() {
        var message = 'Say yes to continue, or no to end the game.';
        this.emit(':ask', message, message);
    }
});

var guessModeHandlers = Alexa.CreateStateHandler(states.GUESSMODE, {
    'NewSession': function() {
        this.handler.state = '';
        this.emitWithState('NewSession');
    },
    'NumberGuessIntent': function() {
        var guessNum = parseInt(this.event.request.intent.slots.number.value);
        var targetNum = this.attributes["guessNumber"];

        if (guessNum > targetNum) {
            this.emit('TooHigh', guessNum);
        } else if (guessNum < targetNum) {
            this.emit('TooLow', guessNum);
        } else if (guessNum === targetNum) {
            this.emit('JustRight', () => {
                this.emit(':ask', 'You got it! The number I was thinking of was ' + guessNum.toString() + '. That was fun! Shall we play again?',
                    'Would you like me to think of another number?');
            })
        } else {
            this.emit('NotANum');
        }
    },
    'AMAZON.HelpIntent': function() {
        this.emit(':ask', 'I am thinking of a number between zero and one hundred. Guess a number, and I will tell you' +
            ' if it\'s higher or lower.', 'Try saying a number.');
    },
    'SessionEndedRequest': function() {
        this.attributes['endedSessionCount'] += 1;
        this.emit(':saveState', true);
    },
    'Unhandled': function() {
        this.emit(':ask', 'Sorry, I didn\'t catch that. Could you say the number again?.', 'Try saying a number.');
    }
});

var guessAttemptHandlers = {
    'TooHigh': function(val) {
        this.emit(':ask', 'It\'s lower than ' + val.toString(), 'Try again.');
    },
    'TooLow': function(val) {
        this.emit(':ask', 'It\'s higher than ' + val.toString(), 'Try again.');
    },
    'JustRight': function(callback) {
        this.handler.state = states.STARTMODE;
        this.attributes['gamesPlayed']++;
        callback();
    },
    'NotANum': function() {
        this.emit(':ask', 'Sorry, I didn\'t catch that. Could you say the number again?', 'Try saying a number.');
    }
};
