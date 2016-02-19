// token=<MY TOKEN> node bot.js

if (!process.env.token) {
    console.log('Error: Specify token in environment');
    process.exit(1);
}

var Botkit = require('./node_modules/botkit/lib/Botkit.js');
var cheerio = require('./node_modules/cheerio');
var request = require('./node_modules/request');
var fs = require('fs');
var os = require('os');

var keys = require('./keys.js');

var google = require('googleapis');
var customsearch = google.customsearch('v1');

var YouTube = require('youtube-node');
var youTube = new YouTube();
youTube.setKey(keys.gapi1.key);
youTube.addParam('type', 'video');


var controller = Botkit.slackbot({
  debug: true,
});


var bot = controller.spawn({
  token: process.env.token
}).startRTM();


controller.hears(['moon man', 'microbrew', 'hopalicious', 'pure hoppiness', 'ghost ship', 'fat squirrel', 'karben4', 'ale asylum', 'new glarus'],'message_received,ambient,mention',function(bot, message) {
	bot.api.reactions.add({
		timestamp: message.ts,
		channel: message.channel,
		name: '+1',
	},function(err, res) {
		if (err) {
			bot.botkit.log('Failed to add emoji reaction :(',err);
		}
	});
});


controller.hears(['bud light', 'miller lite', 'blue moon', 'corona', 'miller light', 'budweiser', 'mgd'],'message_received,ambient,mention',function(bot, message) {
	bot.api.reactions.add({
		timestamp: message.ts,
		channel: message.channel,
		name: '-1',
	},function(err, res) {
		if (err) {
			bot.botkit.log('Failed to add emoji reaction :(',err);
		}
	});
});


controller.hears(['^knock knock'],'direct_message,direct_mention,mention',function(bot, message) {
	bot.startConversation(message, function(err, convo) {
		convo.ask('Who\'s there?', function(response, convo) {
			convo.next();
			convo.ask(response.text + ' who?', function(secResponse, convo) {
				convo.next();
				var naughtyWords = ['bitch', 'cunt', 'vagina', 'slut', 'whore', 'fuck', 'pussy', 'ass', 'cock', 'dick', 'penis', 'tits', 'boobs', 'breasts'];
				var naughtyWordDetected = false;
				for(i = 0; i < naughtyWords.length; i++) {
					if(secResponse.text.indexOf(naughtyWords[i]) > -1) {
						naughtyWordDetected = true;
					}
				}
				if(naughtyWordDetected) {
					convo.say('How rude! :angry:');
				} else {
					switch(getRandomInt(0,5)) {
						case 0:
							convo.say('ROFL!!!');
							break;
						case 1:
							convo.say('lmao');
							break;
						case 2:
							convo.say('You\'re a funny guy :wink:');
							break;
						case 3:
							convo.say(':laughing:');
							break;
						case 4:
							convo.say(':stuck_out_tongue_winking_eye:');
							break;
						case 5:
							convo.say('Good one! :wink:');
							break;
						default:
							convo.say(':wink:');
					}
				}
			});
		});
		
	});
});


controller.hears(['hello','^hi$'],'direct_message,direct_mention,mention',function(bot, message) {
	var matches = message.text.match(/(hello|\bhi\b)/i);
	if(matches){
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
				var userNumber = message.user;
				bot.api.users.info({user:userNumber}, function(err, response) {
					if(err) {
						bot.botkit.log("ERROR!!!!", err);
					} else {
						//bot.botkit.log("SUCCESS!", response);
						bot.reply(message,'Hello ' + response.user.name + '!');
					}
				});
			}
		});
	}
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



controller.on('user_channel_join',function(bot,message) {
	var userNumber = message.user;
	bot.api.users.info({user:userNumber}, function(err, response) {
		if(err) {
			bot.botkit.log("ERROR!!!!", err);
		} else {
			bot.reply(message,'Welcome to the channel, @' + response.user.name + '!');
		}
	});
});

controller.on('user_channel_leave',function(bot,message) {
    bot.reply(message,'Goodbye, @' + message.user + '!');
});


controller.hears(['roll '],'direct_message,direct_mention,mention',function(bot, message) { 
	var matches = message.text.match(/roll d(\d+)/i);
	if(matches) {
		var numberOfSides = matches[1];
		var result = getRandomInt(1, numberOfSides);
		bot.reply(message,'Roll result: ' + result);
	} else {
		var matches = message.text.match(/roll (\d+)d(\d+)/i);
		if(matches) {
			var numberOfDice = matches[1];
			var numberOfSides = matches[2];
			for (i = 0; i < numberOfDice; i++) {
				var result = getRandomInt(1, numberOfSides);
				bot.reply(message,'Roll result #'+ i + ': ' + result);
			}
		}
	}
});

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
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
				case "youtube":
				case "yt":
				case "vid":
				  ytQuery(message, query);
					break;
				// default:
			}
		}
	}
	
	if(goodCommand === false) { //some sort of problem, throw error message
		// bot.reply(message,'There was a problem with your search.  Please try again.  _Hint - Use the following syntax: search $type_of_search $query_to_be_searched_');
	}
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


//https://www.npmjs.com/package/youtube-node
function ytQuery(message, query) {
  if (query) {
    youTube.search(query, 1, function(err, res) {
      if (err) {
        console.log('An error occured', err);
        bot.reply(message, "Sorry, can't do that.");
        return;
      }
      else {
        if(res.items[0] && res.items[0] != undefined) {
          console.log(JSON.stringify(res, null, 2));
          bot.reply(message, "https://youtube.com/watch?v="+res.items[0].id.videoId);
          return;
        }
      }
    });
  }
}