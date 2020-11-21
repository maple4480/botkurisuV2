class MonsterHunter{
    constructor() {
        this.relevance = require('relevance');
    }
    getMonsterInfo(message){
        console.log('Cleaning argument. ');
        const args = message.content.split(' ');
        if (args[1] === undefined) {
            console.log('No argument received.');
            return;
        }
        const searchString = args.slice(1).join(' ');

        console.log('\targs: ' + args + ' \n\tsearchString: ' + searchString + '\nCleaned argument.');

        let searchMonster = args.slice(1,args.length);
        console.log(searchMonster);

        const fetch = require('node-fetch');
        //const FuzzySearch = require('fuzzy-search');

        var foundMonster; 
        fetch('https://mhw-db.com/monsters')
            .then(response => response.json())
            .then(monsters => {
                for(let i=0; i<monsters.length;i++){
                    if(monsters[i].name.toLowerCase() === searchString.toLowerCase()){
                        console.log("Found exact match");
                        console.log(monsters[i]);
                        message.channel.send(this.formatMonsterInfo(monsters[i]) );
                        return;
                    }

                }
                console.log("Commencing fuzzy search");
                var result = this.relevance({
                    query: searchMonster,
                    data: monsters,
                    rankings: {
                      name: 5
                    }
                  });
                console.log(result[0]);
                console.log("Returning first result.");
                
                message.channel.send(this.formatMonsterInfo(result[0]) );
            });
        

    }
    getStars(count){
        let starList="";
        for(let i=0; i<count;i++){
            starList+='⭐️';
        }
        return starList;
    }
    formatMonsterInfo(monster){
        if(!monster) return "ERROR";

        let weaknessList="\n";
        monster.weaknesses=monster.weaknesses.sort(function(a, b){return b.stars-a.stars});
        for(let i=0;i<monster.weaknesses.length;i++){
            weaknessList+="\t"+this.getStars(monster.weaknesses[i].stars)+' '+monster.weaknesses[i].element+'\n';
        }
        let resistanceList="";
        for(let i=0;i<monster.resistances.length;i++){
            resistanceList+=monster.resistances[i].element+' ';
        }

        let displayString ="```";
        displayString+= 'Name: '+monster.name+'\n';
        displayString+= 'Species: '+monster.species+'\n';
        displayString+= 'Description: '+monster.description+'\n';
        displayString+= 'Weakness: '+weaknessList+'\n';
        displayString+= 'Resistance: '+resistanceList+'\n';
        displayString+='```';
        return displayString;
    }
}
//export MonsterHunter so other modules can use
exports.MonsterHunter = MonsterHunter;