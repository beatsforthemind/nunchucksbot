// token=<MY TOKEN> node bot.js

if (!process.env.token) {
    console.log('Error: Specify token in environment');
    process.exit(1);
}
process.title = 'chuckbot';

var Botkit = require(__dirname+'/node_modules/botkit/lib/Botkit.js');
var cheerio = require(__dirname+'/node_modules/cheerio');
var request = require(__dirname+'/node_modules/request');
var fs = require('fs');
var os = require('os');

var util = require('util');

var minimist = require('minimist');
var keys = require(__dirname+'/keys.js');
var apiFlip = 0;

var google = require('googleapis');
var customsearch = google.customsearch('v1');

var YouTube = require('youtube-node');
var youTube = new YouTube();
youTube.setKey(keys.gapi1.key);
youTube.addParam('type', 'video');

var Bing = require('node-bing-api')({ accKey: keys.bing.key });

var mysql      = require('mysql');
var connection = mysql.createConnection({
    host     : keys.database.host,
    user     : keys.database.user,
  	password : keys.database.password,
  	database : keys.database.database
});

var controller = Botkit.slackbot({
  debug: true,
  json_file_store: __dirname+'/dataDir'
});


var bot = controller.spawn({
  token: process.env.token
}).startRTM();


controller.hears(['moon man', 'microbrew', 'hopalicious', 'pure hoppiness', 'ghost ship', 'fat squirrel', 'karben4', 'ale asylum', 'new glarus'],'message_received,ambient,mention',function(bot, message) {
  console.log("########## HEARD GOOD BEER ##########");
  
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
  console.log("########## HEARD BAD BEER ##########");
  
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
						bot.botkit.log("ERROR", err);
					} else {
						//bot.botkit.log("SUCCESS", response);
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


function bingSafe(message, query) {
  if (query) {
    
    Bing.images(query, {
      market: 'en-US',
      skip: 0,
      top: 1,
      adult: 'Medium',
        imageFilters: {
          size: 'Medium'
        }
      }, function(error, res, body) {
      // console.log(util.inspect(body, {showHidden: false, depth: null}));
      if(body && body.d && body.d.results && body.d.results[0] && body.d.results[0].MediaUrl) {
        bot.reply(message, body.d.results[0].MediaUrl);
      } else {
        // TRY WITH GOOGLE
        apiFlip++;
        gImgQuery(message, query);
      }
    });
    
    console.log('##### RUNNING A SAFE BING #####');
  }
}

function bingNsfw(message, query) {
  if (query) {
    
    Bing.images(query, {
      market: 'en-US',
      skip: 0,
      top: 1,
      adult: 'Off',
        imageFilters: {
          size: 'Medium'
        }
      }, function(error, res, body) {
      // console.log(util.inspect(body, {showHidden: false, depth: null}));
      if(body && body.d && body.d.results && body.d.results[0] && body.d.results[0].MediaUrl) {
        bot.reply(message, body.d.results[0].MediaUrl);
      } else {
        bot.reply(message, "BING BONG");
      }
    });
    
    console.log('##### RUNNING A NSFW BING #####');
  }
}



//this be the main search listener that delegates to other functions based on second "argument"
controller.hears(['search (.*)'], 'direct_message,direct_mention,mention,ambient', function(bot, message) {
	var goodCommand = true; //set false if unable to parse
  var matches = message.text.match(/search (\S*)/i); //get the word immediately following "search"
  
	if(!matches && matches !== null) { //type wasn't found
		goodCommand = false;
	}
	
	if(goodCommand && typeof matches[1] != 'undefined') {
		var type = matches[1]; //select the right one from the resultant array
		var positionAfterType = message.text.indexOf(type) + type.length + 1;
		var query = message.text.substring(positionAfterType); //get everything after the "type" in the message, adding 1 to account for the space character following the type
      
		if(!query) { //query wasn't found
			goodCommand = false;
		} else {
			switch(type.toLowerCase()) { //send query to proper function
  			case "img":
				case "image":
				case "images":
				  gImgQuery(message, query);
					// bingSafe(message, query);
					break;
				case "nsfw":
					bingNsfw(message, query);
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
	
	console.log("########## HEARD SEARCH ##########");
});

//https://developers.google.com/custom-search/json-api/v1/reference/cse/list
function gImgQuery(message, query) {
  if (query) {
    
    /*    
    const CX = keys.gapi1.cx;
    const API_KEY = keys.gapi1.key;
    */ 

    if(apiFlip === 2) {
      // RUN BING SAFE
      bingSafe(message, query);
      apiFlip = 0;
      return;
    } else if(apiFlip === 1) {
      // GOOGLE1
      CX = keys.gapi1.cx;
      API_KEY = keys.gapi1.key;
      apiFlip++;
    } else if(apiFlip === 0) {
      // RUN GOOGLE2
      CX = keys.gapi2.cx;
      API_KEY = keys.gapi2.key;
      apiFlip++;
    }
    
    safeLevel = "medium";
    
    customsearch.cse.list({ cx: CX, auth: API_KEY, q: query, searchType: "image", safe: safeLevel, imgSize: "large" }, function(err, resp) {
      if (err) {
        console.log('An error occured', err);
        bot.reply(message, "SCROOGLED");
        return;
      }
      if (resp.items && resp.items.length > 0) {
        bot.reply(message, resp.items[getRandomInt(0, (resp.items.length - 1))].link);
        // bot.reply(message, resp.items[0].link);
        
        // console.log("Parameters are => CX: "+CX+", API_KEY: "+API_KEY+", query: "+query+", safe: "+safeLevel);
        return;
      } else {
        bot.reply(message, "SCROOGLED");
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


controller.hears(['addname (.*)'], 'direct_message,direct_mention,mention,ambient', function(bot, message) {
  console.log("heard addname");
  // var matches = message.text.match(/addname/i);
  
  var textPos = message.text.indexOf('addname') + 8;
  var command = message.text.substring(textPos); //get everything after the "type" in the message, adding 1 to account for the space character following the type
  console.log(command);
  
  // var args = minimist(process.argv.slice(2));
  var args = minimist(command);
  console.log(args);


  /*
  // var matches = message.text.match(/addname (\S*)/i); // get the word immediately following "addname"
  console.log("matches below");
  console.log(matches);
  
  var type = matches[1]; //select the right one from the resultant array
  var positionAfterType = message.text.indexOf(type) + type.length + 1;
  var query = message.text.substring(positionAfterType); //get everything after the "type" in the message, adding 1 to account for the space character following the type
  */
  /*
  for (var i = 0, len = matches.length; i < len; i++) {
    console.log(matches[i]);
  }
  */
  // var array = string.split(',');
});

/*
var sql = "INSERT INTO users (email, name, created, password_hash) " +
"VALUES (?, ?,  NOW(), ?)";
	var inserts = [data.email, data.name, hash];
sql = mysql.format(sql, inserts);
console.log(inserts);
console.log(sql);

connection.query(sql, function(err, result) {
	if (err) throw err;

	console.log(result);
	res.sendFile(__dirname + '/www/dbtest.html')
	res.end();
});
*/
