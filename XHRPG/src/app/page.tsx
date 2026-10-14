import { prisma } from "@/lib/prisma";
import HomeClient from "./components/HomeClient";


export default async function Home() {



  const games = await prisma.game.findMany({

    where: {

      status:"已发布"

    },

    orderBy:{

      id:"asc"

    }

  });







  const banners = await prisma.banner.findMany({

    where:{

      enabled:true

    },

    orderBy:{

      id:"asc"

    }

  });








  return (

    <HomeClient

      games={games}

      banners={banners}

    />

  );


}