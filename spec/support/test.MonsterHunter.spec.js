// // // const amadeus = require("../../amadeus");
// let monsterhunter = require("../../objects/MonsterHunter");
// let MonsterHunter = monsterhunter.MonsterHunter;
// let mhw = new MonsterHunter();
// describe("MonsterHunter.js", function() {
//     let mySpyMHW;
//     beforeEach(function(){
//         mhw = new MonsterHunter();
//         //Create a spy around an existing obj
//         mySpyMHW = jasmine.spyOn(mhw,'getMonsterInfo');

//         //Create a testable function
//         //jasmine.createSpy

//         //This is for creating a spy obj with internal spy functions
//         //mhw = jasmine.createSpyObj('MonsterHunter',['fetch']);
//     });
//     it("should be able start sucessfully.",function() {
//         expect(mhw).toBeDefined();  
//     });
//     it("should have getMonsterInfo",function() {
//         mySpyMHW.getMonsterInfo.and.returnValue(10);
//         let monster = "Rathalos";
//         mhw.getMonsterInfo(monster)
//         expect(mySpyMHW.getMonsterInfo).toHaveBeenCalled();
//     });

// });


