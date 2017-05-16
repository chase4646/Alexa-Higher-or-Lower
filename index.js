'use strict';
var Alexa = require("alexa-sdk");
var appId = undefined; // Removed from repo for security reasons.

var START_MSG = 'I will think of a number, between one and a hundred. Try to guess, and I will tell you if it' +
                ' is higher or lower. Are you ready to play?';
var MSG_DONE = 'No problem, thanks for playing! Let\'s play again soon!';

exports.handler = function(event, context, callback) {
    var alexa = Alexa.handler(event, context);
    alexa.appId = appId;
    alexa.dynamoDBTableName = 'highLowGuessUsers';
    alexa.registerHandlers(newSessionHandlers, guessModeHandlers, startGameHandlers, guessAttemptHandlers);
    alexa.execute();
};

var states = {
    GUESSMODE: '_GUESSMODE', // User is trying to guess the number.
    STARTMODE: '_STARTMODE'  // Prompt the user to start or restart the game.
};

var newSessionHandlers = {
    'NewSession': function() {
        if(Object.keys(this.attributes).length === 0) {
            this.attributes['endedSessionCount'] = 0;
            this.attributes['gamesPlayed'] = 0;
        }
        this.handler.state = states.STARTMODE;
        this.emit(':ask', START_MSG, 'Are you ready to play? Just say yes, and we can get started.');
    },
    'AMAZON.StopIntent': function() {
      this.emit(':tell', MSG_DONE);  
    },
    'AMAZON.CancelIntent': function() {
      this.emit(':tell', MSG_DONE);  
    },
    'SessionEndedRequest': function () {
        console.log('session ended!');
        this.attributes['endedSessionCount'] += 1;
        this.emit(":tell", MSG_DONE);
    }
};

var startGameHandlers = Alexa.CreateStateHandler(states.STARTMODE, {
    'NewSession': function () {
        this.emit('NewSession'); // Uses the handler in newSessionHandlers
    },
    'AMAZON.HelpIntent': function() {
        this.emit(':ask', START_MSG, START_MSG);
    },
    'AMAZON.YesIntent': function() {
        this.attributes["guessNumber"] = Math.floor((Math.random() * 100) + 1);
        this.handler.state = states.GUESSMODE;
        this.emit(':ask', 'Great! ' + 'I have thought of a number. Let\'s see if you can guess it.', 'Don\'t be shy, guess a number!');
    },
    'AMAZON.NoIntent': function() {
        console.log('Aborted');
        this.emit(':tell', MSG_DONE);
    },
    'AMAZON.StopIntent': function() {
        console.log('Aborted');
        this.emit(':tell', MSG_DONE);  
    },
    'AMAZON.CancelIntent': function() {
        console.log('Aborted');
        this.emit(':tell', MSG_DONE);  
    },
    'SessionEndedRequest': function () {
        console.log('session ended!');
        this.attributes['endedSessionCount'] += 1;
        this.emit(':saveState', true);
        this.emit(':tell', MSG_DONE);
    },
    'Unhandled': function() {
        var message = 'Say yes to continue, or no to end the game.';
        this.emit(':ask', message, message);
    }
});

var guessModeHandlers = Alexa.CreateStateHandler(states.GUESSMODE, {
    'NewSession': function () {
        this.handler.state = '';
        this.emitWithState('NewSession'); // Equivalent to the Start Mode NewSession handler
    },
    'NumberGuessIntent': function() {
        var guessNum = parseInt(this.event.request.intent.slots.number.value);
        var targetNum = this.attributes["guessNumber"];
        console.log('user guessed: ' + guessNum);

        if(guessNum > targetNum){
            this.emit('TooHigh', guessNum);
        } else if( guessNum < targetNum){
            this.emit('TooLow', guessNum);
        } else if (guessNum === targetNum){
            this.emit('JustRight', () => {
                // Sound effect: https://s3.amazonaws.com/sdalexa/correct.mp3
                this.emit(':ask', '<audio src="https://s3.amazonaws.com/sdalexa/correct.mp3"></audio> You got it! The number I was thinking of was ' + guessNum.toString() + '! That was fun! Shall we play again?',
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
    "AMAZON.StopIntent": function() {
        console.log('Aborted');
        this.emit(':tell', MSG_DONE);
    },
    "AMAZON.CancelIntent": function() {
        console.log('Aborted');
        this.emit(':tell', MSG_DONE);
    },
    'SessionEndedRequest': function () {
        console.log('Session ended!');
        this.attributes['endedSessionCount'] += 1;
        this.emit(':saveState', true);
        this.emit(':tell', MSG_DONE);  
    },
    'Unhandled': function() {
        this.emit(':ask', 'Sorry, I didn\'t catch that. Could you say the number again?.', 'Try saying a number.');
    }
});

// These handlers are not bound to a state
var guessAttemptHandlers = {
    'TooHigh': function(val) {
        this.emit(':ask',  'It\'s lower than ' + val.toString(), 'Try again.');
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
