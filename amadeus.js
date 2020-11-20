//Based on environment.
const botID = process.env.BOT_ID; //Bot ID used to check if been kicked. 
const GOOGLE_API = process.env.GOOGLE_API;
const token = process.env.BOT_TOKEN;
const dbRef = process.env.DB_REFERENCE;
const SERVICE_ACCOUNT =process.env.SERVICE_ACCOUNT;

const Discord = require('discord.js');
const client = new Discord.Client();

// const ytdl = require('ytdl-core-discord');
// const Youtube = require('simple-youtube-api');
// const youtube = new Youtube(GOOGLE_API);

//Database
// const admin = require('firebase-admin');
// admin.initializeApp({
//     credential: admin.credential.cert( JSON.parse(SERVICE_ACCOUNT) ),
//     databaseURL: "https://kurisudata.firebaseio.com"
// });
// var db=admin.database();
// var userRef=db.ref(dbRef);



const queue = new Map();
var playerStatus = false; //The player is false when not playing a song. Should be false when: No more songs playing, not in voice channel, paused, stopped
var repeat = false; //If true play current song, until set again.

//Used for stop,pause, and resume functionality to reach dispatcher
var events = require('events');
var eventHandler = new events.EventEmitter();

var textChannel; //Keep a reference to the text channel, the queueConstruct was created in. Used to display current song playing.

//If dispatcher errors out will try this many number of times before giving up.
const numberOfTriesAllowed = 10;
var tryThisManyTimes =numberOfTriesAllowed;

var currentSongPlayingMessage; //Contains a reference to the message that is sent to discored on every song play.

// var timeoutID; //NEW CODE

//const musicBot = require('./MusicBot.js');

// const {
//     degen,
//     steinGate,
// } = require('./playlist.json');

let musicbot = require("./objects/MusicBot");
let MusicBot = musicbot.MusicBot;
let musicBot = new MusicBot(GOOGLE_API,SERVICE_ACCOUNT,botID,dbRef);

/*************************************************************************************************************************************/
//What to do when receive Messages:
client.on('message', (message) => {
    if (message.author.bot) return;
    if (message.content.startsWith("-play")) {
        gatherDataOnOtherBots(message);
        return;
    }
    if (!message.content.startsWith("`")) return;

    const serverQueue = queue.get(message.guild.id);

    if (message.content.startsWith("`play")) {
        //execute(message, serverQueue);
        console.log("Let musicBot deal with play");
        musicBot.execute(message, serverQueue);
        return;
    } else if (message.content.startsWith("`skip")) {
        musicBot.skip(message);
        return;
    } else if (message.content.startsWith("`stop")) {
        console.log("Let musicBot deal with stop");
        musicBot.stop(message);
        return;
    } else if (message.content.startsWith("`song")) {
        message.channel.send("```"+musicBot.currentPlaying(message)+" is now playing!```" );
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
        //pause(message);
        console.log("Let musicBot deal with pause");
        musicBot.pause();
        return;
    }
    else if (message.content.startsWith("`resume")) {
        console.log("Let musicBot deal with resume");
        musicBot.resume();
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
client.on('messageReactionAdd', async (reaction, user) => {
    let message = reaction.message, emoji = reaction.emoji;
 
    if (user.bot) return; //Ignore reacts sent by the bot
    if (!message.author.bot) return; //Only process messages that are from the bot
    if (!playerStatus) return; //Should not do anything if the player isn't playing

    console.log("The user who sent the reaction is: "+user);

    if (emoji.name == '⏸') {
        console.log("user selected pause emoji");
        musicBot.pause();
    }
    else if (emoji.name == '▶️') {
        console.log("user selected play emoji");
        musicBot.resume();
    }
    else if (emoji.name == '🛑') {
        console.log("user selected stop emoji");
        musicBot.stop(message);
    }
    else if (emoji.name == '⏩') {
        console.log("user selected skip emoji");
        musicBot.skip(message);
    }
    else if (emoji.name == '🔄') {
        console.log("user selected repeat emoji");
        repeatSong(message, queue.get(message.guild.id) )
        reaction.remove(user);
        await currentSongPlayingMessage.react("🔄"); //Repeat is a special case. Need to regenerate after removing.
    }


});
// async function execute(message, serverQueue) {
//     log('Starting execute method.');
//     log('Checking my permissions.');
//     const voiceChannel = message.member.voice.channel;
//     if (!voiceChannel) return display(message, 'You need to be in a voice channel to play music!');
//     const permissions = voiceChannel.permissionsFor(message.client.user);
//     if (!permissions.has('CONNECT') || !permissions.has('SPEAK')) {
//         return display(message, 'I need the permissions to join and speak in your voice channel!');
//     }
//     log('Correct permissions received!');

//     log('Cleaning song argument');
//     const args = message.content.split(' ');
//     if (args[1] === undefined) {
//         log('No argument received.');
//         return;
//     }
//     const url = args[1].replace(/<(.+)>/g, '$1');
//     const searchString = args.slice(1).join(' ');

//     log('\targs: '+args+' \n\tURL: '+url+' \n\tsearchString: '+ searchString+'\nCleaned song argument.');
//     //Currently only allows one youtube video to play.
//     log('Attemping to gather information on video.');
//     try {
//         var video = await youtube.getVideo(url);
//     }
//     catch (error) {
//         log("This may not be a URL link: "+searchString);
//         log("Error: "+error.message);

//         try {
//             log("Attemping to search with arguments: "+searchString);
//             var videos = await youtube.searchVideos(searchString, 1);
//             var video = await youtube.getVideoByID(videos[0].id);
//             log("Video found: "+video.id);
//         }
//         catch (err) {
//             log("ERROR: No video found with this search string: " + searchString + '\nError: '+err.message);
//             display(message, 'No video found.');
//             return;
//         }
//     }

//     log("Generating song information");
//     const song = {
//         id: video.id,
//         title: video.title,
//         url: `https://www.youtube.com/watch?v=${video.id}`
//     };
//     log('\tsong.id: '+song.id+' \n\tsong.title: '+song.title+' \n\tsong.url: '+ song.url+"\nGenerated song information");

//     try{
//         DB_add(song);
//     }catch(error)
//     {
//         console.log("ERROR unable to update database.");
//     }
//     log('\tsong.id: '+song.id+' \n\tsong.title: '+song.title+' \n\tsong.url: '+ song.url+"\nGenerated song information");

//     log("Checking if a queue exists for this guild id: "+message.guild.id);
//     if (queue.get(message.guild.id) == null) {
//         log("\tqueue does not exist for this guild id: "+message.guild.id);
//         const queueContruct = {
//             textChannel: message.channel,
//             voiceChannel: voiceChannel,
//             connection: null,
//             songs: [],
//             volume: 5,
//             playing: true,
//         };
//         queue.set(message.guild.id, queueContruct);
//         log("\t\tQueue generated and set for this guild id: "+message.guild.id);

//         textChannel = message.channel;
//         log("Reference to the current text channel saved!");

//         queueContruct.songs.push(song);
//         log("\t\tSong added to queue: "+song.title);
//         display(message, song.title + " added to the queue!");

//         try{
//             //May be needed if song ends?
//             // voiceChannel.leave();
//             log('\t\tAttemping to join channel.');
//             var connection = await voiceChannel.join();
//             queueContruct.connection = connection;
//             log('\t\tChannel joined.');

//             log('\t\tAttemping to start player.');
//             //currentSongMessage = await message.channel.send("Currently Playing: "+song.title);
//             play(message.guild, queueContruct.songs[0]);
//         }catch(error){
//             log('ERROR: Unable to establish connection/play first song. '+error.message);
//             display(message,"Error detected.");
            
//             log('Performing clean up.');
//             queue.delete(message.guild.id);
//             voiceChannel.leave();
//         }
//     }
//     else{
//         log("\tqueue exists for this guild id: "+message.guild.id);
//         try {
//             log("\t\tAdding song to queue.");
//             const queueContruct = queue.get(message.guild.id);
//             if(queueContruct){
//                 queueContruct.songs.push(song);
                
//                 if(!playerStatus){
//                     log('\t\tAttemping to start player.');
//                     play(message.guild, queueContruct.songs[0]);
//                 }
//             }
//         }
//         catch (error) {
//             log("ERROR: Unable to add song to queue. " + error.message);
//             display(message, "Unable to add the video to queue.");
//         }
        
//         display(message, `${song.title} has been added to the queue!`);
//         return log('Finished execute method.');
//     }

//     // ytpl(url, async function (err, playlist) {
//     //     if (err) {
//     //         log('Single video found. Now attemping to gather information.');
//     //         try {
//     //             var video = await youtube.getVideo(url);
//     //             log("HERE");
//     //         }
//     //         catch (error) {
//     //             log("May not be a URL link: "+error.message);
//     //             try {
//     //                 var videos = await youtube.searchVideos(searchString, 1);
//     //                 log("HERE2");
//     //                 var video = await youtube.getVideoByID(videos[0].id);
//     //                 log("HERE3");
//     //             }
//     //             catch (err) {
//     //                 log("ERROR: No video found. Will now stop searching for a video from: " + url);
//     //                 display(message, 'No video found.');
//     //                 return;
//     //             }
//     //         }
//     //         const song = {
//     //             id: video.id,
//     //             title: video.title,
//     //             url: `https://www.youtube.com/watch?v=${video.id}`
//     //         };
//     //         log(song.title + "...has been added.");
//     //         //display(message, song.title + "...has been added.");
//     //         if (queue.get(message.guild.id) == null) {
//     //             log("Generating serverQueue..");
//     //             const queueContruct = {
//     //                 textChannel: message.channel,
//     //                 voiceChannel: voiceChannel,
//     //                 connection: null,
//     //                 songs: [],
//     //                 volume: 5,
//     //                 playing: true,
//     //             };

//     //             queue.set(message.guild.id, queueContruct);
//     //             queueContruct.songs.push(song);
//     //             display(message, song.title + "...has been added.");

//     //             try {
//     //                 voiceChannel.leave();
//     //                 log('Trying to join channel.');
//     //                 var connection = await voiceChannel.join();
//     //                 log('Channel joined.');
//     //                 queueContruct.connection = connection;

//     //                 play(message.guild, queueContruct.songs[0]);
//     //             } catch (err) {
//     //                 log('ERROR: Unable to establish connection and play first song. '+err);
//     //                 queue.delete(message.guild.id);
//     //                 return display(message, err);
//     //             }
//     //         } else {
//     //             try {
//     //                 serverQueue.songs.push(song);
//     //                 if (!currentPlaying) {
//     //                     //WHY LEAVE?
//     //                     //voiceChannel.leave();
//     //                     log('Trying to join channel.');
//     //                     var connection = await voiceChannel.join();
//     //                     log('Channel joined.');
//     //                     serverQueue.connection = connection;
//     //                     play(message.guild, serverQueue.songs[0]);
//     //                 }
//     //             }
//     //             catch (err) {
//     //                 log("ERROR: Unable to add song to queue. " + err);
//     //                 display(message, "Unable to add the video to queue.");
//     //                 return;
//     //             }
//     //             return display(message, `${song.title} has been added to the queue!`);
//     //         }
//     //     }
//     //     else {
//     //         //Start playlist from current song, don't care bout before songs
//     //         log("Playlist detected: " + url);
//     //         //!serverQueue  The conditio nwas this
//     //         //BUG: When add playlist, `stop, add playlist the !serverQueue is never hit
//     //         if ( queue.get(message.guild.id) == null) {
//     //             log('Bot is not playing.. will add new playlist songs to queue.');
//     //             const queueContruct = {
//     //                 textChannel: message.channel,
//     //                 voiceChannel: voiceChannel,
//     //                 connection: null,
//     //                 songs: [],
//     //                 volume: 5,
//     //                 playing: true,
//     //             };

//     //             queue.set(message.guild.id, queueContruct);

//     //             playlist['items'].forEach(function (item, index) {
//     //                 try {
//     //                     //log(item);
//     //                     if (item['duration']) {
//     //                         const song = {
//     //                             id: item['id'],
//     //                             title: item['title'],
//     //                             url: `https://www.youtube.com/watch?v=${item.id}`
//     //                         };
//     //                         queueContruct.songs.push(song);
//     //                     }
//     //                 } catch (err) {
//     //                     log(err);
//     //                 }

//     //             });
//     //             display(message, `**${playlist['title']}** playlist has been added to the queue!`);
//     //             //shuffle(message, queueContruct);
//     //             try {
//     //                 //NEW CODE
//     //                 //WHY LEAVE?
//     //                 //voiceChannel.leave();
//     //                 log('Trying to join channel.');
//     //                 var connection = await voiceChannel.join();
//     //                 log('Channel joined.');
//     //                 //END NEW CODE
//     //                 queueContruct.connection = connection;
//     //                 play(message.guild, queueContruct.songs[0]);
//     //             } catch (err) {
//     //                 log("ERROR: Playlist/Joining, playing first playlist song.");
//     //                 display(message, 'I am unable to join, or start the music...');
//     //                 queue.delete(message.guild.id);
//     //                 return display(message, err);
//     //             }

//     //         } else {
//     //             log('Bot is playing.. will add new playlist songs to queue.');
//     //             playlist['items'].forEach(function (item, index) {
//     //                 if (item['duration']) {
//     //                     const song = {
//     //                         id: item['id'],
//     //                         title: item['title'],
//     //                         url: `https://www.youtube.com/watch?v=${item.id}`
//     //                     };
//     //                     serverQueue.songs.push(song);
//     //                 }
//     //             });
//     //             display(message, `**${playlist['title']}** playlist has been added to the queue!`);

//     //         }

//     //     }
//     // });
   

//     log('Finished execute method.');

// }

function repeatSong(message, serverQueue) {
    log("Starting repeatSong method.");
    try{
        if(playerStatus){
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
        }
        else{
            log("Confirmed player is off. Refusing to emit repeat event.");
            display(message, "There is nothing to repeat as the player is not playing.");
        }
    }catch(error){
        log("Error with repeatSong method: "+error.message);
        display(message, "Problem with repeat functionality.");
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
async function gatherDataOnOtherBots(message){
    log('Starting gatherDataOnOtherBots method.');

    log('Cleaning argument.');
    const args = message.content.split(' ');
    if (args[1] === undefined) {
        log('No argument received.');
        return;
    }
    log('Args: '+args);
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

    try{
        DB_add(song);
    }catch(error)
    {
        console.log("ERROR unable to update database.");
    }
    log('\tsong.id: '+song.id+' \n\tsong.title: '+song.title+' \n\tsong.url: '+ song.url+"\nGenerated song information");
    console.log("Song information added to database.");
}
function DB_add(obj){
    console.log("Updating database with new song information.");
    var one = userRef.child(obj.id);
    var count =1;
    console.log("Scanning database for song ID: "+obj.id);

    //Check if url exists already in database if so just increment count by 1 otherwise 0
    one.once("value", function(snapshot) {
        //If it does exist it will return a snapshot.val().url with correct URL otherwise.. it will contain null
        console.log("Database found: "+snapshot.val() );
        if(snapshot.val() ){
            console.log("It exists in the database.");
            console.log("Current count is: "+snapshot.val().count);

            if( snapshot.val().count > 0 ){
                console.log("Increasing count of count by 1:"+snapshot.val().count);
                count = snapshot.val().count +1
                console.log("count is now set to: "+count);
            }
        }
        else{ //Null goes here
            console.log("It does not exist in the database. Defaulting count to 1.");
        }
        var newData = {
            id: obj.id,
            title: obj.title,
            url: obj.url,
            count: count
        }
        //console.log("newData is: "+ newData);
        var two = userRef.child(obj.id);
        //Updates the Database
        console.log("Updating database with new data: "+newData);
        two.update(newData,(err)=>{
            if(err){
                console.log("Error with update: "+err)
            }
            else{
                console.log("Song added to database.")
            }
        });
    });
}


/*************************************************************************************************************************************/
//When application starts do this:
client.on('ready', () => {
    log('Bot is ready...Awaiting Input!');
    client.user.setActivity(". For help: `help"); 
});

client.login(token);


/*
 * REFERENCES:
 * https://discord.js.org/#/docs/main/12.1.1/topics/voice
 * 
 * 
*/