export type Game = {

  id:number;

  name:string;

  en:string;

  author:string;

  category:string;

  version:string;

  date:string;

  updateDate:string;

  description:string;

  tags:string[];

  symbol:string;

  cover:string;

  lanzou:string;

  pan123:string;

  status:
  | "已发布"
  | "审核中"
  | "未通过";

  downloads:number;


  history?:{

    version:string;

    date:string;

    lanzou:string;

    pan123:string;

  }[];

};





export const categories=[

    "全部",

    "角色扮演",

    "动作冒险",

    "策略战棋",

    "恐怖悬疑",

    "模拟经营"

];





export const games:Game[]=[



{
    id:1,

    name:"喜羊羊与灰太狼之羊村大崩坏 红太狼篇",

    en:"",

    author:"XiaoWoo & Reborn Maker工作室",

    category:"剧情、悬疑、恐怖",

    version:"v1.2",

    date:"2026-10-12",

    updateDate:"2026-10-12",

    description:
    `不能坏的生命已经是存在的。
    所以旧约眼光之所及，不过是坟墓而已。
    
    网盘密码统一为1234
    `,

    tags:[
        "探索",
        "剧情",
        "单机"
    ],


    symbol:"✦",


    cover:
    "radial-gradient(ellipse at 50% 30%,#8b1e2d,#42151d 40%,#10090b)",



    lanzou:
    "https://wwbai.lanzoup.com/iVwoy4bxl2na",


    pan123:
    "https://www.123pan.com/",


    status:"已发布",


    downloads:986,
    
    history:[

    {
      version:"v1.0.0",
      date:"2026-09-01",

      lanzou:
      "https://pan.lanzou.com/old1",

      pan123:
      "https://www.123pan.com/old1"
    },


    {
      version:"v0.9.0",
      date:"2026-08-10",

      lanzou:
      "https://pan.lanzou.com/old2",

      pan123:
      "https://www.123pan.com/old2"
    }

  ]


},


{
    id:2,

    name:"深渊回响",

    en:"ECHOES OF THE ABYSS",


    author:"独立开发者",


    category:"动作冒险",


    version:"v0.9.6",


    date:"2026-10-10",


    updateDate:"2026-10-10",



    description:
    "深入未知地下城，迎战潜伏在黑暗中的古老生物。",



    tags:[
        "动作",
        "地牢",
        "战斗"
    ],


    symbol:"◈",


    cover:
    "radial-gradient(ellipse at 50% 30%,#8f2638,#40131c 40%,#10090b)",



    lanzou:
    "https://pan.lanzou.com/",


    pan123:
    "https://www.123pan.com/",


    status:"已发布",


    downloads:986

},





{
    id:3,


    name:"月下旅人",


    en:"MOONLIT JOURNEY",


    author:"月光工作室",


    category:"角色扮演",


    version:"v1.0.3",


    date:"2026-10-08",


    updateDate:"2026-10-08",



    description:
    "一场发生在月色小镇的奇妙旅程，探索人与记忆的故事。",



    tags:[
        "剧情",
        "像素",
        "冒险"
    ],



    symbol:"☾",



    cover:
    "radial-gradient(ellipse at 50% 30%,#9b3048,#421522 40%,#10090b)",


    lanzou:
    "https://pan.lanzou.com/",


    pan123:
    "https://www.123pan.com/",



    status:"已发布",


    downloads:760

},




{
    id:4,


    name:"机械边境",


    en:"MECHANICAL FRONTIER",


    author:"未来工坊",


    category:"策略战棋",


    version:"v2.1.0",


    date:"2026-10-05",


    updateDate:"2026-10-05",



    description:
    "指挥机械部队，在破碎的未来世界建立自己的阵线。",



    tags:[
        "策略",
        "科幻",
        "战棋"
    ],



    symbol:"⚙",



    cover:
    "radial-gradient(ellipse at 50% 30%,#a84b3d,#451921 40%,#10090b)",



    lanzou:
    "https://pan.lanzou.com/",


    pan123:
    "https://www.123pan.com/",



    status:"已发布",


    downloads:532

},




{
    id:5,


    name:"幽影档案",


    en:"SHADOW ARCHIVE",


    author:"暗夜制作组",


    category:"恐怖悬疑",


    version:"v1.4.2",


    date:"2026-10-03",


    updateDate:"2026-10-03",



    description:
    "调查被尘封的档案，在诡异线索中拼凑事件真相。",



    tags:[
        "悬疑",
        "恐怖",
        "解谜"
    ],



    symbol:"◉",



    cover:
    "radial-gradient(ellipse at 50% 30%,#72263d,#30121a 40%,#10090b)",



    lanzou:
    "https://pan.lanzou.com/",


    pan123:
    "https://www.123pan.com/",



    status:"已发布",



    downloads:1240

},





{
    id:6,


    name:"像素王国",


    en:"PIXEL KINGDOM",


    author:"像素工厂",


    category:"模拟经营",


    version:"v1.8.1",


    date:"2026-09-29",


    updateDate:"2026-09-29",



    description:
    "从一片空地开始，打造属于你的像素世界与城镇。",



    tags:[
        "像素",
        "建造",
        "经营"
    ],



    symbol:"▦",



    cover:
    "radial-gradient(ellipse at 50% 30%,#a05b36,#421b18 40%,#10090b)",



    lanzou:
    "https://pan.lanzou.com/",


    pan123:
    "https://www.123pan.com/",



    status:"审核中",


    downloads:0

}



];