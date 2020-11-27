class Genshin{
    constructor() {
        this.fiveStar =[];
        this.fourStar =[];
        this.fiveStarCharacter =[];
        this.fourStarCharacter =[];
        this.threeStar = [];
        this.init();
        this.extractFromWiki();
    }
    async init(){
        console.log("Starting init method.");
        const fetch = require('node-fetch');
        var HTMLParser = require('node-html-parser');
        
        //console.log("Populating from: "+link);
        const response = await fetch( 'https://genshin-impact.fandom.com/wiki/Characters' );
        const body = await response.text();
        var root = HTMLParser.parse(body);
        var rootToTable = root.querySelectorAll('table.article-table tbody');
        
        var rows = rootToTable[0].querySelectorAll('tr');
        console.log("This many characters: "+rows.length);
        for(let i=1;i<rows.length;i++){
            var rarity = (rows[i].querySelectorAll('td'))[0].childNodes[0].rawText;
            var name = (rows[i].querySelectorAll('td'))[2].childNodes[0].rawText;
            //console.log("Found: "+name);
            var data ={
                name: name,
                rarity: rarity
            }
            if(name==='Traveler'){
                console.log("Traveler found! Skipping.");
                continue;
            }
            if(parseInt(rarity)===5 ){
                this.fiveStarCharacter.push(data);
            }else if(parseInt(rarity)===4 ){
                this.fourStarCharacter.push(data);
            }
           
        }
        console.log("There are this many 5* characters: "+this.fiveStarCharacter.length) ;
        console.log("There are this many 4* characters: "+this.fourStarCharacter.length) ;
    }
    async extractFromWiki(){
        var item_link=[];
        var websiteList = [
            'https://genshin-impact.fandom.com/wiki/Category:5-Star_Weapons',
            'https://genshin-impact.fandom.com/wiki/Category:4-Star_Weapons',
            'https://genshin-impact.fandom.com/wiki/Category:3-Star_Weapons'
        ];
        item_link=item_link.concat( await this.getFromAllCategory(websiteList[0]));
        console.log(item_link.length);
        item_link=item_link.concat( await this.getFromAllCategory(websiteList[1]));
        console.log(item_link.length);
        item_link=item_link.concat( await this.getFromAllCategory(websiteList[2]));
        console.log(item_link.length);

        for(let i=0;i<item_link.length;i++){
            let {name,rarity} = await this.getItemInfo(item_link[i]);
            var data = {
                name: name,
                rarity: rarity
            };
            if(rarity===5){
                this.fiveStar.push(data);
            }else if(rarity===4){
                this.fourStar.push(data);
            }else{
                this.threeStar.push(data);
            }
        }
        console.log("Genshin Weapon Informaion added.");
    }
    async getItemInfo(link){
        const fetch = require('node-fetch');
        var HTMLParser = require('node-html-parser');
        
        //console.log("Populating from: "+link);
        const response = await fetch( link );
        const body = await response.text();
        var root = HTMLParser.parse(body);
        var rootToName = root.querySelector('aside h2').childNodes[0].rawText;
        rootToName = rootToName.replace("&#39;","") ;

        var rootToRarity = root.querySelector('div.pi-data-value.pi-font img').getAttribute('alt');
        var rare =0;
        if(rootToRarity.includes("5") ){
            rare=5;
        }else if(rootToRarity.includes("4")){
            rare=4;
        }else {
            rare=3;
        }
        var newData = {
            name: rootToName,
            rarity:rare
        }
        return newData;
 
    }
    async getFromAllCategory(link){
        const fetch = require('node-fetch');
        const wikiDomain ='https://genshin-impact.fandom.com';
        var HTMLParser = require('node-html-parser');
        var data_link =[];

        console.log("Populating from: "+link);
        const response = await fetch( link );
        const body = await response.text();
        var root = HTMLParser.parse(body);
        var dataFromWeb = root.querySelectorAll('a.category-page__member-link');

        for(let j=0;j<dataFromWeb.length;j++){
            if(dataFromWeb[j]!== undefined){
                var l =wikiDomain+ dataFromWeb[j].getAttribute('href');
                //console.log("Adding to data_link: "+l);
                data_link.push(l);
            }
        }
        return data_link;
    }
    onePull(){
        var myPull = this.getRandom(0,1000);
        if(myPull<6){ //getRandom 5*
            var characterOrWeapon = this.getRandom(0,100);
            if(characterOrWeapon<75){ //75% chance of being a character
                return this.fiveStarCharacter[this.getRandom(0,this.fiveStarCharacter.length) ];
            }
            return this.fiveStar[this.getRandom(0,this.fiveStar.length) ];
        }else if(myPull>=6 && myPull<57){ //getRandom 4*
            var characterOrWeapon = this.getRandom(0,100);
            if(characterOrWeapon<75){ //75% chance of being a character
                return this.fourStarCharacter[this.getRandom(0,this.fourStarCharacter.length) ];
            }
            return this.fourStar[this.getRandom(0,this.fourStar.length) ];
        }else{//getRandom 3*
            return this.threeStar[this.getRandom(0,this.threeStar.length) ];
        }
    }
    getRandom(min,max){ //Can return a random number that is between max-1 and min
        return Math.floor((Math.random()*max)+min);
    }
    getStars(count){
        let starList="";
        for(let i=0; i<count;i++){
            starList+='⭐️';
        }
        return starList;
    }
    
    
}
//export Hololive so other modules can use
exports.Genshin = Genshin;