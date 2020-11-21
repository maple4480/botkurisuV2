//Based on environment.
const botID = process.env.BOT_ID; //Bot ID used to check if been kicked. 
const GOOGLE_API = process.env.GOOGLE_API;
const token = process.env.BOT_TOKEN;
const dbRef = process.env.DB_REFERENCE;
const SERVICE_ACCOUNT =process.env.SERVICE_ACCOUNT;

const Discord = require('discord.js');
const client = new Discord.Client();

// const {
//     degen,
//     steinGate,
// } = require('./playlist.json');

let database = require("./objects/Database");
let Database = database.Database;
let db = new Database(SERVICE_ACCOUNT,dbRef);

let musicbot = require("./objects/MusicBot");
let MusicBot = musicbot.MusicBot;
let musicBot = new MusicBot(GOOGLE_API,botID);
musicBot.setDB(db);

let monsterhunter = require("./objects/MonsterHunter");
let MonsterHunter = monsterhunter.MonsterHunter;
let mhw = new MonsterHunter();

/*************************************************************************************************************************************/
//What to do when receive Messages:
client.on('message', (message) => {
    if (message.author.bot) return;
    if (message.content.startsWith("-play")) {
        gatherDataOnOtherBots(message);
        return;
    }
    if (!message.content.startsWith("`")) return;


    if (message.content.startsWith("`play")) {
        console.log("Let musicBot deal with play");
        musicBot.execute(message);
        return;
    } else if (message.content.startsWith("`8ball")) {
        console.log("8ball command received.");
        message.channel.send("```"+get8Ball()+"```");
        return;
    }else if (message.content.startsWith("`mhw")) {
        console.log("Let mhw take care of this.");
        mhw.getMonsterInfo(message);
        return;
    }else if (message.content.startsWith("`skip")) {
        console.log("Skipping current song from bot.");
        musicBot.skip(message);
        return;
    } else if (message.content.startsWith("`stop")) {
        console.log("Let musicBot deal with stop");
        musicBot.stop(message);
        return;
    } else if (message.content.startsWith("`song")) {
        console.log("Getting current song from bot.");
        message.channel.send("```"+musicBot.currentPlaying(message)+" is now playing!```" );
        return;
    }
    else if (message.content.startsWith("`repeat")) {
        console.log("Let musicBot deal with repeat");
        musicBot.repeatSong(message);
        return;
    }
    else if (message.content.startsWith("`queue")) {
        console.log("Let musicBot deal with pause");
        message.channel.send('```'+musicBot.getQueue(message)+'```' );
        return;
    }
    else if (message.content.startsWith("`shuffle")) {
        console.log("Let musicBot deal with shuffle");
        musicBot.shuffle(message);
        return;
    }
    else if (message.content.startsWith("`pause")) {
        console.log("Let musicBot deal with pause");
        musicBot.pause();
        return;
    }
    else if (message.content.startsWith("`resume")) {
        console.log("Let musicBot deal with resume");
        musicBot.resume(message);
        return;
    }
    else if (message.content.startsWith("`help")) {
        console.log("User requested help.");
        message.channel.send('```You can currently use the following commands: \n\
            \`play [URL/Text to Search] \n\
            \`skip -Skips current song in queue \n\
            \`stop -Removes all song in queue \n\
            \`song -Displays current song \n\
            \`repeat -Repeat current song until this command is inputted again \n\
            \`queue -Displays current queue of songs \n\
            \`shuffle -Shuffles queue of songs \n\
            \`pause -Pauses the current song \n\
            \`8ball -Returns an answer from 8ball \n\
            \`resume -Will resume music```');
        return;
    }
    else {
        message.channel.send('You need to enter a valid command!')
    }
});
client.on('messageReactionAdd', async (reaction, user) => {
    console.log("Message reaction received.");
    let message = reaction.message, emoji = reaction.emoji;
 
    if (user.bot) return; //Ignore reacts sent by the bot
    console.log("Reaction sent is not from a bot");
    if (!message.author.bot) return; //Only process messages that are from the bot
    console.log("Only process on bot messages");
    if (!musicBot.playerStatus) return; //Should not do anything if the player isn't playing
    console.log("Player is playing.");

    console.log("The user who sent the reaction is: "+user);

    if (emoji.name == '⏸') {
        console.log("user selected pause emoji");
        musicBot.pause();
    }
    else if (emoji.name == '▶️') {
        console.log("user selected play emoji");
        musicBot.resume(message);
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
        reaction.remove(user);
        musicBot.repeatSong(message);
    }
    console.log("Message reaction processing completed.");
});

async function gatherDataOnOtherBots(message){
    console.log('Starting gatherDataOnOtherBots method.');
    let song;
    try{
        console.log('Using music bot to get song information');
        song = await musicBot.getSongInfo(message)
        console.log('\tsong.id: '+song.id+' \n\tsong.title: '+song.title+' \n\tsong.url: '+ song.url+"\nGenerated song information");
    }catch(error)
    {
        console.log("ERROR unable to get song information");
        return; //should not try to add a song into db song isn't working.
    }

    try{
        console.log('\tAdding this song to db: song.id: '+song.id+' \n\tsong.title: '+song.title+' \n\tsong.url: '+ song.url+"\nGenerated song information");
        db.addSong(song);
    }catch(error)
    {
        console.log("ERROR unable to update database.");
    }
    console.log("Song information added to database.");
}

function get8Ball(){
    try{
        console.log("Getting answer from 8ball.");
        let answer = ["As I see it, yes.","Ask again later.",
            "Better not tell you now.","Cannot predict now.","Don't count on it.",
            "It is certain.","It is decidely so.","Most likely","My rpely is no",
            "My sources say no","Outlook not so good","Outlook good","Reply hazy, try again",
            "Signs point to yes","Very doubtful","Without a doubt","Yes.","Yes - Definitely","You may rely on it."];
            let select = Math.floor(Math.random() * Math.floor(answer.length));
            console.log("Answer selected is: "+answer[select]);
        return answer[select]; 
    }catch(error){
        console.log("Problem with get8Ball: "+error.message);
    }
    return "Try Again.";
}

/*************************************************************************************************************************************/
//When application starts do this:
client.on('ready', () => {
    console.log('Bot is ready...Awaiting Input!');
    client.user.setActivity(". For help: `help"); 
});

client.login(token);


/*
 * REFERENCES:
 * https://discord.js.org/#/docs/main/12.1.1/topics/voice
 * 
 * 
*/