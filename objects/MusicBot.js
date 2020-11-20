

class MusicBot {
    constructor(GOOGLE_API, SERVICE_ACCOUNT, botID, dbRef) {
        const ytdl = require('ytdl-core-discord');
        const Youtube = require('simple-youtube-api');
        this.youtube = new Youtube(GOOGLE_API);

        //Database
        const admin = require('firebase-admin');
        admin.initializeApp({
            credential: admin.credential.cert(JSON.parse(SERVICE_ACCOUNT)),
            databaseURL: "https://kurisudata.firebaseio.com"
        });
        var db = admin.database();
        var userRef = db.ref(dbRef);

        const queue = new Map();
        var playerStatus = false; //The player is false when not playing a song. Should be false when: No more songs playing, not in voice channel, paused, stopped
        var repeat = false; //If true play current song, until set again.


        //Used for stop,pause, and resume functionality to reach dispatcher
        var events = require('events');
        var eventHandler = new events.EventEmitter();

        var textChannel; //Keep a reference to the text channel, the queueConstruct was created in. Used to display current song playing.


        //If dispatcher errors out will try this many number of times before giving up.
        const numberOfTriesAllowed = 10;
        var tryThisManyTimes = numberOfTriesAllowed;

        var currentSongPlayingMessage; //Contains a reference to the message that is sent to discored on every song play.

    }
    async execute(message, serverQueue) {
        log('Starting execute method.');
        log('Checking my permissions.');
        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel)
            return display(message, 'You need to be in a voice channel to play music!');
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

        log('\targs: ' + args + ' \n\tURL: ' + url + ' \n\tsearchString: ' + searchString + '\nCleaned song argument.');
        //Currently only allows one youtube video to play.
        log('Attemping to gather information on video.');
        try {
            var video = await youtube.getVideo(url);
        }
        catch (error) {
            log("This may not be a URL link: " + searchString);
            log("Error: " + error.message);

            try {
                log("Attemping to search with arguments: " + searchString);
                var videos = await youtube.searchVideos(searchString, 1);
                var video = await youtube.getVideoByID(videos[0].id);
                log("Video found: " + video.id);
            }
            catch (err) {
                log("ERROR: No video found with this search string: " + searchString + '\nError: ' + err.message);
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
        log('\tsong.id: ' + song.id + ' \n\tsong.title: ' + song.title + ' \n\tsong.url: ' + song.url + "\nGenerated song information");

        try {
            DB_add(song);
        } catch (error) {
            console.log("ERROR unable to update database.");
        }
        log('\tsong.id: ' + song.id + ' \n\tsong.title: ' + song.title + ' \n\tsong.url: ' + song.url + "\nGenerated song information");

        log("Checking if a queue exists for this guild id: " + message.guild.id);
        if (queue.get(message.guild.id) == null) {
            log("\tqueue does not exist for this guild id: " + message.guild.id);
            const queueContruct = {
                textChannel: message.channel,
                voiceChannel: voiceChannel,
                connection: null,
                songs: [],
                volume: 5,
                playing: true,
            };
            queue.set(message.guild.id, queueContruct);
            log("\t\tQueue generated and set for this guild id: " + message.guild.id);

            textChannel = message.channel;
            log("Reference to the current text channel saved!");

            queueContruct.songs.push(song);
            log("\t\tSong added to queue: " + song.title);
            display(message, song.title + " added to the queue!");

            try {
                //May be needed if song ends?
                // voiceChannel.leave();
                log('\t\tAttemping to join channel.');
                var connection = await voiceChannel.join();
                queueContruct.connection = connection;
                log('\t\tChannel joined.');

                log('\t\tAttemping to start player.');
                //currentSongMessage = await message.channel.send("Currently Playing: "+song.title);
                play(message.guild, queueContruct.songs[0]);
            } catch (error) {
                log('ERROR: Unable to establish connection/play first song. ' + error.message);
                display(message, "Error detected.");

                log('Performing clean up.');
                queue.delete(message.guild.id);
                voiceChannel.leave();
            }
        }
        else {
            log("\tqueue exists for this guild id: " + message.guild.id);
            try {
                log("\t\tAdding song to queue.");
                const queueContruct = queue.get(message.guild.id);
                if (queueContruct) {
                    queueContruct.songs.push(song);

                    if (!playerStatus) {
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

    async play(guild, song) {
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

        if (numberOfTriesAllowed == tryThisManyTimes) {
            log("Awaiting currently playing song message to send in discord.");
            currentSongPlayingMessage = await textChannel.send('```' + song.title + ' is now playing!```');
            log("Trying to set up reacts");
            try {
                log("React: Trying to set up Pause");
                await currentSongPlayingMessage.react("⏸");
                log("React: Trying to set up Stop");
                await currentSongPlayingMessage.react("🛑");
                log("React: Trying to set up Skip");
                await currentSongPlayingMessage.react("⏩");
                log("React: Trying to set up Repeat");
                await currentSongPlayingMessage.react("🔄");
            } catch (error) {
                log("Problem with reacts: " + error.message);
            }

        }


        log("Changing status of playerStatus from: " + playerStatus + "\n\tto True.");
        playerStatus = true;

        //Put in try to try to stop: Error: Error parsing info: Unable to retrieve video metadata
        //Add filter in ytdl(): Error with dispatcher: Status code: 429
        //https://www.youtube.com/watch?v=uUbTdVZxjig&ab_channel=Yozohhh2014CH13 is not working?
        try {
            const dispatcher = serverQueue.connection.play(await ytdl(song.url, {
                filter: format => ['251'],
                quality: 'highestaudio',
                highWaterMark: 1 << 25
            }), { type: 'opus' })
                .on('finish', () => {
                    log("Current song ended.");
                    currentSongPlayingMessage.edit('```' + song.title + ' is finished.```');
                    currentSongPlayingMessage.reactions.removeAll().catch(error => console.error('Failed to clear reactions: ', error));

                    log("Checking if anyone is in voice channel.. Checking if I am still in voice channel.");
                    if (serverQueue.voiceChannel.members.array().length <= 1
                        || serverQueue.voiceChannel.members.get(botID) === undefined) {
                        log("No one in voice but me Or...I've been disconnected. Clearing Resources.");
                        //Maybe only need to call stop method?
                        serverQueue.voiceChannel.leave();
                        queue.delete(guild.id);
                        log('Resources cleared.');
                        return;
                    }

                    log("Repeating is currently: " + repeat);
                    if (!repeat) {
                        log('Repeat is off! Attempting to play next song.');
                        serverQueue.songs.shift();
                    }
                    else {
                        log('Repeat is on! Attempting to play same song.');
                        currentSongPlayingMessage.edit('```' + song.title + ' is repeating. Playing again!```');
                    }
                    play(guild, serverQueue.songs[0]);
                })
                .on('error', error => {
                    log("Error in dispatcher: " + error.message);
                });

            log('Setting song volume to 50%');
            dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);

            log('Resetting eventHandler to listen to new events.');
            eventHandler = new events.EventEmitter(); //Reset eventHandler so all previous .on() will not work.

            log('Listening for stop events.');
            eventHandler.on('stop', function () {
                log("Destroying connection.");
                currentSongPlayingMessage.reactions.removeAll().catch(error => console.error('Failed to clear reactions: ', error));
                dispatcher.end();
            });

            log('Listening for pause events.');
            eventHandler.on('pause', async function () {
                log("Pausing player.");
                dispatcher.pause();
                currentSongPlayingMessage.reactions.removeAll().catch(error => console.error('Failed to clear reactions: ', error));
                currentSongPlayingMessage.edit('```' + song.title + ' is paused.```');
                try {
                    log("Trying to set up reacts");
                    log("React: Trying to set up Play");
                    await currentSongPlayingMessage.react("▶️");
                    log("React: Trying to set up Stop");
                    await currentSongPlayingMessage.react("🛑");
                    log("React: Trying to set up Skip");
                    await currentSongPlayingMessage.react("⏩");
                    log("React: Trying to set up Repeat");
                    await currentSongPlayingMessage.react("🔄");
                } catch (error) {
                    log("Problem with reacts: " + error.message);
                }

            });

            log('Listening for resume events.');
            eventHandler.on('resume', async function () {
                log("Resuming player.");
                dispatcher.resume();
                currentSongPlayingMessage.reactions.removeAll().catch(error => console.error('Failed to clear reactions: ', error));
                currentSongPlayingMessage.edit('```' + song.title + ' is now playing!```');
                try {
                    log("Trying to set up reacts");
                    log("React: Trying to set up Pause");
                    await currentSongPlayingMessage.react("⏸");
                    log("React: Trying to set up Stop");
                    await currentSongPlayingMessage.react("🛑");
                    log("React: Trying to set up Skip");
                    await currentSongPlayingMessage.react("⏩");
                    log("React: Trying to set up Repeat");
                    await currentSongPlayingMessage.react("🔄");
                } catch (error) {
                    log("Problem with reacts: " + error.message);
                }
            });
        } catch (error) {
            log("Error with dispatcher: " + error.message);
            if (tryThisManyTimes > 0) {
                tryThisManyTimes = tryThisManyTimes - 1;
                log("Problem with dispatcher will try again. Number of tries remaining: " + tryThisManyTimes);
                play(guild, song);

            }
            else {
                log("Out of tries to play dispatcher.");
                currentSongPlayingMessage.edit('```' + song.title + ' is having issues playing. Skipping to next song!```');

                //Try to play next song.
                tryThisManyTimes = numberOfTriesAllowed;
                serverQueue.songs.shift();
                play(guild, serverQueue.songs[0]);
            }
        }
        log("Finished play method.");
    }

}

//export MusicBot so other modules can use
exports.MusicBot = MusicBot;