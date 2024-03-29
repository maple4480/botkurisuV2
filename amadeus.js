//Based on environment.
const botID = process.env.BOT_ID; //Bot ID used to check if been kicked. 
const GOOGLE_API = process.env.GOOGLE_API;
const token = process.env.BOT_TOKEN;
const dbRef = process.env.DB_REFERENCE;
const SERVICE_ACCOUNT =process.env.SERVICE_ACCOUNT;
const BOT_TEXT_CHANNEL = process.env.BOT_TEXT_CHANNEL;
const COC_AUTHORIZATION_TOKEN = process.env.COC_AUTHORIZATION_TOKEN;

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

let hololive = require("./objects/Hololive");
let Hololive = hololive.Hololive;
let holo = new Hololive();

let gensh = require("./objects/Genshin");
let Genshin = gensh.Genshin;
let genshin = new Genshin();

let clashOfClan = require("./objects/ClashOfClan");
let ClashOfClan = clashOfClan.ClashOfClan;
let coc = new ClashOfClan(COC_AUTHORIZATION_TOKEN);

const EMBED_MSG_COLOR = '#0099ff';
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
    } else if (message.content.startsWith("`genshin 1")) {
        console.log("Genshin command received.");
        pulling(message);       
        return;
    }else if (message.content.startsWith("`hololive")) {
        console.log("Hololive command received.");
        holo.getScheduleList().then((value)=>{
            const embedResult = processHoloLive(message,value);
        });
        
        return;
    }else if (message.content.startsWith("`flip")) {
        console.log("Flip command received. Check if correct parameters");
        flip(message);
        return;
    }else if (message.content.startsWith("`daily")) {
        console.log("Daily command received. Attemping to add 100 coins.");
        daily(message);       
        return;
    }else if (message.content.startsWith("`8ball")) {
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
    else if (message.content.startsWith("`top")) {
        console.log("Let database get top 10");
        getTopSongs(message);
        return;
    }
    else if (message.content.startsWith("`coc")) {
        console.log("Getting clash of clan information.");
        getCOCPlayerInformation(message);
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
        message.channel.send('You need to enter a valid command!');
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
            "It is certain.","It is decidely so.","Most likely","My reply is no",
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
//This will take care of when a user tries to use the daily command.
function daily(message){
    let user =message.author.id;
    //Check if the user has not used the daily command within the last 
    db.getLastDailyDate(user).then((value)=>{
        if(value){
            console.log("A date was found");
            let lastDailyDate = new Date(value);
            let after24Hrs = lastDailyDate;
            after24Hrs.setDate(after24Hrs.getDate()+1);
            console.log("Last Daily Date is: "+lastDailyDate);
            console.log("After 24hrs Date is: "+after24Hrs);
            if ( after24Hrs > Date.now() ){//Compare value and see if the lastdailydate +24hours is > NOW 
                message.channel.send("```You've already claimed todays daily. Come back on: "+lastDailyDate+"```");
                return;
            }
        }
        else{//No set date? Means new user. continue 
            console.log("No date information found. Attempting to give user 100 coins.");
        }
        console.log("Granting user 100 coins.");
        db.addCurrency(user, 100).then((value)=>{
            rightNow = new Date();
            message.channel.send("```Received 100 coins! You now have "+value+" coins! ```");
            console.log("Setting lastdatedaily to: "+rightNow);
            db.setDailyDate(user, rightNow );
        });
        
    });
    
}
function flip(message){
    console.log("Entering flip method.");
    try{
    const user =message.author.id;
    const args = message.content.split(' ');
    console.log("The value of args 0 is: "+args[0]);
    console.log("The value of args 1 is: "+args[1]);
    console.log("The value of args 2 is: "+args[2]);
    if (args[1] === undefined || args[2] === undefined ) {
        message.channel.send('```You need to enter a valid flip command!```');return;
    }
    if(isNaN(parseInt(args[1])) ){
        message.channel.send('```You need to enter a valid bet amount.```');return;
    }
    const validArg2Val =["h","t"];
    if(!validArg2Val.includes(args[2].toLowerCase()) ){
        message.channel.send('```You need to enter a valid head or tail.```');return;
    }
    db.getCurrency(user).then((value)=>{
        console.log("Value is: "+value);
        if(value){
            console.log("Checking if betting amount is > user have");
            if(parseInt(args[1])>value){
                message.channel.send('```You do not have that much money! Please bet less than: '+value+'```');
                return;
            }
            console.log("Setting CurrentTotal to: "+value);
            var currenTot =value;
            console.log("CurrentTotal is now: "+currenTot);

            const keyToVal = {"h":1,"t":2};
            const botFlip = Math.floor((Math.random() * 2) + 1); //Get a number from 1-2. 1 is Head, 2 is Tail.
            console.log("The bot chose: "+botFlip) ;
            const betAmount = parseInt(args[1]);
            console.log("The bet amount is: "+betAmount);
            if(botFlip === keyToVal[args[2].toLowerCase()]){
                console.log("User win!");
                db.addCurrency(user, betAmount ).then((value)=>{
                    message.channel.send("```You win!\nReceived "+betAmount+" coins! You now have "+value+" coins! ```");
                });
            }else{
                console.log("User lost!");
                db.addCurrency(user, betAmount,0 ).then((value)=>{
                    message.channel.send("```You lost!\nTaking "+betAmount+" coins! You now have "+value+" coins! ```");
                });
            }
        }else{
            message.channel.send("```You have no money.```");
            return;
        }
    });

    }catch(error){
        console.log("There was an issue with the flip command: "+error.message);
        message.channel.send('```Problem with flipping.```');return;
    }
    
    
}
function processHoloLive(message,data){
    try{
        var lives = {};
        var anyLives = false;
        for(let i=0;i<data.length;i++){
            var streamStart = new Date(data[i].time);
            var now = new Date();
            if(data[i].streaming){
                anyLives = true;
                const embedding = new Discord.MessageEmbed();
                embedding.setColor(EMBED_MSG_COLOR);
                embedding.setTitle(data[i].streamer+' is Live!')
                embedding.setThumbnail(data[i].livePreviewImage);
                embedding.setURL(data[i].link);
                message.channel.send(embedding);
            }

        }
        if(!anyLives){
            const embedding = new Discord.MessageEmbed();
            embedding.setColor(EMBED_MSG_COLOR);
            embedding.setTitle('No one is live!')
            message.channel.send(embedding);
        }
    }catch(error){
        console.log("Unable to process Schedule: "+error.message);
        message.channel.send('```Problem with hololive.```');return;
    }
}
function pulling(message){
    const args = message.content.split(' ');
    console.log("The value of args 0 is: "+args[0]);
    console.log("The value of args 1 is: "+args[1]);
    if (args[1] === undefined) {
        message.channel.send('```You need to enter a 1 or a 10!```');return;
    }
    if(isNaN(parseInt(args[1]) ) ){
        message.channel.send('```You need to enter a valid a number.```');return;
    }
    if( parseInt(args[1])!==1 ){
        if(parseInt(args[1])!==10){
            message.channel.send('```You need to enter a valid a number.```');return;
        }
    }
    var embedding = new Discord.MessageEmbed();
    embedding.setColor('#0099ff');
  
    if(parseInt(args[1])===10){//10Pull
        embedding.setTitle('10 Pull Result');
        var fourStarOrHigher = false;
        for(let i=0;i<10;i++){
            var result = genshin.onePull();
            console.log("Result is: "+result);
            console.log("Pull is: "+result.name+" "+result.rarity);
            if(result.rarity>=4){
                fourStarOrHigher = true;
            }
            embedding.addField(result.name,genshin.getStars(result.rarity),true);
            if(i===9 && !fourStarOrHigher){//If last pull and there is not a four star or higher restart
                embedding = new Discord.MessageEmbed();
                embedding.setColor('#0099ff');
                embedding.setTitle('10 Pull Result');
                fourStarOrHigher = false;
                i=-1;
                console.log("10 pull did not contain one 4* or higher. Regenerating");
            }
        }

    }else{//Single Pull
        embedding.setTitle('1 Pull Result');
        var result = genshin.onePull();
        embedding.addField(result.name,genshin.getStars(result.rarity),true);
    }
    message.channel.send(embedding);
    console.log(result);
}

//Currently not using.
function AutoHololive(){
    console.log("It is time to check!");
    holo.getScheduleList().then((data)=>{
        try{
            client.channels.cache.get(BOT_TEXT_CHANNEL).send("Its time to check whos live!");
            for(let i=0;i<data.length;i++){
                if(data[i].streaming){
                    const embedding = new Discord.MessageEmbed();
                    embedding.setColor('#0099ff');
                    embedding.setTitle(data[i].streamer+' is Live!')
                    embedding.setThumbnail(data[i].livePreviewImage);
                    embedding.setURL(data[i].link);
                    client.channels.cache.get(BOT_TEXT_CHANNEL).send(embedding);
                }
            }
        }catch(error){
            console.log("Unable to process Schedule: "+error.message);
        }
    });
}

function getTopSongs(message){
    console.log("Checking for top 10 songs..");

    db.getTopSongs().then((value)=>{
        var embedding = new Discord.MessageEmbed();
        embedding.setColor('#0099ff');
        embedding.setTitle('The top 9 played songs are: ')

        if(value){
            var songList = value;
            songList.forEach((currentVal) =>{
                console.log( currentVal.title);
                embedding.addField(currentVal.title,currentVal.count,true);
            });
        }
        message.channel.send(embedding);
    });
}

function getCOCPlayerInformation(message){
    console.log("Enter getCOCPlayerInformation ..");

    coc.getPlayerInfo().then((value)=>{
        var embedding = new Discord.MessageEmbed();
        embedding.setColor('#0099ff');
        embedding.setTitle('COC information on: ')

        embedding.setDescription(value);
        message.channel.send(embedding);
    });
}

/*************************************************************************************************************************************/
//When application starts do this:
client.on('ready', () => {
    console.log('Bot is ready...Awaiting Input!');
    client.user.setActivity(". For help: `help"); 

    //console.log("Automatic check hololive every hour.");
    //setInterval(AutoHololive, 3600000);
});

client.login(token);


/*
 * REFERENCES:
 * https://discord.js.org/#/docs/main/12.1.1/topics/voice
 * 
 * 
*/