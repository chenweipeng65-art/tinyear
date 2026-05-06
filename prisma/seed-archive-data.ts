/**
 * 演示档案正文（原前端 mock），仅由 prisma seed 写入库，不在前端保留副本。
 */
export const SEED_DEMO_STUDENT_NAMES = ["小明", "小红", "小华"] as const;

export type SeedArchiveRow = {
  title: string;
  date: string;
  image: string;
  content: string;
  educationSuggestion: string;
};

export const SEED_ARCHIVES_BY_STUDENT_NAME: Record<string, SeedArchiveRow[]> = {
  小明: [
    {
      title: "积木搭的火箭塔",
      date: "2026-04-10",
      image: "https://picsum.photos/seed/ming-blocks/400/300",
      content:
        "小明用圆柱和长条积木往上垒，说「这是火箭，要发射到幼儿园屋顶上面」。中途倒了一次，他自言自语「再来」，没有哭闹。倾听时能说出「底座要宽一点才稳」，显示出对平衡的直觉经验。",
      educationSuggestion:
        "在家可用纸盒、卫生纸筒延续「高塔」主题，只问「你想怎么让它更稳」；倒塌时先共情「有点可惜」，再邀请他自己说下一步。少代劳堆砌，多肯定坚持。",
    },
    {
      title: "操场跑步第一名",
      date: "2026-04-02",
      image: "https://picsum.photos/seed/ming-run/400/300",
      content:
        "画了自己冲过终点线的样子，旁边有太阳和云朵。他说「我跑得很快，风在耳边呼呼」。提到和同伴撞了一下肩，表示「我们都笑了，没有生气」。能区分比赛兴奋与小摩擦。",
      educationSuggestion:
        "周末可进行短时亲子慢跑或快走，用「你觉得心跳怎么样」代替「你累不累」；观看比赛片段时让他解说画面，练习顺序词（先、然后、最后）。",
    },
    {
      title: "大卡车运沙子",
      date: "2026-03-22",
      image: "https://picsum.photos/seed/ming-truck/400/300",
      content:
        "车身涂成黄色，车斗里画满小点点代表沙子。小明说卡车「帮工人叔叔干活」，轮子要「很多很多」。对工具车有持续兴趣，讲述时手势多，语气兴奋。",
      educationSuggestion:
        "路过工地或停车场时安全距离内指认车辆功能；用积木拼简单「车厢—车头」，让他分配「谁装货谁开车」的角色，发展合作语言。",
    },
    {
      title: "我会自己叠毛巾",
      date: "2026-03-12",
      image: "https://picsum.photos/seed/ming-towel/400/300",
      content:
        "画面分三格：摊开、对折、放进小筐。小明逐步描述生活区活动，说「老师夸我对齐了边边」。能复述步骤顺序，对「自己做」有明显自豪感。",
      educationSuggestion:
        "在家固定一项他能独立完成的小任务（如收袜子），步骤拍照贴墙上；完成后让他当小老师教玩偶，巩固自我效能感。",
    },
    {
      title: "恐龙世界",
      date: "2026-02-26",
      image: "https://picsum.photos/seed/ming-dino/400/300",
      content:
        "多只简笔恐龙有大有小，颜色各异。小明介绍「大的吃草，小的跑得飞快」，并给其中一只起名「闪电」。虚构与拟人并存，愿意回答「如果下雨恐龙去哪躲」的开放问题。",
      educationSuggestion:
        "提供恐龙主题贴纸书或拼图，倾听他编「家族故事」；不必纠正科普细节，可记下他的设定，隔几天续问「闪电今天去哪了」。",
    },
  ],
  小红: [
    {
      title: "彩虹色的蝴蝶",
      date: "2026-04-08",
      image: "https://picsum.photos/seed/hong-butterfly/400/300",
      content:
        "翅膀用多种颜色层层涂色，边缘画了小圆点。小红说蝴蝶「去找花蜜」，最喜欢粉色「因为香香的」。涂色时较专注，能说明颜色选择理由，语气柔和。",
      educationSuggestion:
        "准备安全干花或香料袋，闭眼闻一闻再联想颜色；户外观察真实蝴蝶时提醒轻声靠近，回家后画「今天看到的三种颜色」。",
    },
    {
      title: "铃铛响叮咚",
      date: "2026-03-26",
      image: "https://picsum.photos/seed/hong-bell/400/300",
      content:
        "画了音乐角的串铃和音符。小红模仿「叮—咚—」节奏，说「轻轻摇小声，用力摇大声」。对强弱有感知，能配合老师打节拍做简单动作。",
      educationSuggestion:
        "用锅勺、豆子罐自制小乐器，约定「音乐停就freeze」游戏；睡前哼同一段旋律，让她猜下一个音高「往上还是往下」。",
    },
    {
      title: "给娃娃梳头发",
      date: "2026-03-14",
      image: "https://picsum.photos/seed/hong-doll/400/300",
      content:
        "娃娃长发用波浪线表现，旁边有小梳子和镜子。小红描述「要轻轻的，不然娃娃会疼」。展现出移情能力，能联系自己被梳头的体验。",
      educationSuggestion:
        "角色扮演时由她主导「娃娃的一天」，家长当娃娃只回应不说教；肯定她「轻轻」的细节，并问她「娃娃还想做什么」。",
    },
    {
      title: "红红的草莓",
      date: "2026-02-22",
      image: "https://picsum.photos/seed/hong-berry/400/300",
      content:
        "一盘草莓，籽用点状耐心点上去。小红说「一颗给妈妈，一颗给老师，一颗给自己」。分享顺序自发出现，计数到三较稳定。",
      educationSuggestion:
        "购物时让她分装三份小零食并口述「给谁」；读绘本时指图问「如果是你，先分给谁」，倾听理由不评判。",
    },
  ],
  小华: [
    {
      title: "蜗牛慢慢爬",
      date: "2026-04-05",
      image: "https://picsum.photos/seed/hua-snail/400/300",
      content:
        "蜗牛壳画成螺旋，身体拉长在叶子上。小华说「它不能快，快了会掉下来」。观察自然角后记录，能复述「触角会缩进去」的现象，好奇心强。",
      educationSuggestion:
        "雨后散步找蜗牛（不伤害、不带走），用手机微距拍照放大看；回家画「蜗牛的一天」时间轴：早上—中午—晚上。",
    },
    {
      title: "小鱼吐泡泡",
      date: "2026-03-30",
      image: "https://picsum.photos/seed/hua-fish/400/300",
      content:
        "鱼缸轮廓里有水草和大小不一的圆泡泡。小华解释「鱼用鳃呼吸，泡泡到水面就破了」。部分词汇来自科普活动，能区分「真的鱼」和「贴纸鱼」。",
      educationSuggestion:
        "参观水族馆或看纪录片片段（5 分钟内），让他画「最奇怪的一种鱼」；提问用「你发现了什么」而非「你知道答案吗」。",
    },
    {
      title: "太阳和我的影子",
      date: "2026-03-18",
      image: "https://picsum.photos/seed/hua-shadow/400/300",
      content:
        "同一小人上午、中午影子长短不同。小华说「中午影子矮矮的，像小乌龟」。对光影变化有兴趣，主动提出「阴天影子去哪了」。",
      educationSuggestion:
        "晴天固定时间在阳台用粉笔画脚印轮廓对比；阴天讨论「光被云挡住了」，用手电筒照玩偶做简易影子戏。",
    },
    {
      title: "风车转转转",
      date: "2026-03-02",
      image: "https://picsum.photos/seed/hua-windmill/400/300",
      content:
        "四叶风车加箭头表示风向。小华描述「风来了它就转，风停就不动」，并画了自己跑起来「假装有风」。能把因果与身体经验联系起来。",
      educationSuggestion:
        "折纸风车户外试转，记录「今天风大不大」用表情符号；读风相关儿歌时让他打节拍，感受语言节奏与「转」的意象。",
    },
    {
      title: "蚂蚁搬家",
      date: "2026-02-18",
      image: "https://picsum.photos/seed/hua-ant/400/300",
      content:
        "一队蚂蚁沿曲线搬运碎屑。小华说「它们排队很整齐，不能踩」。对微小生物有耐心观察，能说出「下雨前要搬家」的生活经验（可能来自故事迁移）。",
      educationSuggestion:
        "阳台花盆边观察蚂蚁路线，拍照或速写；讨论「我们怎么走路不打扰它们」，培养观察伦理与等待能力。",
    },
  ],
};
