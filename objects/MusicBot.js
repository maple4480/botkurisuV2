class MusicBot {
    constructor(GOOGLE_API, botID) {
        //this.ytdl = require('ytdl-core-discord'); 4/16/2021
        this.ytdl = require('ytdl-core');
        const Youtube = require('simple-youtube-api');
        this.youtube = new Youtube(GOOGLE_API);

        this.botID=botID;

        //Database
        // const admin = require('firebase-admin');
        // admin.initializeApp({
        //     credential: admin.credential.cert(JSON.parse(SERVICE_ACCOUNT)),
        //     databaseURL: "https://kurisudata.firebaseio.com"
        // });
        // this.db = admin.database();
        // this.userRef = this.db.ref(dbRef);

        this.queue = new Map();
        this.playerStatus = false; //The player is false when not playing a song. Should be false when: No more songs playing, not in voice channel, paused, stopped
        this.repeat = false; //If true play current song, until set again.


        //Used for stop,pause, and resume functionality to reach dispatcher
        this.events = require('events');
        this.eventHandler = new this.events.EventEmitter();

        this.textChannel; //Keep a reference to the text channel, the queueConstruct was created in. Used to display current song playing.


        //If dispatcher errors out will try this many number of times before giving up.
        this.numberOfTriesAllowed = 10;
        this.tryThisManyTimes = this.numberOfTriesAllowed;

        this.currentSongPlayingMessage; //Contains a reference to the message that is sent to discored on every song play.

    }
    async execute(message) {
        console.log('Starting execute method.');
        console.log('Checking my permissions.');
        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel)
            return message.channel.send( 'You need to be in a voice channel to play music!');
        const permissions = voiceChannel.permissionsFor(message.client.user);
        if (!permissions.has('CONNECT') || !permissions.has('SPEAK')) {
            return message.channel.send( 'I need the permissions to join and speak in your voice channel!');
        }
        console.log('Correct permissions received!');

        const song = await this.getSongInfo(message);
        //Add song to db later
        try {
            if(this.db != undefined){
                console.log("Database was set.. attempting to update.");
                this.db.addSong(song);
            } 
            else{
                console.log("Database was not defined.");
            }
        } catch (error) {
            console.log("ERROR unable to update database.");
        }
        console.log('\tsong.id: ' + song.id + ' \n\tsong.title: ' + song.title + ' \n\tsong.url: ' + song.url + "\nGenerated song information");

        console.log("Checking if a queue exists for this guild id: " + message.guild.id);
        if (this.queue.get(message.guild.id) == null) {
            console.log("\tqueue does not exist for this guild id: " + message.guild.id);
            const queueContruct = {
                textChannel: message.channel,
                voiceChannel: voiceChannel,
                connection: null,
                songs: [],
                volume: 5,
                playing: true,
            };
            this.queue.set(message.guild.id, queueContruct);
            console.log("\t\tQueue generated and set for this guild id: " + message.guild.id);

            this.textChannel = message.channel;
            console.log("Reference to the current text channel saved!");

            queueContruct.songs.push(song);
            console.log("\t\tSong added to queue: " + song.title);
            message.channel.send( song.title + " added to the queue!");

            try {
                console.log('\t\tAttemping to join channel.');
                var connection = await voiceChannel.join();
                queueContruct.connection = connection;
                console.log('\t\tChannel joined.');

                console.log('\t\tAttemping to start player.');
                //currentSongMessage = await message.channel.send("Currently Playing: "+song.title);
                this.play(message.guild, queueContruct.songs[0]);
            } catch (error) {
                console.log('ERROR: Unable to establish connection/play first song. ' + error.message);
                message.channel.send( "Error detected.");

                console.log('Performing clean up.');
                this.queue.delete(message.guild.id);
                voiceChannel.leave();
            }
        }
        else {
            console.log("\tqueue exists for this guild id: " + message.guild.id);
            try {
                console.log("\t\tAdding song to queue.");
                const queueContruct = this.queue.get(message.guild.id);
                if (queueContruct) {
                    queueContruct.songs.push(song);

                    if (!this.playerStatus) {
                        console.log('\t\tAttemping to start player.');
                        this.play(message.guild, queueContruct.songs[0]);
                    }
                }
            }
            catch (error) {
                console.log("ERROR: Unable to add song to queue. " + error.message);
                message.channel.send( "Unable to add the video to queue.");
            }

            message.channel.send( `${song.title} has been added to the queue!`);
        }
        

        // ytpl(url, async function (err, playlist) {
        //     if (err) {
        //         console.log('Single video found. Now attemping to gather information.');
        //         try {
        //             var video = await youtube.getVideo(url);
        //             console.log("HERE");
        //         }
        //         catch (error) {
        //             console.log("May not be a URL link: "+error.message);
        //             try {
        //                 var videos = await youtube.searchVideos(searchString, 1);
        //                 console.log("HERE2");
        //                 var video = await youtube.getVideoByID(videos[0].id);
        //                 console.log("HERE3");
        //             }
        //             catch (err) {
        //                 console.log("ERROR: No video found. Will now stop searching for a video from: " + url);
        //                 message.channel.send( 'No video found.');
        //                 return;
        //             }
        //         }
        //         const song = {
        //             id: video.id,
        //             title: video.title,
        //             url: `https://www.youtube.com/watch?v=${video.id}`
        //         };
        //         console.log(song.title + "...has been added.");
        //         //message.channel.send( song.title + "...has been added.");
        //         if (queue.get(message.guild.id) == null) {
        //             console.log("Generating serverQueue..");
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
        //             message.channel.send( song.title + "...has been added.");
        //             try {
        //                 voiceChannel.leave();
        //                 console.log('Trying to join channel.');
        //                 var connection = await voiceChannel.join();
        //                 console.log('Channel joined.');
        //                 queueContruct.connection = connection;
        //                 play(message.guild, queueContruct.songs[0]);
        //             } catch (err) {
        //                 console.log('ERROR: Unable to establish connection and play first song. '+err);
        //                 queue.delete(message.guild.id);
        //                 return message.channel.send( err);
        //             }
        //         } else {
        //             try {
        //                 serverQueue.songs.push(song);
        //                 if (!currentPlaying) {
        //                     //WHY LEAVE?
        //                     //voiceChannel.leave();
        //                     console.log('Trying to join channel.');
        //                     var connection = await voiceChannel.join();
        //                     console.log('Channel joined.');
        //                     serverQueue.connection = connection;
        //                     play(message.guild, serverQueue.songs[0]);
        //                 }
        //             }
        //             catch (err) {
        //                 console.log("ERROR: Unable to add song to queue. " + err);
        //                 message.channel.send( "Unable to add the video to queue.");
        //                 return;
        //             }
        //             return message.channel.send( `${song.title} has been added to the queue!`);
        //         }
        //     }
        //     else {
        //         //Start playlist from current song, don't care bout before songs
        //         console.log("Playlist detected: " + url);
        //         //!serverQueue  The conditio nwas this
        //         //BUG: When add playlist, `stop, add playlist the !serverQueue is never hit
        //         if ( queue.get(message.guild.id) == null) {
        //             console.log('Bot is not playing.. will add new playlist songs to queue.');
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
        //                     //console.log(item);
        //                     if (item['duration']) {
        //                         const song = {
        //                             id: item['id'],
        //                             title: item['title'],
        //                             url: `https://www.youtube.com/watch?v=${item.id}`
        //                         };
        //                         queueContruct.songs.push(song);
        //                     }
        //                 } catch (err) {
        //                     console.log(err);
        //                 }
        //             });
        //             message.channel.send( `**${playlist['title']}** playlist has been added to the queue!`);
        //             //shuffle(message, queueContruct);
        //             try {
        //                 //NEW CODE
        //                 //WHY LEAVE?
        //                 //voiceChannel.leave();
        //                 console.log('Trying to join channel.');
        //                 var connection = await voiceChannel.join();
        //                 console.log('Channel joined.');
        //                 //END NEW CODE
        //                 queueContruct.connection = connection;
        //                 play(message.guild, queueContruct.songs[0]);
        //             } catch (err) {
        //                 console.log("ERROR: Playlist/Joining, playing first playlist song.");
        //                 message.channel.send( 'I am unable to join, or start the music...');
        //                 queue.delete(message.guild.id);
        //                 return message.channel.send( err);
        //             }
        //         } else {
        //             console.log('Bot is playing.. will add new playlist songs to queue.');
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
        //             message.channel.send( `**${playlist['title']}** playlist has been added to the queue!`);
        //         }
        //     }
        // });
        console.log('Finished execute method.');
    }
    setDB(database){
        console.log("Setting database.");
        this.db = database;
    }
    async getSongInfo(message){ //When calling need to: await getSongInfo(message)
        console.log('Cleaning song argument of: ');
        const args = message.content.split(' ');
        if (args[1] === undefined) {
            console.log('No argument received.');
            return;
        }
        const url = args[1].replace(/<(.+)>/g, '$1');
        const searchString = args.slice(1).join(' ');

        console.log('\targs: ' + args + ' \n\tURL: ' + url + ' \n\tsearchString: ' + searchString + '\nCleaned song argument.');
        //Currently only allows one youtube video to play.
        console.log('Attemping to gather information on video.');
        try {
            var video = await this.youtube.getVideo(url);
        }
        catch (error) {
            console.log("This may not be a URL link: " + searchString);
            console.log("Error: " + error.message);

            try {
                console.log("Attemping to search with arguments: " + searchString);
                var videos = await this.youtube.searchVideos(searchString, 1);
                var video = await this.youtube.getVideoByID(videos[0].id);
                console.log("Video found: " + video.id);
            }
            catch (err) {
                console.log("ERROR: No video found with this search string: " + searchString + '\nError: ' + err.message);
                message.channel.send( 'No video found.');
                return;
            }
        }

        console.log("Generating song information");
        const song = {
            id: video.id,
            title: video.title,
            url: `https://www.youtube.com/watch?v=${video.id}`
        };
        return song;
    }
    
    async play(guild, song) {
        console.log("Starting play method.");
        const serverQueue = this.queue.get(guild.id);

        if (!song) {
            console.log('No more songs left to play. Changing player status to false.');
            //No more songs clear resources but do not leave channel
            this.queue.delete(guild.id);
            //Test this:
            // if(this.currentSongPlayingMessage){
            //     this.currentSongPlayingMessage.reactions.removeAll().catch(error => console.error('Failed to clear reactions: ', error));
            // }
            return;
        }

        console.log(song.title + ' is now playing!');

        if (this.numberOfTriesAllowed == this.tryThisManyTimes) {
            console.log("Sending currently playing song to discord ONCE.");
            this.currentSongPlayingMessage = await this.textChannel.send('```' + song.title + ' is now playing!```');
            if (this.repeat) {
                this.currentSongPlayingMessage.edit('```🔄' + serverQueue.songs[0].title + ' is now playing!```');
            }

        }


        console.log("Changing status of playerStatus from: " + this.playerStatus + "\n\tto True.");
        this.playerStatus = true;

        //Put in try to try to stop: Error: Error parsing info: Unable to retrieve video metadata
        //Add filter in ytdl(): Error with dispatcher: Status code: 429
        //https://www.youtube.com/watch?v=uUbTdVZxjig&ab_channel=Yozohhh2014CH13 is not working?
        try {
            const dispatcher = serverQueue.connection.play(await this.ytdl(song.url, {
                filter: format => ['251'],
                quality: 'highestaudio',
                highWaterMark: 1 << 25
            }), { type: 'opus' })
                .on('finish', () => {
                    console.log("Current song ended.");
                    this.currentSongPlayingMessage.edit('```' + song.title + ' is finished.```');
                    this.currentSongPlayingMessage.reactions.removeAll().catch(error => console.error('Failed to clear reactions: ', error));

                    console.log("Checking if anyone is in voice channel: "+serverQueue.voiceChannel.members.array().length);
                    console.log("Checking if I am still in voice channel: "+serverQueue.voiceChannel.members.get(this.botID));

                    if (serverQueue.voiceChannel.members.array().length <= 1
                        || serverQueue.voiceChannel.members.get(this.botID) === undefined) {
                        console.log("Delete queue and leave since no one is in the voice channel.");
                        //Maybe only need to call stop method?
                        serverQueue.voiceChannel.leave();
                        this.queue.delete(guild.id);
                        console.log('Resources cleared.');
                        return;
                    }

                    console.log("Repeating is currently: " + this.repeat);
                    if (!this.repeat) {
                        console.log('Repeat is off! Attempting to play next song.');
                        serverQueue.songs.shift();
                    }
                    else {
                        console.log('Repeat is on! Attempting to play same song.');
                        this.currentSongPlayingMessage.edit('```' + song.title + ' is repeating. Playing again!```');
                    }
                    this.play(guild, serverQueue.songs[0]);
                })
                .on('error', error => {
                    console.log("Error in dispatcher: " + error.message);
                });

            console.log('Setting song volume to 50%');
            dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);

            console.log('Resetting eventHandler to listen to new events.');
            this.eventHandler = new this.events.EventEmitter(); //Reset eventHandler so all previous .on() will not work.

            console.log('Listening for stop events.');
            this.eventHandler.on('stop', function () {
                console.log("Destroying connection.");
                dispatcher.end();
            });
            console.log('Listening for pause events.');
            this.eventHandler.on('pause', function () {
                console.log("Entering real pause.");
                dispatcher.pause();
            });
            console.log('Listening for resume events.');
            this.eventHandler.on('resume', function () {
                console.log("Resuming player.");
                dispatcher.resume();
            });
        } catch (error) {
            console.log("Error with dispatcher: " + error.message);
            if (this.tryThisManyTimes > 0) {
                this.tryThisManyTimes = this.tryThisManyTimes - 1;
                console.log("Problem with dispatcher will try again. Number of tries remaining: " + this.tryThisManyTimes);
                this.play(guild, song);

            }
            else {
                console.log("Out of tries to play dispatcher.");
                this.currentSongPlayingMessage.edit('```' + song.title + ' is having issues playing. Skipping to next song!```');

                //Try to play next song.
                this.tryThisManyTimes = this.numberOfTriesAllowed;
                serverQueue.songs.shift();
                this.play(guild, serverQueue.songs[0]);
            }
        }

        if (this.numberOfTriesAllowed == this.tryThisManyTimes) {
            //Put set up reacts here so the player can start playing music FIRST
            try {
                console.log("Trying to set up reacts");
                console.log("React: Trying to set up Pause");
                await this.currentSongPlayingMessage.react("⏸");
                console.log("React: Trying to set up Stop");
                await this.currentSongPlayingMessage.react("🛑");
                console.log("React: Trying to set up Skip");
                await this.currentSongPlayingMessage.react("⏩");
                console.log("React: Trying to set up Repeat");
                await this.currentSongPlayingMessage.react("🔄");
            } catch (error) {
                console.log("Problem with reacts: " + error.message);
            }
        }

        console.log("Finished play method.");
    }
    async pause() {
        console.log("Requesting player pause.");
        try {
            if(this.playerStatus){
                console.log("Confirmed player has been turned on. Now emitting the pause event.");
                this.eventHandler.emit('pause'); 
                this.currentSongPlayingMessage.edit('```The player has been paused.```');
                this.currentSongPlayingMessage.reactions.removeAll().catch(error => console.error('Failed to clear reactions: ', error));
                try {
                    console.log("Trying to set up reacts");
                    console.log("React: Trying to set up Play");
                    await this.currentSongPlayingMessage.react("▶️");
                    console.log("React: Trying to set up Stop");
                    await this.currentSongPlayingMessage.react("🛑");
                    console.log("React: Trying to set up Skip");
                    await this.currentSongPlayingMessage.react("⏩");
                    console.log("React: Trying to set up Repeat");
                    await this.currentSongPlayingMessage.react("🔄");
                } catch (error) {
                    console.log("Problem with reacts: " + error.message);
                }
            }
            else{
                console.log("Confirmed player is off. Refusing to emit pause event.");
                this.currentSongPlayingMessage.edit("There is nothing to pause as the player is not playing.");
            }
        }
        catch (error) {
            console.log("ERROR: Trying to pause music. "+error.message);
        }
        return;
    }
    async resume(message){
        console.log("Requesting player to resume.");
        try {
            if(this.playerStatus){
                const serverQueue = this.queue.get(message.guild.id);
                console.log("Confirmed player has been turned on. Now emitting the resume event.");
                this.eventHandler.emit('resume'); 
                this.currentSongPlayingMessage.edit("```The player will now resume.```");
                this.currentSongPlayingMessage.reactions.removeAll().catch(error => console.error('Failed to clear reactions: ', error));
                try {
                    console.log("Trying to set up reacts");
                    console.log("React: Trying to set up Pause");
                    await this.currentSongPlayingMessage.react("⏸");
                    console.log("React: Trying to set up Stop");
                    await this.currentSongPlayingMessage.react("🛑");
                    console.log("React: Trying to set up Skip");
                    await this.currentSongPlayingMessage.react("⏩");
                    console.log("React: Trying to set up Repeat");
                    await this.currentSongPlayingMessage.react("🔄");
                } catch (error) {
                    console.log("Problem with reacts: " + error.message);
                }

            }
            else{
                console.log("Confirmed player is off. Refusing to emit resume event.");
            }
        }
        catch (error) {
            log("ERROR: Trying to resume music.");
        }
        return;
    }
    //Consider moving common code to its own function and creating a stop and leave method.
    stop(message) {
        console.log('Entering stop function.');

        const serverQueue = this.queue.get(message.guild.id);

        try {
            if (!message.member.voice.channel) return message.channel.send('You have to be in a voice channel to stop the music!');
            if(!serverQueue) return console.log('No need to clean any resources.');
            console.log('Beginning to clean up unused resources.');

            //Remove this and put into leave method
            console.log('Attempting to leave voice channel.');
            serverQueue.voiceChannel.leave();

            console.log('Requesting that the current song end.');
            this.eventHandler.emit('stop'); 

            console.log('Clearing reactions.');
            this.currentSongPlayingMessage.reactions.removeAll().catch(error => console.error('Failed to clear reactions: ', error));

            console.log('Setting player status to false.');
            this.playerStatus = false;

            console.log('Setting repeat to false.');
            this.repeat = false;

            console.log('Clearing all songs in the queue.');
            serverQueue.songs = [];

            console.log('Resetting eventHandler to listen to new events.');
            this.eventHandler = new this.events.EventEmitter(); //Reset eventHandler so all previous .on() will not work.

            console.log('Deleting connection');
            this.queue.delete(message.guild.id);

            console.log('Completed clean up for unused resources.');
        }
        catch (err) {
            console.log('ERROR: Unable to stop the music. ' + err.message);
            message.channel.send('Stop requested. But Unable to complete request.');
        }
        console.log('Finished Stop function.');
    }
    currentPlaying(message) {
        console.log("Starting currentPlaying method.");
        var currentSong;
        try{
            const serverQueue = this.queue.get(message.guild.id);
            console.log('Currently Playing...' + serverQueue.songs[0].title);
            currentSong = serverQueue.songs[0].title;
        }
        catch(error){
            console.log('Either nothing is playing or error is: ' +error.message);
            currentSong= 'Nothing is playing.';
        }
        console.log("Finishing currentPlaying method.");
        return currentSong;
    }
    //Returns sucesss msg or why it couldn't skip 
    skip(message) {
        console.log('Starting skip method.');
        var returnMsg ="";
        try {
            const serverQueue = this.queue.get(message.guild.id);
            if (!message.member.voice.channel) return 'You have to be in a voice channel to stop the music!';
            if (!serverQueue) return 'There is no song that I could skip!';
    
            console.log('Setting repeat to false.');
            this.repeat = false;
    
            console.log("Now skipping current song.");
            serverQueue.connection.dispatcher.end();
            returnMsg = 'Skipping the current song!';
        }
        catch (err) {
            console.log("ERROR: Unable to skip current song! " + err.message);
            returnMsg= 'Unable to skip current song.';
        }
        console.log('Finished skip method.');
        return returnMsg;
    }
    playerStatus(){
        console.log("Sending current player status of: "+this.playerStatus);
        return this.playerStatus;
    }
    async repeatSong(message) {
        console.log("Starting repeatSong method.");
        try{
            const serverQueue = this.queue.get(message.guild.id);
            if(this.playerStatus){ 
                if (this.repeat) {
                    console.log("End Repeat of Current Song: "+serverQueue.songs[0].title);
                    this.repeat = false;
                    this.currentSongPlayingMessage.edit('```' + serverQueue.songs[0].title + ' is now playing!```');
                }
                else {
                    console.log("Repeating Current Song: "+serverQueue.songs[0].title);
                    this.repeat = true;
                    this.currentSongPlayingMessage.edit('```🔄' + serverQueue.songs[0].title + ' is now playing!```');
                }
                await this.currentSongPlayingMessage.react("🔄");
            }
            else{
                console.log("Confirmed player is off. Refusing to emit repeat event.");
                message.channel.send("There is nothing to repeat as the player is not playing.");
            }
        }catch(error){
            console.log("Error with repeatSong method: "+error.message);
            message.channel.send("Problem with repeat functionality.");
        }
        
        console.log("Finishing repeatSong method.");
    }

    getQueue(message) {
        console.log("Starting getQueue method");
        try {
            const serverQueue = this.queue.get(message.guild.id);
            var q = "";
            for (var i = 0; i < serverQueue.songs.length; i++) {
                if (i == 0) {
                    q += '[▶️] ' + serverQueue.songs[i].title + '\n';
                }
                else {
                    q += '[' + i + '] ' + serverQueue.songs[i].title + '\n';
                }
                if (i == 10) {
                    q += '[...' + serverQueue.songs.length+' more]\n';
                    break;
                }
            }
            console.log('Current Queue:\n' + q + '');
            return 'Current Queue:\n' + q ;
        }
        catch (err) {
            console.log("Error: Trying to get Queue: "+err.message);
            return "Queue is Empty";
        }
    }
    shuffle(message) {
        message.channel.send("Currently is not working.");
        console.log("Shuffle was called.");
        // try {
        //     const serverQueue = this.queue.get(message.guild.id);
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
}

//export MusicBot so other modules can use
exports.MusicBot = MusicBot;