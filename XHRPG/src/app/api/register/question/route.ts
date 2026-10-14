import {prisma} from "@/lib/prisma";
import {NextResponse} from "next/server";


export async function GET(){


const count =
await prisma.verifyQuestion.count({

where:{
enabled:true
}

});


const random =
Math.floor(
Math.random()*count
);



const question =
await prisma.verifyQuestion.findFirst({

where:{
enabled:true
},

skip:random

});



return NextResponse.json({

question

});


}