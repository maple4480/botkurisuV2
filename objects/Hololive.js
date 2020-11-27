class Hololive{
    constructor() {
    }
    getScheduleList(){
        const fetch = require('node-fetch');
        var lives = (async ()=> {
            // https://schedule.hololive.tv/
            // https://schedule.hololive.tv/lives/english
            const response = await fetch('https://schedule.hololive.tv/lives',
                {   headers: { 'Cookie': 'timezone=America/Los_Angeles',
                                    'Content-Type': 'text/html;charset=UTF-8'},
                });
            const body = await response.text();

            const parseScheduleHtml  = require('holo-schedule').default;
            const { lives, dict } = parseScheduleHtml(body);
            var dataLives =JSON.parse(JSON.stringify(lives));
            console.log("ExpectedDate is: "+JSON.stringify(lives));

            console.log("lives contain: "+lives)
            console.log("dataresult is: "+lives.length);

            return lives;

        })();
        return lives;

    }
    
}
//export Hololive so other modules can use
exports.Hololive = Hololive;