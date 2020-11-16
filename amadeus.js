const Discord = require('discord.js');
const client = new Discord.Client();


const ytdl = require('ytdl-core-discord');
//const ytpl = require('ytpl');

const Youtube = require('simple-youtube-api');

//Based on environment.
const botID = process.env.BOT_ID; //Bot ID used to check if been kicked. 
const GOOGLE_API = process.env.GOOGLE_API;
const token = process.env.BOT_TOKEN;

const youtube = new Youtube(GOOGLE_API);

const queue = new Map();
var playerStatus = false; //The player is false when not playing a song. Should be false when: No more songs playing, not in voice channel, paused, stopped
var repeat = false; //If true play current song, until set again.

//Used for stop,pause, and resume functionality to reach dispatcher
var events = require('events');
var eventHandler = new events.EventEmitter();

var textChannel; //Keep a reference to the text channel, the queueConstruct was created in. Used to display current song playing.

//var currentSongMessage =""; //Contains a reference to the message that updates every time play runs.

// var timeoutID; //NEW CODE

//const musicBot = require('./MusicBot.js');

// const {
//     degen,
//     steinGate,
// } = require('./playlist.json');

/*************************************************************************************************************************************/
//When application starts do this:
client.on('ready', () => {
    log('Bot is ready...Awaiting Input!');
    client.user.setActivity(". For help: `help"); 
});

/*************************************************************************************************************************************/
//What to do when receive Messages:
client.on('message', (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith("`")) return;

    const serverQueue = queue.get(message.guild.id);

    if (message.content.startsWith("`play")) {
        execute(message, serverQueue);
        return;
    } else if (message.content.startsWith("`skip")) {
        skip(message, serverQueue);
        return;
    } else if (message.content.startsWith("`stop")) {
        stop(message, serverQueue);
        return;
    } else if (message.content.startsWith("`song")) {
        currentPlaying(message, serverQueue);
        return;
    }
    else if (message.content.startsWith("`repeat")) {
        repeatSong(message, serverQueue);
        return;
    }
    else if (message.content.startsWith("`queue")) {
        getQueue(message, serverQueue);
        return;
    }
    else if (message.content.startsWith("`degen")) {
        message.content = '`play ' + degen;
        execute(message, serverQueue);
        return;
    }
    else if (message.content.startsWith("`shuffle")) {
        shuffle(message, serverQueue);
        return;
    }
    else if (message.content.startsWith("`pause")) {
        pause(message);
        return;
    }
    else if (message.content.startsWith("`resume")) {
        resume(message);
        return;
    }
    else if (message.content.startsWith("`help")) {
        log("User requested help.");
        display(message,'```You can currently use the following commands: \n\
            \`play [URL/Text to Search] \n\
            \`skip -Skips current song in queue \n\
            \`stop -Removes all song in queue \n\
            \`song -Displays current song \n\
            \`repeat -Repeat current song until this command is inputted again \n\
            \`queue -Displays current queue of songs \n\
            \`shuffle -Shuffles queue of songs \n\
            \`degen -Plays degenerate playlist \n\
            \`pause -Pauses the current song \n\
            \`resume -Will resume music```');
        return;
    }
    else {
        display(message, 'You need to enter a valid command!')
    }
});
async function execute(message, serverQueue) {
    log('Starting execute method.');
    log('Checking my permissions.');
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) return display(message, 'You need to be in a voice channel to play music!');
    const permissions = voiceChannel.permissionsFor(message.client.user);
    if (!permissions.has('CONNECT') || !permissions.has('SPEAK')) {
        return display(message, 'I need the permissions to join and speak in your voice channel!');
    }
    log('Correct permissions received!');

    log('Cleaning song argument');
    const args = message.content.split(' ');
    if (args[1] === undefined) {
        log('No argument received.');
        return;
    }
    const url = args[1].replace(/<(.+)>/g, '$1');
    const searchString = args.slice(1).join(' ');

    log('\targs: '+args+' \n\tURL: '+url+' \n\tsearchString: '+ searchString+'\nCleaned song argument.');
    //Currently only allows one youtube video to play.
    log('Attemping to gather information on video.');
    try {
        var video = await youtube.getVideo(url);
    }
    catch (error) {
        log("This may not be a URL link: "+searchString);
        log("Error: "+error.message);

        try {
            log("Attemping to search with arguments: "+searchString);
            var videos = await youtube.searchVideos(searchString, 1);
            var video = await youtube.getVideoByID(videos[0].id);
            log("Video found: "+video.id);
        }
        catch (err) {
            log("ERROR: No video found with this search string: " + searchString + '\nError: '+err.message);
            display(message, 'No video found.');
            return;
        }
    }

    log("Generating song information");
    const song = {
        id: video.id,
        title: video.title,
        url: `https://www.youtube.com/watch?v=${video.id}`
    };
    log('\tsong.id: '+song.id+' \n\tsong.title: '+song.title+' \n\tsong.url: '+ song.url+"\nGenerated song information");

    log("Checking if a queue exists for this guild id: "+message.guild.id);
    if (queue.get(message.guild.id) == null) {
        log("\tqueue does not exist for this guild id: "+message.guild.id);
        const queueContruct = {
            textChannel: message.channel,
            voiceChannel: voiceChannel,
            connection: null,
            songs: [],
            volume: 5,
            playing: true,
        };
        queue.set(message.guild.id, queueContruct);
        log("\t\tQueue generated and set for this guild id: "+message.guild.id);

        textChannel = message.channel;
        log("Reference to the current text channel saved!");

        queueContruct.songs.push(song);
        log("\t\tSong added to queue: "+song.title);
        display(message, song.title + " added to the queue!");

        try{
            //May be needed if song ends?
            // voiceChannel.leave();
            log('\t\tAttemping to join channel.');
            var connection = await voiceChannel.join();
            queueContruct.connection = connection;
            log('\t\tChannel joined.');

            log('\t\tAttemping to start player.');
            //currentSongMessage = await message.channel.send("Currently Playing: "+song.title);
            play(message.guild, queueContruct.songs[0]);
        }catch(error){
            log('ERROR: Unable to establish connection/play first song. '+error.message);
            display(message,"Error detected.");
            
            log('Performing clean up.');
            queue.delete(message.guild.id);
            voiceChannel.leave();
        }
    }
    else{
        log("\tqueue exists for this guild id: "+message.guild.id);
        try {
            log("\t\tAdding song to queue.");
            const queueContruct = queue.get(message.guild.id);
            if(queueContruct){
                queueContruct.songs.push(song);
                
                if(!playerStatus){
                    log('\t\tAttemping to start player.');
                    play(message.guild, queueContruct.songs[0]);
                }
            }
        }
        catch (error) {
            log("ERROR: Unable to add song to queue. " + error.message);
            display(message, "Unable to add the video to queue.");
        }
        
        display(message, `${song.title} has been added to the queue!`);
        return log('Finished execute method.');
    }

    // ytpl(url, async function (err, playlist) {
    //     if (err) {
    //         log('Single video found. Now attemping to gather information.');
    //         try {
    //             var video = await youtube.getVideo(url);
    //             log("HERE");
    //         }
    //         catch (error) {
    //             log("May not be a URL link: "+error.message);
    //             try {
    //                 var videos = await youtube.searchVideos(searchString, 1);
    //                 log("HERE2");
    //                 var video = await youtube.getVideoByID(videos[0].id);
    //                 log("HERE3");
    //             }
    //             catch (err) {
    //                 log("ERROR: No video found. Will now stop searching for a video from: " + url);
    //                 display(message, 'No video found.');
    //                 return;
    //             }
    //         }
    //         const song = {
    //             id: video.id,
    //             title: video.title,
    //             url: `https://www.youtube.com/watch?v=${video.id}`
    //         };
    //         log(song.title + "...has been added.");
    //         //display(message, song.title + "...has been added.");
    //         if (queue.get(message.guild.id) == null) {
    //             log("Generating serverQueue..");
    //             const queueContruct = {
    //                 textChannel: message.channel,
    //                 voiceChannel: voiceChannel,
    //                 connection: null,
    //                 songs: [],
    //                 volume: 5,
    //                 playing: true,
    //             };

    //             queue.set(message.guild.id, queueContruct);
    //             queueContruct.songs.push(song);
    //             display(message, song.title + "...has been added.");

    //             try {
    //                 voiceChannel.leave();
    //                 log('Trying to join channel.');
    //                 var connection = await voiceChannel.join();
    //                 log('Channel joined.');
    //                 queueContruct.connection = connection;

    //                 play(message.guild, queueContruct.songs[0]);
    //             } catch (err) {
    //                 log('ERROR: Unable to establish connection and play first song. '+err);
    //                 queue.delete(message.guild.id);
    //                 return display(message, err);
    //             }
    //         } else {
    //             try {
    //                 serverQueue.songs.push(song);
    //                 if (!currentPlaying) {
    //                     //WHY LEAVE?
    //                     //voiceChannel.leave();
    //                     log('Trying to join channel.');
    //                     var connection = await voiceChannel.join();
    //                     log('Channel joined.');
    //                     serverQueue.connection = connection;
    //                     play(message.guild, serverQueue.songs[0]);
    //                 }
    //             }
    //             catch (err) {
    //                 log("ERROR: Unable to add song to queue. " + err);
    //                 display(message, "Unable to add the video to queue.");
    //                 return;
    //             }
    //             return display(message, `${song.title} has been added to the queue!`);
    //         }
    //     }
    //     else {
    //         //Start playlist from current song, don't care bout before songs
    //         log("Playlist detected: " + url);
    //         //!serverQueue  The conditio nwas this
    //         //BUG: When add playlist, `stop, add playlist the !serverQueue is never hit
    //         if ( queue.get(message.guild.id) == null) {
    //             log('Bot is not playing.. will add new playlist songs to queue.');
    //             const queueContruct = {
    //                 textChannel: message.channel,
    //                 voiceChannel: voiceChannel,
    //                 connection: null,
    //                 songs: [],
    //                 volume: 5,
    //                 playing: true,
    //             };

    //             queue.set(message.guild.id, queueContruct);

    //             playlist['items'].forEach(function (item, index) {
    //                 try {
    //                     //log(item);
    //                     if (item['duration']) {
    //                         const song = {
    //                             id: item['id'],
    //                             title: item['title'],
    //                             url: `https://www.youtube.com/watch?v=${item.id}`
    //                         };
    //                         queueContruct.songs.push(song);
    //                     }
    //                 } catch (err) {
    //                     log(err);
    //                 }

    //             });
    //             display(message, `**${playlist['title']}** playlist has been added to the queue!`);
    //             //shuffle(message, queueContruct);
    //             try {
    //                 //NEW CODE
    //                 //WHY LEAVE?
    //                 //voiceChannel.leave();
    //                 log('Trying to join channel.');
    //                 var connection = await voiceChannel.join();
    //                 log('Channel joined.');
    //                 //END NEW CODE
    //                 queueContruct.connection = connection;
    //                 play(message.guild, queueContruct.songs[0]);
    //             } catch (err) {
    //                 log("ERROR: Playlist/Joining, playing first playlist song.");
    //                 display(message, 'I am unable to join, or start the music...');
    //                 queue.delete(message.guild.id);
    //                 return display(message, err);
    //             }

    //         } else {
    //             log('Bot is playing.. will add new playlist songs to queue.');
    //             playlist['items'].forEach(function (item, index) {
    //                 if (item['duration']) {
    //                     const song = {
    //                         id: item['id'],
    //                         title: item['title'],
    //                         url: `https://www.youtube.com/watch?v=${item.id}`
    //                     };
    //                     serverQueue.songs.push(song);
    //                 }
    //             });
    //             display(message, `**${playlist['title']}** playlist has been added to the queue!`);

    //         }

    //     }
    // });
   

    log('Finished execute method.');

}

function skip(message, serverQueue) {
    log('Starting skip method.');
    try {
        if (!message.member.voice.channel) return display(message, 'You have to be in a voice channel to stop the music!');
        if (!serverQueue) return display(message, 'There is no song that I could skip!');
        log("Now skipping current song.");
        serverQueue.connection.dispatcher.end();
        display(message, 'Skipping the current song!');
    }
    catch (err) {
        log("ERROR: Unable to skip current song! " + err);
        display(message, 'Unable to skip current song.');
    }
    log('Finished skip method.');
    
}

function stop(message, serverQueue) {
    log('Entering stop function.');
    try {
        if (!message.member.voice.channel) return display(message, 'You have to be in a voice channel to stop the music!');
        if(!serverQueue) return log('No need to clean any resources.');;
        log('Beginning to clean up unused resources.');

        log('Setting player status to false.');
        playerStatus = false;

        log('Setting repeat to false.');
        repeat = false;

        log('Attempting to leave voice channel.');
        serverQueue.voiceChannel.leave();

        log('Clearing all songs in the queue.');
        serverQueue.songs = [];

        log('Requesting that the current song end.');
        eventHandler.emit('stop'); 

        log('Deleting connection');
        queue.delete(message.guild.id);

        display(message, 'Stop requested.');
        log('Completed clean up for unused resources.');
    }
    catch (err) {
        log('ERROR: Unable to stop the music. ' + err.message);
        display(message, 'Stop requested. But Unable to complete request.');
    }
    log('Finished Stop function.');
}

async function play(guild, song) {
    log("Starting play method.");
    const serverQueue = queue.get(guild.id);

    if (!song) {
        log('No more songs left to play. Changing player status to false.');
        playerStatus = false;
        // timeoutID = setTimeout(function () {
        //     log('Waited long enough, now exiting...');
        //     serverQueue.voiceChannel.leave();
        //     queue.delete(guild.id);
        // }, 50000);
        // log("Initiated time out ");
        return;
    }

    log(song.title + ' is now playing!');
    textChannel.send('```'+song.title + ' is now playing!```');
    

    log("Changing status of playerStatus from: "+playerStatus+"\n\tto True.");
    playerStatus = true;

    //currentSongMessage.edit("Currently Playing: "+song.title);

    //Do I need to encapsulate this in a try block?
    const dispatcher = serverQueue.connection.play(await ytdl(song.url, { filter: format => ['251'],highWaterMark: 1 << 25 }), { type: 'opus' })
        .on('finish', () => {
            log("Current song ended.");
            if (serverQueue.voiceChannel.members.array().length <= 1
                || serverQueue.voiceChannel.members.get(botID) === undefined) {
                log("No one in voice but me Or...I've been disconnected. Clearing Resources.");
                //Maybe only need to call stop method?
                serverQueue.voiceChannel.leave();
                queue.delete(guild.id);
                log('Resources cleared.');
                return;
            }

            log("Repeating is currently: "+repeat);
            if (!repeat) {
                log('Repeat is off! Attempting to play next song.');
                serverQueue.songs.shift();
            }
            else{
                log('Repeat is on! Attempting to play same song.');
            }
            play(guild, serverQueue.songs[0]);
        })
        .on('error', error => {
            log("Error in dispatcher: "+error.message);
        });

    log('Setting song volume to 50%');
    dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
  
    log('Listening for stop events.');
    eventHandler.on('stop', function () {
        log("Destroying connection.");
        dispatcher.end();
    });

    log('Listening for pause events.');
    eventHandler.on('pause', function () {
        log("Pausing player.");
        dispatcher.pause();
    });

    log('Listening for resume events.');
    eventHandler.on('resume', function () {
        log("Resuming player.");
        dispatcher.resume();
    });
    log("Finished play method.");
}
function currentPlaying(message, serverQueue) {
    log("Starting currentPlaying method.");
    try{
        display(message, 'Currently Playing...' + serverQueue.songs[0].title);
        log('Currently Playing...' + serverQueue.songs[0].title);
    }
    catch(error){
        display(message, 'Nothing is playing.');
        log('Either nothing is playing or error is: ' +error.message);
    }
    log("Finishing currentPlaying method.");
}
function repeatSong(message, serverQueue) {
    log("Starting repeatSong method.");
    if (repeat) {
        log("End Repeat of Current Song: "+serverQueue.songs[0].title);
        repeat = false;
        display(message, 'Requested to stop repeating: ' + serverQueue.songs[0].title);
    }
    else {
        log("Repeating Current Song: "+serverQueue.songs[0].title);
        repeat = true;
        display(message, 'Repeating...' + serverQueue.songs[0].title + ' until `repeat command is used again.');
    }
    log("Finishing repeatSong method.");
}

function getQueue(message, serverQueue) {
    log("Starting getQueue method");
    try {
        var q = "";
        for (var i = 0; i < serverQueue.songs.length; i++) {
            if (i == 0) {
                q += '[Currently Playing] ' + serverQueue.songs[i].title + '\n';
            }
            else {
                q += '[' + i + '] ' + serverQueue.songs[i].title + '\n';
            }
            if (i == 10) {
                q += '[...' + serverQueue.songs.length+' more]\n';
                break;
            }
        }
        display(message, '```Current Queue:\n' + q + '```');
    }
    catch (err) {
        log("Error: Trying to get Queue: "+err.message);
        display(message, "Queue is Empty");
    }
}
function shuffle(message, serverQueue) {
    display(message,"Currently is not working.");
    log("Shuffle was called.");
    // try {
    //     for (let i = serverQueue.songs.length - 1; i > 0; i--) {
    //         const j = Math.floor(Math.random() * i);
    //         if (j == 0) {
    //             continue;
    //         }
    //         const temp = serverQueue.songs[i];
    //         serverQueue.songs[i] = serverQueue.songs[j];
    //         serverQueue.songs[j] = temp;
    //     }
    //     display(message, "Queue has been shuffled.");
    //     log("Queue shuffling completed.");
    // }
    // catch (err) {
    //     log("ERROR: Unable to shuffle");
    //     display(message, "There was a problem shuffling.");
    // }
}
function display(message, text) {
    try {
        message.channel.send(text);
        log("Display this message in discord: "+ text);
    }
    catch (err) {
        log("ERROR: Unable to add quote.");
    }
    return;
}
function pause(message) {
    log("Requesting player pause.");
    try {
        eventHandler.emit('pause'); 
        display(message, "The player has been paused.");

    }
    catch (error) {
        log("ERROR: Trying to pause music. "+error.message);
    }
    return;
    
}
function resume(message) {
    log("Requesting player to resume.");
    try {
        eventHandler.emit('resume');

        // log('Setting player status to false.');
        // playerStatus = false;

        display(message, "The player will now resume.");
    }
    catch (error) {
        log("ERROR: Trying to resume music.");
    }
    
    return;
}
function log(msg){
    var DateTime = new Date();
    var hours = DateTime.getHours() % 12;
    var minutes = DateTime.getMinutes();
    var seconds = DateTime.getSeconds();
    if(hours<10){
        hours = '0'+hours;
    }
    if(minutes<10){
        minutes = '0'+minutes;
    }
    if(seconds<10){
        seconds = '0'+seconds;
    }
    console.log(hours + ':' + minutes  + ':'+seconds+' |'+msg);
}

client.login(token);


/*
 * REFERENCES:
 * https://discord.js.org/#/docs/main/12.1.1/topics/voice
 * 
 * 
*/