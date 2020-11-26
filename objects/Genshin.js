class Genshin{
    constructor() {
        this.genshin = require("genshin-impact-wrapper");
        this.fiveStar =[];
        this.fourStar =[];
        this.threeStar = [];
        this.init();
        this.extractFromWiki();
    }
    async init(){
        (async () => {
            var allCharacters= await this.genshin.character.getCharacters();
            for(let i=0;i<allCharacters.length;i++){
                var data = {
                    name: allCharacters[i].name,
                    rarity: allCharacters[i].rarity
                };
                if(data.rarity===5){
                    this.fiveStar.push(data);
                }
                if(data.rarity===4){
                    this.fourStar.push(data);
                }
            }
            //console.log(JSON.stringify(this.fiveStar) );
        })();

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
        
        console.log("Populating from: "+link);
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
                console.log("Adding to data_link: "+l);
                data_link.push(l);
            }
        }
        return data_link;
    }
    onePull(){
        var myPull = this.getRandom(0,1000);
        if(myPull<6){ //getRandom 5*
            return this.fiveStar[this.getRandom(0,this.fiveStar.length) ];
        }else if(myPull>=6 && myPull<57){ //getRandom 4*
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