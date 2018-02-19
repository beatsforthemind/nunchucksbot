// token=<MY TOKEN> node bot.js

if(!process.env.token) {
    console.log('Error: Specify token in environment');
    process.exit(1);
}
process.title = 'chuckbot';

var botReady = false;
var Botkit = require(__dirname+'/node_modules/botkit/lib/Botkit.js');
var cheerio = require(__dirname+'/node_modules/cheerio');
var request = require(__dirname+'/node_modules/request');
var fs = require('fs');
var os = require('os');
var http = require('http');
var https = require('https');
var parseString = require('xml2js').parseString;
var util = require('util');
var minimist = require('minimist');
var child = require('child_process');
var spawn = require('child_process').spawn;
var ba = require('beeradvocate-api');
var keys = require(__dirname+'/keys.js');
var google = require('googleapis');
var customsearch = google.customsearch('v1');
var YouTube = require('youtube-node');
var youTube = new YouTube();
youTube.setKey(keys.gapi1.key);
youTube.addParam('type', 'video');

var apiFlip = 0;

var mysql = require('mysql');
var connection = mysql.createConnection({
  host : keys.dbparams.host,
  user : keys.dbparams.user,
  password : keys.dbparams.pw,
  database : keys.dbparams.db
});

var controller = Botkit.slackbot({
  debug: true,
  json_file_store: __dirname+'/dataDir'
});

/*
var bot = controller.spawn({
  token: process.env.token
}).startRTM();
*/

function doSetup() {
  // OPEN MYSQL CONNECION
  connection.connect();
  /*
  connection.query('SELECT * FROM spoilers', function (error, results, fields) {
    if (error) throw error;
    console.log('RESULTS: ', results[0]);
    console.log('RESULTS: ', results);
    
    if(results) {
      bot.say({
        text: "*SPOILERS TOPIC:* "+results[0].topic.toString(),
        channel: "C0ME9V49J"
      });
      bot.say({
        text: "*MESSAGE:* "+results[0].message.toString(),
        channel: "C0ME9V49J"
      });

      results.forEach(function(item) {
        bot.say({
          text: JSON.stringify(item).toString(),
          channel: "C0ME9V49J"
        });    
      });
    }
  });
  // connection.end();
  */
}

var bot = controller.spawn({
  token: process.env.token
}).startRTM(function() {
  botReady = true;
  doSetup();
});

// ########################################
// ########################################

/*
connection.connect();
connection.query('SELECT * FROM test', function (error, results, fields) {
  if (error) throw error;
  // console.log('RESULTS: ', results[0]);
  console.log('RESULTS: ', results);
  bot.say({
    text: "Hello World!",
    channel: "C0ME9V49J"
  });
});
connection.end();
*/

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


controller.hears(['uptime','identify yourself','who are you','what is your name','version'],'direct_message,direct_mention,mention',function(bot, message) {
    var hostname = os.hostname();
    var uptime = formatUptime(process.uptime());
		var revision = child.execSync('git rev-parse HEAD').toString().trim();
    bot.reply(message,':robot_face: I am a bot named <@' + bot.identity.name + '>. I have been running for ' + uptime + ' on ' + hostname + '. My current git revision is ' + revision);
});


controller.hears(['update yourself'],'direct_message,direct_mention,mention',function(bot, message) {	
	// child.execSync('sh ./start.sh');
	// spawn('sh', ['./start.sh']);
	var whoami = child.execSync('whoami').toString().trim();
	bot.reply(message, 'I AM: '+whoami);	
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
			bot.botkit.log("ERROR", err);
		} else {
			bot.reply(message,'Welcome to the channel, @' + response.user.name + '!');
		}
	});
});


/*
controller.on('user_channel_leave',function(bot,message) {
    bot.reply(message,'Goodbye, @' + message.user + '!');
});
*/


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


function searchBeer(message, query) {
  if (query) {    
    ba.beerSearch(query, function(beers) {
	    if(beers) {
		  	console.log(beers);
		  	var beerArr = JSON.parse(beers);
		  	if(beerArr[0]) {
			  	console.log(beerArr[0]);
			  	var baUrlBase = "https://www.beeradvocate.com";
			  	if(beerArr[0].brewery_name && beerArr[0].beer_name && beerArr[0].beer_url) {
				  	bot.reply(message, beerArr[0].brewery_name+": "+beerArr[0].beer_name+" "+baUrlBase+beerArr[0].beer_url);
			  	} else {
				  	bot.reply(message, query+": NOT FOUND");
			  	}
		  	} else {
			  	bot.reply(message, query+": NOT FOUND");
		  	}
	    } else {
		    bot.reply(message, query+": NOT FOUND");
	    }
		});
    console.log('##### RUNNING A BEER SEARCH #####');
  }
}


function bingNsfw(message, query) {
	if (message.channel == 'C0R2JTT7F') {
	if (query) {
		query = query + " porn";
		
		/*    
		const CX = keys.gapi1.cx;
		const API_KEY = keys.gapi1.key;
		*/
		
		if (apiFlip === 1) {
			// GOOGLE1
			CX = keys.gapi1.cx;
			API_KEY = keys.gapi1.key;
			apiFlip = 0;
		} else if (apiFlip === 0) {
			// GOOGLE2
			CX = keys.gapi2.cx;
			API_KEY = keys.gapi2.key;
			apiFlip++;
		}

		safeLevel = "off";

		customsearch.cse.list({ cx: CX, auth: API_KEY, q: query, searchType: "image", safe: "off"}, function (err, resp) {
			if (err) {
				console.log('An error occured', err);
				bot.reply(message, "ERROR: " + err);
				return;
			}
			if (resp.items && resp.items.length > 0) {
				/*
        if(resp.queries) {
					bot.reply(message, "DEBUG: " + JSON.stringify(resp.queries));
				}
				*/
				bot.reply(message, resp.items[getRandomInt(0, (resp.items.length - 1))].link);
				// bot.reply(message, resp.items[0].link);

				// console.log("Parameters are => CX: "+CX+", API_KEY: "+API_KEY+", query: "+query+", safe: "+safeLevel);
				return;
			} else {
				bot.reply(message, "SCROOGLED");
				return;
			}
		});
	} 
	} else {
		bot.reply(message, "This is a SFW locale, bro. Try again in #YOLO");
		return;
	}
}


controller.hears(['what\'s the current spoiler','whats the current spoiler','what\'s the spoiler topic','whats the spoiler topic','what\'s the spoiler','what is the spoiler','what is the current spoiler topic','what is the current spoiler'], 'direct_message,direct_mention,mention,ambient', function(bot, message) {
  connection.query('SELECT * FROM spoilers WHERE id = ?', [1], function (error, results, fields) {
    if(error) {
      bot.reply(message, "ERROR");
      // bot.reply(message, JSON.stringify(error).toString());
      console.log(error);
    }
    if(results) {
      // console.log(results);
      bot.reply(message, "<#"+keys.spoilers.roomid+"|spoilers> topic is *"+results[0].topic+"*");
    }
  });
});


controller.hears(['spoilerCmd (.*)'], 'direct_message,direct_mention,mention,ambient', function(bot, message) {
	var goodCommand = true; // set false if unable to parse
  var matches = message.text.match(/spoilerCmd (\S*)/i); // get the word immediately following "search"
  
	if(!matches && matches !== null) { // type wasn't found
		goodCommand = false;
	}
	
	if(goodCommand && typeof matches[1] != 'undefined') {
		var type = matches[1]; // select the right one from the resultant array
		var positionAfterType = message.text.indexOf(type) + type.length + 1;
		var query = message.text.substring(positionAfterType); // get everything after the "type" in the message, adding 1 to account for the space character following the type
      
		// if(query) { }
		switch(type.toLowerCase()) {
  		
			case "settopic":
  			if(query) {
  				// bot.reply(message, "SETTING TOPIC");
  			  // connection.connect();
          connection.query('UPDATE spoilers SET topic = ? WHERE id = ?', [query, 1], function (error, results, fields) {
            if(error) {
              bot.reply(message, "ERROR");
              console.log(error);
            }
            if(results) {
              // console.log(results);  
              // https://slack.com/api/channels.setTopic?token=TOKEN&channel=CHANNEL&topic=VAR
              var options = {
            		url: 'https://slack.com/api/channels.setTopic?token='+keys.chuck.token+'&channel='+keys.spoilers.roomid+'&topic='+query,
            	};
            	function requestCallback (error, response, html) {
            		if (!error && response.statusCode == 200) {
              		// bot.reply(message, "SUCCESS");
            		} else {
            	  }
            	}
            	request(options, requestCallback);
              bot.reply(message, "<#"+keys.spoilers.roomid+"|spoilers> topic is now: *"+query+"*");
            }
          });
        }
				break;
			
			case "gettopic":
				// bot.reply(message, "GETTING TOPIC");
			  // connection.connect();
        connection.query('SELECT * FROM spoilers WHERE id = ?', [1], function (error, results, fields) {
          if(error) {
            bot.reply(message, "ERROR");
            // bot.reply(message, JSON.stringify(error).toString());
            console.log(error);
          }
          if(results) {
            // console.log(results);
            bot.reply(message, "<#"+keys.spoilers.roomid+"|spoilers> topic is *"+results[0].topic+"*");
          }
        });
				break;
      
      case "setpurpose":
  			if(query) {
  				// bot.reply(message, "SETTING PURPOSE");
  			  // connection.connect();
          connection.query('UPDATE spoilers SET purpose = ? WHERE id = ?', [query, 1], function (error, results, fields) {
            if(error) {
              bot.reply(message, "ERROR");
              console.log(error);
            }
            if(results) {
              // console.log(results);  
              // https://slack.com/api/channels.setPurpose?token=TOKEN&channel=CHANNEL&purpose=VAR
              var options = {
            		url: 'https://slack.com/api/channels.setPurpose?token='+keys.chuck.token+'&channel='+keys.spoilers.roomid+'&purpose='+query,
            	};
            	function requestCallback (error, response, html) {
            		if (!error && response.statusCode == 200) {
              		// bot.reply(message, "SUCCESS");
            		} else {
            	  }
            	}
            	request(options, requestCallback);
              bot.reply(message, "<#"+keys.spoilers.roomid+"|spoilers> purpose is now: *"+query+"*");
            }
          });
        }
				break;
      
      case "getpurpose":
				// bot.reply(message, "GETTING PURPOSE");
			  // connection.connect();
        connection.query('SELECT * FROM spoilers WHERE id = ?', [1], function (error, results, fields) {
          if(error) {
            bot.reply(message, "ERROR");
            // bot.reply(message, JSON.stringify(error).toString());
            console.log(error);
          }
          if(results) {
            // console.log(results);
            bot.reply(message, "<#"+keys.spoilers.roomid+"|spoilers> purpose is *"+results[0].purpose+"*");
          }
        });
				break;
				
      // default:
      return;
		}
	}
	
	console.log("########## HEARD #spoilers ##########");
});


// CHANNEL_TOPIC HANDLER
controller.on('channel_topic', function(bot, message) {
  // bot.reply(message, "channel_topic event fired");
  // bot.reply(message, JSON.stringify(message).toString());
  // bot.reply(message, message.topic.toString());
  
  if(message.channel.toString() == keys.spoilers.roomid) {
    connection.query('UPDATE spoilers SET topic = ? WHERE id = ?', [message.topic, 1], function (error, results, fields) { 
      if(error) {
        bot.reply(message, "ERROR");
        console.log(error);
      }
      if(results) {
        // bot.reply(message, "DATABASE UPDATED: "+message.topic);
        console.log(results);
        
        bot.say({
          text: "<#"+keys.spoilers.roomid+"|spoilers> topic has been updated to: *"+message.topic+"* by <@"+message.user+">",
          channel: keys.general.roomid
        });
      }
    });
  }
});


// CHANNEL_TOPIC HANDLER
controller.on('channel_purpose', function(bot, message) {
  // bot.reply(message, "channel_purpose event fired");
  // bot.reply(message, JSON.stringify(message).toString());
  // bot.reply(message, message.purpose.toString());
  
  if(message.channel.toString() == keys.spoilers.roomid) {
    connection.query('UPDATE spoilers SET purpose = ? WHERE id = ?', [message.purpose, 1], function (error, results, fields) { 
      if(error) {
        bot.reply(message, "ERROR");
        console.log(error);
      }
      if(results) {
        // bot.reply(message, "DATABASE UPDATED: "+message.purpose);
        console.log(results);
        
        bot.say({
          text: "<#"+keys.spoilers.roomid+"|spoilers> purpose has been updated to: *"+message.purpose+"* by <@"+message.user+">",
          channel: keys.general.roomid
        });
      }
    });
  }
});


// this be the main search listener that delegates to other functions based on second "argument"
controller.hears(['search (.*)'], 'direct_message,direct_mention,mention,ambient', function(bot, message) {
	var goodCommand = true; // set false if unable to parse
  var matches = message.text.match(/search (\S*)/i); // get the word immediately following "search"
  
	if(!matches && matches !== null) { // type wasn't found
		goodCommand = false;
	}
	
	if(goodCommand && typeof matches[1] != 'undefined') {
		var type = matches[1]; // select the right one from the resultant array
		var positionAfterType = message.text.indexOf(type) + type.length + 1;
		var query = message.text.substring(positionAfterType); // get everything after the "type" in the message, adding 1 to account for the space character following the type
      
		if(!query) { // query wasn't found
			goodCommand = false;
		} else {
			switch(type.toLowerCase()) { // send query to proper function
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
				case "beer":
					searchBeer(message, query);
					break;
				case "value":
					valueQuery(message, query);
					break;
				case "meme":
					searchMeme(message, query);
				case "pf":
				case "pathfinder":
					pfQuery(message, query);	
				// default:
			}
		}
	}
	
	if(goodCommand === false) { // some sort of problem, throw error message
		// bot.reply(message,'There was a problem with your search.  Please try again.  _Hint - Use the following syntax: search $type_of_search $query_to_be_searched_');
	}
	
	console.log("########## HEARD SEARCH ##########");
});


function searchMeme(message, query) {
	var options = {
		url: 'http://knowyourmeme.com/search?q=' + query,
		headers: {
			'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.8; rv:24.0) Gecko/20100101 Firefox/24.0',
		}
	};
	function requestCallback (error, response, html) {
		if (!error && response.statusCode == 200) {
			var $ = cheerio.load(html);
			if($('.entry_list').length>0) {
				var firstResultURL = $('.entry_list .photo:first-child').attr('href');
				var fullURLToSend = 'http://knowyourmeme.com' + firstResultURL;
				bot.reply(message, fullURLToSend);
			} else {
				bot.reply(message, 'No results found');
			}
		} else {
			bot.reply(message, 'error searching internet: ' + response.statusCode);
		}
	}
	
	request(options, requestCallback);
}


// https://developers.google.com/custom-search/json-api/v1/reference/cse/list
function gImgQuery(message, query) {
  if (query) {
    
    /*    
    const CX = keys.gapi1.cx;
    const API_KEY = keys.gapi1.key;
    */ 

    if(apiFlip === 1) {
      // GOOGLE1
      CX = keys.gapi1.cx;
      API_KEY = keys.gapi1.key;
      apiFlip = 0;
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


function pfQuery(message, query) {
  if(query) {
    // http://www.d20pfsrd.com/ SEARCH
    CX = "006680642033474972217:6zo0hx_wle8";
    API_KEY = keys.gapi3.key;
    safeLevel = "off";
    
    customsearch.cse.list({ cx: CX, auth: API_KEY, q: query, safe: safeLevel, num: 3 }, function(err, resp) {
      if (err) {
        console.log('An error occured', err);
        bot.reply(message, "API Error");
        return;
      }
      if (resp.items && resp.items.length > 0) {
        bot.reply(message, resp.items[0].link);
        /*
        resp.items.forEach(function(element) {
          bot.reply(message, element.link);
        });
        */
        return;
      } else if(false) {
        // bot.reply(message, resp.items[0].link);
        return;
      } else {
        bot.reply(message, "No results");
        return;   
      }
    });
  } else {
  }
}


// https://www.npmjs.com/package/youtube-node
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


function valueQuery(message, query) {
	query = query.toLowerCase();
	if (query == "btc" || query == "bitcoin" || query == "currency btc" || query == "currency bitcoin") { // https://bitcoincharts.com/about/markets-api/
		var options = {
			host: 'min-api.cryptocompare.com',
			port: 443,
			path: '/data/price?fsym=BTC&tsyms=USD',
			headers: {
				accept: '*/*'
			}
		};
		
		var req = https.get(options, function (res) {
			// console.log('STATUS: ' + res.statusCode);
			// console.log('HEADERS: ' + JSON.stringify(res.headers));
			res.setEncoding('utf8');

			var resData = "";
			res.on('data', function (chunk) {
				resData += chunk;
			});

			res.on('end', function () {
				// console.log(req.data);
				// console.log(resData);

				var values = JSON.parse(resData);
				if (values !== null) {
					var btcValueText = values.USD;
					bot.reply(message, "BTC/USD: $" + Number(btcValueText));
				} else {
					console.log("No values returned");
				}
			});
		});

		req.on('error', function (e) {
			console.log('request error: ' + e.message);
		});

		req.on('error', function(e) {
			console.log('request error: ' + e.message);
		});
		
	} else if(query == "eth" || query == "ethereum" || query == "currency eth" || query == "currency ethereum") {
		var options = {
			host: 'min-api.cryptocompare.com',
			port: 443,
			path: '/data/price?fsym=ETH&tsyms=USD',
			headers: {
				accept: '*/*'
			}
		};
		
		var req = https.get(options, function(res) {
			// console.log('STATUS: ' + res.statusCode);
			// console.log('HEADERS: ' + JSON.stringify(res.headers));
			res.setEncoding('utf8');
			
			var resData = "";
			res.on('data', function (chunk) {
				resData += chunk;
			});
			
			res.on('end', function () {
			// console.log(req.data);
			// console.log(resData);
			
			var values = JSON.parse(resData);
			if(values !== null) {
				var ethValueText = values.USD;
				bot.reply(message, "ETH/USD: $" + Number(ethValueText));  
			} else {
				console.log("No values returned");
			}
			});    
		});

		req.on('error', function(e) {
			console.log('request error: ' + e.message);
		});
		
	} else if (query == "sc" || query == "sia" || query == "currency sc" || query == "currency sia") {
		var options = {
			host: 'min-api.cryptocompare.com',
			port: 443,
			path: '/data/price?fsym=SC&tsyms=USD',
			headers: {
				accept: '*/*'
			}
		};

		var req = https.get(options, function (res) {
			// console.log('STATUS: ' + res.statusCode);
			// console.log('HEADERS: ' + JSON.stringify(res.headers));
			res.setEncoding('utf8');

			var resData = "";
			res.on('data', function (chunk) {
				resData += chunk;
			});

			res.on('end', function () {
				// console.log(req.data);
				// console.log(resData);

				var values = JSON.parse(resData);
				if (values !== null) {
					var scValueText = values.USD;
					bot.reply(message, "SC/USD: $" + Number(scValueText));
				} else {
					console.log("No values returned");
				}
			});
		});

		req.on('error', function (e) {
			console.log('request error: ' + e.message);
		});

	} else if (query == "fct" || query == "factom" || query == "currency fct" || query == "currency factom") {
		var options = {
			host: 'min-api.cryptocompare.com',
			port: 443,
			path: '/data/price?fsym=FCT&tsyms=USD',
			headers: {
				accept: '*/*'
			}
		};

		var req = https.get(options, function (res) {
			// console.log('STATUS: ' + res.statusCode);
			// console.log('HEADERS: ' + JSON.stringify(res.headers));
			res.setEncoding('utf8');

			var resData = "";
			res.on('data', function (chunk) {
				resData += chunk;
			});

			res.on('end', function () {
				// console.log(req.data);
				// console.log(resData);

				var values = JSON.parse(resData);
				if (values !== null) {
					var fctValueText = values.USD;
					bot.reply(message, "FCT/USD: $" + Number(fctValueText));
				} else {
					console.log("No values returned");
				}
			});
		});

		req.on('error', function (e) {
			console.log('request error: ' + e.message);
		});

	} else if(query == "gnt" || query == "golem" || query == "currency gnt" || query == "currency golem") {
		var options = {
			host: 'min-api.cryptocompare.com',
			port: 443,
			path: '/data/price?fsym=GNT&tsyms=USD',
			headers: {
				accept: '*/*'
			}
		};
		
		var req = https.get(options, function(res) {
			// console.log('STATUS: ' + res.statusCode);
			// console.log('HEADERS: ' + JSON.stringify(res.headers));
			res.setEncoding('utf8');
			
			var resData = "";
			res.on('data', function (chunk) {
				resData += chunk;
			});
			
			res.on('end', function () {
			// console.log(req.data);
			// console.log(resData);
			
			var values = JSON.parse(resData);
			if(values !== null) {
				var ethValueText = values.USD;
				bot.reply(message, "GNT/USD: $" + Number(ethValueText));  
			} else {
				console.log("No values returned");
			}


			});    
		});

		req.on('error', function(e) {
			console.log('request error: ' + e.message);
		});
		
	} else if(query.startsWith("stock") || query.startsWith("nyse") || query.startsWith("nasdaq")) { // http://dev.markitondemand.com/MODApis
		var queryArray = query.split(" ");
		var stock = String(queryArray[1]).trim();
			var options = {
				host: 'dev.markitondemand.com',
				port: 80,
				path: '/MODApis/Api/v2/Quote/json?symbol=' + stock,
				headers: {
					accept: '*/*'
				}
			};
			
			var req = http.get(options, function(res) {
				res.setEncoding('utf8');
				
				var resData = "";
				res.on('data', function (chunk) {
					resData += chunk;
				});
				
				res.on('end', function () {
				// console.log(req.data);
				// console.log(resData);
				
				var values = JSON.parse(resData);

				if(values !== null && values !== undefined && !values.Message) {
					bot.reply(message, values.Name + " (" + values.Symbol + "): $" + Number(values.LastPrice).toFixed(2));  
				} else {
					bot.reply(message, "Can't find that stock.  Are you sure you have the right symbol?");
				}
			});
		});
	} else if(query == "currency usd" || query == "currency dollar" || currency == "currency dollars") {
		bot.reply(message, "USD/USD: $1.0000. Duh.");
	} else if(query == "currency stanley nickles" || query == "currency stanley nickels" || query == "currency schrute bucks") {
		bot.reply(message, "Stanley Nickels/Schrute Bucks: Equal to the ratio of unicorns to leprechauns");
	} else if(query == "currency pickles nickles" || query == "currency pickles nickels" || query == "currency pickles' nickels" || query == "currency pickle's nickels" || query == "currency pickles' nickles" || query == "currency pickle's nickles") {
		bot.reply(message, "Don't you remember being a little kids, when your teeths would fall out and grow back and you would get the old one under the pillow so the ancient Norse god Ortha the tooths collector would come and give you a Pickle's Nickel?");
	} else if(query.startsWith("currency") || query.startsWith("cur") || query.startsWith("curr") || query.startsWith("forex")) {
		var queryArray = query.split(" ");
		var currency = String(queryArray[1]).trim().toUpperCase();
		var options = {
				host: 'webrates.truefx.com',
				port: 80,
				path: '/rates/connect.html?f=csv&c=' + currency + '/USD',
				headers: {
					accept: '*/*'
				}
			};
			
			var req = http.get(options, function(res) {
				res.setEncoding('utf8');
				
				var resData = "";
				res.on('data', function (chunk) {
					resData += chunk;
				});
				
				res.on('end', function () {
				// console.log(req.data);
				// console.log(resData);
				
				var values = resData.split(",");

				if(values !== null && values.length < 11 && values.length > 1) {
					bot.reply(message, values[0] + ": $" + values[8]);  
				} else {
					bot.reply(message, ":money_mouth_face:");
				}
			});
		});
	} else {
		query = query.toUpperCase();
		if(query.indexOf(" ") > -1) { // if there are spaces, shit will break
			return;
		}
		var options = {
			host: 'min-api.cryptocompare.com',
			port: 443,
			path: '/data/price?fsym=' + query + '&tsyms=USD',
			headers: {
				accept: '*/*'
			}
		};

		var req = https.get(options, function (res) {
			// console.log('STATUS: ' + res.statusCode);
			// console.log('HEADERS: ' + JSON.stringify(res.headers));
			res.setEncoding('utf8');

			var resData = "";
			res.on('data', function (chunk) {
				resData += chunk;
			});

			res.on('end', function () {
				// console.log(req.data);
				// console.log(resData);

				var values = JSON.parse(resData);
				if (values !== null) {
					var ethValueText = values.USD;
					bot.reply(message, query + "/USD: $" + Number(ethValueText));
				} else {
					console.log("No values returned");
				}
			});
		});

		req.on('error', function (e) {
			console.log('request error: ' + e.message);
		});
	}
}


controller.hears(['whatis (.*)'], 'direct_message,direct_mention,mention,ambient', function(bot, message) {
	var goodCommand = true; // set false if unable to parse
  var matches = message.text.match(/whatis (\S*)/i); // get the word immediately following "search"
  
	if(!matches && matches !== null) { // type wasn't found
		goodCommand = false;
	}
	
	if(goodCommand && typeof matches[1] != 'undefined') {
		var word = matches[1];
		if(!word) {
			goodCommand = false;
		} else {
      dictGet(message, word);
		}
	}
	
	if(goodCommand === false) {
	}
	
	console.log("########## WORD ##########");
});


function dictGet(message, word) {
  var options = {
    host: 'owlbot.info',
    port: 443,
    path: '/api/v1/dictionary/'+word+'?format=json',
    headers: {
      accept: '*/*'
    }
  };
  
  var req = https.get(options, function(res) {
    // console.log('STATUS: ' + res.statusCode);
    // console.log('HEADERS: ' + JSON.stringify(res.headers));
    res.setEncoding('utf8');
    
    var resData = "";
    res.on('data', function (chunk) {
      resData += chunk;
    });
    
    res.on('end', function () {
      // console.log(req.data);
      // console.log(resData);
      
      var toText = new Array();
      resObject = JSON.parse(resData);
      
      if(resObject[0] !== null) {
        if(resObject && resObject[0]) {
          bot.reply(message, word.toUpperCase()+": "+resObject[0].defenition);  
          // bot.reply(message, util.inspect(resObject[0].defenition, {showHidden: false, depth: null}));  
        } else {
          bot.reply(message, "Haven't heard of that");
        }
      }
    });    
  });

  req.on('error', function(e) {
    console.log('request error: ' + e.message);
  });  
}


controller.hears(['addname (.*)'], 'direct_message,direct_mention,mention,ambient', function(bot, message) {
  console.log("heard addname");
  // var matches = message.text.match(/addname/i);
  
  var textPos = message.text.indexOf('addname') + 8;
  var command = message.text.substring(textPos); // get everything after the "type" in the message, adding 1 to account for the space character following the type
  console.log(command);
  
  // var args = minimist(process.argv.slice(2));
  var args = minimist(command);
  console.log(args);
});


controller.hears(['quesignifica (.*)', 'quésignifica (.*)'], 'direct_message,direct_mention,mention,ambient', function(bot, message) {
  var matches = message.text.match(/qu[eé]significa (\S*)/i); // get the word immediately following "search"
  
	request('http://www.asihablamos.com/word/palabra/' + matches[1] + '.php', function (error, response, html) {
		if (!error && response.statusCode == 200) {
			var $ = cheerio.load(html);
      if($('.pais').length>0) {
        //var firstResult = $('.pais').first()[0];
        //$('.pais').first(function(i, element){
          var country = $('.pais').first().children('h2').first().text();
          var definition = $('.definicion').first().children('div').first().next().text();
          var example = $('.definicion').first().find('.ejemplo').text();
          var result = {};
          result.country = country.trim();
          result.definition = definition.trim();
          result.example = example.trim();
          bot.reply(message, matches[1].toUpperCase()+ " " + result.country + ": " + result.definition + " \n\ne.g. " + result.example);  
			  //});
      } else {
        bot.reply(message, "No puedo encontrar esa palabra.");
      }
			
		} else {
      bot.reply(message, "¡Los tubos están caído!");
    }
	});
});
