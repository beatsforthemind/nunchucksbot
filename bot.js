/*~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
          ______     ______     ______   __  __     __     ______
          /\  == \   /\  __ \   /\__  _\ /\ \/ /    /\ \   /\__  _\
          \ \  __<   \ \ \/\ \  \/_/\ \/ \ \  _"-.  \ \ \  \/_/\ \/
          \ \_____\  \ \_____\    \ \_\  \ \_\ \_\  \ \_\    \ \_\
           \/_____/   \/_____/     \/_/   \/_/\/_/   \/_/     \/_/


This is a sample Slack bot built with Botkit.

This bot demonstrates many of the core features of Botkit:

* Connect to Slack using the real time API
* Receive messages based on "spoken" patterns
* Reply to messages
* Use the conversation system to ask questions
* Use the built in storage system to store and retrieve information
  for a user.

# RUN THE BOT:

  Get a Bot token from Slack:

    -> http://my.slack.com/services/new/bot

  Run your bot from the command line:

    token=<MY TOKEN> node bot.js

# USE THE BOT:

  Find your bot inside Slack to send it a direct message.

  Say: "Hello"

  The bot will reply "Hello!"

  Say: "who are you?"

  The bot will tell you its name, where it running, and for how long.

  Say: "Call me <nickname>"

  Tell the bot your nickname. Now you are friends.

  Say: "who am I?"

  The bot will tell you your nickname, if it knows one for you.

  Say: "shutdown"

  The bot will ask if you are sure, and then shut itself down.

  Make sure to invite your bot into other channels using /invite @<my bot>!

# EXTEND THE BOT:

  Botkit is has many features for building cool and useful bots!

  Read all about it here:

    -> http://howdy.ai/botkit

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/


if (!process.env.token) {
    console.log('Error: Specify token in environment');
    process.exit(1);
}

var Botkit = require('./node_modules/botkit/lib/Botkit.js');
var cheerio = require('./node_modules/cheerio');
var request = require('./node_modules/request');
var fs = require('fs');
var os = require('os');

var google = require('googleapis');
var customsearch = google.customsearch('v1');
var keys = require('./keys.js');


var controller = Botkit.slackbot({
    debug: true,
});


var bot = controller.spawn({
    token: process.env.token
}).startRTM();


controller.hears(['hello','hi'],'direct_message,direct_mention,mention',function(bot, message) {

    bot.api.reactions.add({
        timestamp: message.ts,
        channel: message.channel,
        name: 'robot_face',
    },function(err, res) {
        if (err) {
            bot.botkit.log('Failed to add emoji reaction :(',err);
        }
    });


    controller.storage.users.get(message.user,function(err, user) {
        if (user && user.name) {
            bot.reply(message,'Hello ' + user.name + '!!');
        } else {
            bot.reply(message,'Hello.');
        }
    });
});

controller.hears(['call me (.*)'],'direct_message,direct_mention,mention',function(bot, message) {
    var matches = message.text.match(/call me (.*)/i);
    var name = matches[1];
    controller.storage.users.get(message.user,function(err, user) {
        if (!user) {
            user = {
                id: message.user,
            };
        }
        user.name = name;
        controller.storage.users.save(user,function(err, id) {
            bot.reply(message,'Got it. I will call you ' + user.name + ' from now on.');
        });
    });
});

controller.hears(['what is my name','who am i'],'direct_message,direct_mention,mention',function(bot, message) {

    controller.storage.users.get(message.user,function(err, user) {
        if (user && user.name) {
            bot.reply(message,'Your name is ' + user.name);
        } else {
            bot.reply(message,'I don\'t know yet!');
        }
    });
});


controller.hears(['shutdown'],'direct_message,direct_mention,mention',function(bot, message) {

    bot.startConversation(message,function(err, convo) {

        convo.ask('Are you sure you want me to shutdown?',[
            {
                pattern: bot.utterances.yes,
                callback: function(response, convo) {
                    convo.say('Bye!');
                    convo.next();
                    setTimeout(function() {
                        process.exit();
                    },3000);
                }
            },
        {
            pattern: bot.utterances.no,
            default: true,
            callback: function(response, convo) {
                convo.say('*Phew!*');
                convo.next();
            }
        }
        ]);
    });
});


controller.hears(['uptime','identify yourself','who are you','what is your name'],'direct_message,direct_mention,mention',function(bot, message) {

    var hostname = os.hostname();
    var uptime = formatUptime(process.uptime());

    bot.reply(message,':robot_face: I am a bot named <@' + bot.identity.name + '>. I have been running for ' + uptime + ' on ' + hostname + '.');

});

function formatUptime(uptime) {
    var unit = 'second';
    if (uptime > 60) {
        uptime = uptime / 60;
        unit = 'minute';
    }
    if (uptime > 60) {
        uptime = uptime / 60;
        unit = 'hour';
    }
    if (uptime != 1) {
        unit = unit + 's';
    }

    uptime = uptime + ' ' + unit;
    return uptime;
}





//this be the main search listener that delegates to other functions based on second "argument"
controller.hears(['search (.*)'], 'direct_message,direct_mention,mention,ambient', function(bot, message) {
  
	var goodCommand = true; //set false if unable to parse
  var matches = message.text.match(/search (\S*)/i); //get the word immediately following "search"
  
	if(!matches && matches !== null) { //type wasn't found
		goodCommand = false;
	} else {
	}
	
	if(goodCommand && typeof matches[1] != 'undefined') {
		var type = matches[1]; //select the right one from the resultant array
		var positionAfterType = message.text.indexOf(type) + type.length + 1;
		var query = message.text.substring(positionAfterType); //get everything after the "type" in the message, adding 1 to account for the space character following the type
      
		if(!query) { //query wasn't found
			goodCommand = false;
		} else {
			switch(type) { //send query to proper function
  			case "img":
				case "image":
				case "images":
					gImgQuery(message, query);
					break;
				// default:
			}
		}
	}
	
	if(goodCommand === false) { //some sort of problem, throw error message
		// bot.reply(message,'There was a problem with your search.  Please try again.  _Hint - Use the following syntax: search $type_of_search $query_to_be_searched_');
	}
});

controller.hears(['search'],'direct_message,direct_mention,mention',function(bot, message) { 
	bot.reply(message,'Syntax: search $type_of_search $query_to_be_searched');
});

function imageSearch(message, query) {
	//bot.reply(message, 'you requested an image search for ' + query); //obviously just for testing
	var urlToRequest = 'https://www.google.com/search?tbm=isch&q=' + query;
	request(urlToRequest, function (error, response, html) {
	    if (!error && response.statusCode == 200) {
			var $ = cheerio.load(html);
			var primaryImg = $('img').first().attr('src');
			request(primaryImg).pipe(fs.createWriteStream('image.jpg'));
			var channelToPostTo = message.channel;
			bot.api.files.upload({
				file: fs.createReadStream('image.jpg'),
				channels: channelToPostTo,
				filename: 'image.jpg'
			});
		}
	});
}


//https://developers.google.com/custom-search/json-api/v1/reference/cse/list
function gImgQuery(message, query) {
  if (query) {
    const CX = keys.gapi1.cx;
    const API_KEY = keys.gapi1.key;
    customsearch.cse.list({ cx: CX, auth: API_KEY, q: query, searchType: "image", safe: "medium", imgSize: "medium" }, function(err, resp) {
      if (err) {
        console.log('An error occured', err);
        bot.reply(message, "Sorry, can't do that.");
        return;
      }
      if (resp.items && resp.items.length > 0) {
        console.log(resp.items[0].link);
        bot.reply(message, resp.items[0].link);
        return;
      } else {
        bot.reply(message, "Sorry, no results.");
        return;   
      }
    });
  } else {
  }
}