import { PrismaClient } from "@prisma/client";
import { games } from "../src/app/data/games";


const prisma = new PrismaClient();


async function main(){


for(const game of games){


await prisma.game.upsert({

where:{
id:game.id
},


update:{


name:game.name,

en:game.en,

author:game.author,

category:game.category,

version:game.version,

date:game.date,

updateDate:game.updateDate,

description:game.description,


tags:game.tags,


symbol:game.symbol,


cover:game.cover,


lanzou:game.lanzou,

pan123:game.pan123,


status:game.status,


downloads:game.downloads,


history:game.history ?? []

},



create:{


id:game.id,

name:game.name,

en:game.en,

author:game.author,

category:game.category,

version:game.version,

date:game.date,

updateDate:game.updateDate,

description:game.description,


tags:game.tags,


symbol:game.symbol,


cover:game.cover,


lanzou:game.lanzou,

pan123:game.pan123,


status:game.status,


downloads:game.downloads,


history:game.history ?? []

}


});


}


}


main()
.then(()=>{

console.log("游戏导入完成");

})

.catch(e=>{

console.error(e);

})

.finally(()=>{

prisma.$disconnect();

});