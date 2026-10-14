import { prisma } from "@/lib/prisma";
import GamesAdmin from "./GamesAdmin";



export default async function GamesPage(){



const games =
await prisma.game.findMany({

orderBy:{
id:"asc"
}

});




return (

<GamesAdmin

games={games}

/>

);


}