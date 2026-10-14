import {prisma} from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function GamePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {


  const { id } = await params;


const game =
await prisma.game.findUnique({

where:{
id:Number(id)
}

});


  if (!game) {
    notFound();
  }


  const cover =
    `/assets/games/games${game.id}.png`;



  return (

    <main className="detail-page">


<Link href="/">

<button className="detail-back">

← 返回游戏库

</button>

</Link>


      {/* 背景 */}

      <div
        className="detail-bg"
        style={{
          backgroundImage:`url(${cover})`
        }}
      />



      {/* 遮罩 */}

      <div className="detail-mask"/>



      {/* 内容 */}

      <div className="detail-container">


        <div className="detail-card">


          <div className="detail-content">


            {/* 封面 */}

            <div className="detail-cover">

              <img
                src={cover}
                alt={game.name}
              />

            </div>



            {/* 信息 */}

            <div className="detail-info">


              <h1>
                {game.name}
              </h1>



              <p className="description">
                {game.description}
              </p>



              <div className="game-meta">

                <p>
                  作者：
                  {game.author}
                </p>


                <p>
                  类型：
                  {game.category}
                </p>


                <p>
                  版本：
                  {game.version}
                </p>


                <p>
                  下载量：
                  {game.downloads}
                </p>


              </div>




              {/* 当前版本下载 */}

              <div className="download-box">


                <a
                  href={game.lanzou}
                  target="_blank"
                  className="download-btn lanzou"
                >

                  蓝奏云下载

                </a>



                <a
                  href={game.pan123}
                  target="_blank"
                  className="download-btn pan123"
                >

                  123云盘下载

                </a>


              </div>





              {/* 历史版本 */}

              {
                game.history &&
                game.history.length > 0 && (

                  <div className="history-box">


                    <h2>
                      历史版本
                    </h2>



                    {
                      game.history.map((item,index)=>(

                        <div
                          key={index}
                          className="history-item"
                        >


                          <div className="history-info">

                            <strong>
                              {item.version}
                            </strong>


                            <span>
                              {item.date}
                            </span>


                          </div>



                          <div className="history-btns">


                            <a
                              href={item.lanzou}
                              target="_blank"
                            >

                              蓝奏云

                            </a>



                            <a
                              href={item.pan123}
                              target="_blank"
                            >

                              123云盘

                            </a>


                          </div>


                        </div>

                      ))
                    }


                  </div>

                )
              }



            </div>


          </div>


        </div>


      </div>


    </main>

  );

}