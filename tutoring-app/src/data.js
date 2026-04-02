// ===== Subject & Topic Data =====

const SUBJECTS = [
  {
    id: 'chinese',
    name: '语文',
    icon: '📖',
    color: '#ef4444',
    desc: '阅读理解、写作、古诗词、汉字',
    topics: [
      { id: 'hanzi',   name: '汉字与词语', desc: '笔顺、字义、近义词反义词' },
      { id: 'poetry',  name: '古诗词',     desc: '背诵、理解、意境' },
      { id: 'reading', name: '阅读理解',   desc: '记叙文、说明文阅读技巧' },
      { id: 'writing', name: '作文',       desc: '写作方法、修辞手法' },
    ],
    knowledge: [
      { title: '修辞手法', body: '比喻：用"像""是"把A比作B。\n拟人：把事物当作人来写。\n排比：三个或以上结构相似的短语。\n夸张：故意扩大或缩小事物。' },
      { title: '文言文常识', body: '之：的（助词）/ 代指\n曰：说\n乃：于是、才\n其：他的、那个' },
    ],
  },
  {
    id: 'math',
    name: '数学',
    icon: '🔢',
    color: '#3b82f6',
    desc: '四则运算、分数、图形、统计',
    topics: [
      { id: 'fraction',    name: '分数',     desc: '分数的意义、加减乘除' },
      { id: 'decimal',     name: '小数',     desc: '小数四则运算、应用题' },
      { id: 'geometry',    name: '几何图形', desc: '面积、体积、周长公式' },
      { id: 'statistics',  name: '统计',     desc: '平均数、条形折线图' },
    ],
    knowledge: [
      { title: '常用面积公式', body: '长方形：长 × 宽\n正方形：边长²\n三角形：底 × 高 ÷ 2\n平行四边形：底 × 高\n梯形：(上底+下底) × 高 ÷ 2\n圆：π × r²' },
      { title: '分数运算要点', body: '同分母加减：分子相加减，分母不变\n异分母加减：先通分再计算\n分数乘法：分子乘分子，分母乘分母\n分数除法：乘以倒数' },
    ],
  },
  {
    id: 'english',
    name: '英语',
    icon: '🔤',
    color: '#8b5cf6',
    desc: '词汇、语法、听说读写',
    topics: [
      { id: 'vocabulary', name: '单词',   desc: '核心词汇、词根词缀' },
      { id: 'grammar',    name: '语法',   desc: '时态、句型、词性' },
      { id: 'reading_en', name: '阅读',   desc: '短文理解、细节提取' },
      { id: 'phonics',    name: '音标',   desc: '元音辅音、连读规则' },
    ],
    knowledge: [
      { title: '基本时态', body: '一般现在时：do/does（习惯/事实）\n一般过去时：did（过去发生）\n一般将来时：will+动词原形\n现在进行时：am/is/are + ing' },
      { title: '常考句型', body: 'There is/are ... ：有……\nHow + 形容词/副词 ...?\nWhat + 名词 ...?\nWould you like to ...?' },
    ],
  },
  {
    id: 'science',
    name: '科学',
    icon: '🔬',
    color: '#10b981',
    desc: '生物、物理、化学启蒙',
    topics: [
      { id: 'biology',  name: '生物',   desc: '植物动物、生态系统' },
      { id: 'physics',  name: '物理启蒙', desc: '力、光、热、声' },
      { id: 'earth',    name: '地球科学', desc: '天气、岩石、宇宙' },
      { id: 'health',   name: '健康',   desc: '人体结构、营养健康' },
    ],
    knowledge: [
      { title: '光合作用', body: '植物利用阳光、水和二氧化碳制造有机物（葡萄糖）并释放氧气。\n公式：CO₂ + H₂O →(光) 葡萄糖 + O₂\n发生部位：叶绿体' },
      { title: '食物链', body: '生产者（植物）→ 初级消费者（草食动物）→ 次级消费者（肉食动物）→ 分解者\n能量沿食物链逐级递减，约为上一级的10%~20%。' },
    ],
  },
  {
    id: 'history',
    name: '历史',
    icon: '🏛️',
    color: '#f59e0b',
    desc: '中国历史、世界文明',
    topics: [
      { id: 'ancient',  name: '中国古代史', desc: '朝代更迭、重要事件' },
      { id: 'modern',   name: '近现代史',   desc: '鸦片战争到新中国' },
      { id: 'world',    name: '世界历史',   desc: '四大文明、重要时期' },
      { id: 'figures',  name: '历史人物',   desc: '重要历史人物与贡献' },
    ],
    knowledge: [
      { title: '朝代顺序口诀', body: '夏商周，秦汉魏晋南北朝，\n隋唐五代宋，元明清，\n中华民国到新中国。' },
      { title: '四大发明', body: '造纸术：东汉蔡伦改进\n印刷术：北宋毕昇发明活字印刷\n火药：唐代炼丹家发现\n指南针：战国时代，宋代用于航海' },
    ],
  },
  {
    id: 'geography',
    name: '地理',
    icon: '🌏',
    color: '#06b6d4',
    desc: '中国地理、世界地理',
    topics: [
      { id: 'china_geo',  name: '中国地理', desc: '省份、山脉、河流' },
      { id: 'world_geo',  name: '世界地理', desc: '七大洲、四大洋' },
      { id: 'climate',    name: '气候',     desc: '气候类型、天气现象' },
      { id: 'resources',  name: '自然资源', desc: '矿产、能源、生物资源' },
    ],
    knowledge: [
      { title: '中国三大河流', body: '长江：最长，发源青藏高原，注入东海\n黄河：母亲河，发源青海，注入渤海\n珠江：华南最大河流，注入南海' },
      { title: '七大洲面积顺序', body: '亚非北南美，南极欧大洋\n（亚洲 > 非洲 > 北美洲 > 南美洲 > 南极洲 > 欧洲 > 大洋洲）' },
    ],
  },
  {
    id: 'morality',
    name: '道德法治',
    icon: '⚖️',
    color: '#ec4899',
    desc: '公民道德、法律常识',
    topics: [
      { id: 'rights',  name: '权利与义务', desc: '公民基本权利义务' },
      { id: 'society', name: '社会生活',   desc: '家庭、学校、社区' },
      { id: 'law',     name: '法律常识',   desc: '未成年人保护法' },
      { id: 'nation',  name: '国情国策',   desc: '国家制度、民族政策' },
    ],
    knowledge: [
      { title: '未成年人的权利', body: '生存权、发展权、受保护权、参与权\n受教育权：国家保障9年义务教育\n不得提前就业（16岁以下禁止打工）' },
      { title: '公民基本义务', body: '遵守宪法和法律\n维护国家统一和民族团结\n依法纳税\n服兵役（男性年满18岁）' },
    ],
  },
];

// ===== Question Bank =====
const QUESTIONS = [
  // --- 语文 ---
  { id: 1,  subject: 'chinese', topic: 'hanzi',   q: '"骄傲"的近义词是（  ）',
    opts: ['A. 谦虚', 'B. 自豪', 'C. 勤劳', 'D. 诚实'], ans: 1, exp: '"骄傲"有"自豪"的意思，在褒义语境中近义词为"自豪"。' },
  { id: 2,  subject: 'chinese', topic: 'hanzi',   q: '下列词语中书写完全正确的是（  ）',
    opts: ['A. 欢迎光临', 'B. 再接再励', 'C. 黯然失色', 'D. 察颜观色'], ans: 2, exp: '"黯然失色"书写正确；"再接再厉（不是励）"，"察言观色（不是颜）"。' },
  { id: 3,  subject: 'chinese', topic: 'poetry',  q: '"春风又绿江南岸，明月何时照我还"的作者是（  ）',
    opts: ['A. 李白', 'B. 杜甫', 'C. 王安石', 'D. 苏轼'], ans: 2, exp: '这首诗出自北宋王安石的《泊船瓜洲》。' },
  { id: 4,  subject: 'chinese', topic: 'poetry',  q: '"但愿人长久，千里共__婵娟"，横线处填（  ）',
    opts: ['A. 同', 'B. 赏', 'C. 享', 'D. 看'], ans: 0, exp: '苏轼《水调歌头》原文：但愿人长久，千里共婵娟。' },
  { id: 5,  subject: 'chinese', topic: 'reading', q: '"说明文"最突出的特点是（  ）',
    opts: ['A. 情节曲折', 'B. 科学准确', 'C. 借景抒情', 'D. 人物鲜明'], ans: 1, exp: '说明文以科学性和准确性为首要特点，用来介绍事物或事理。' },
  { id: 6,  subject: 'chinese', topic: 'writing', q: '"天空像一块蓝色的玻璃"使用的修辞手法是（  ）',
    opts: ['A. 拟人', 'B. 夸张', 'C. 比喻', 'D. 排比'], ans: 2, exp: '用"像"把天空比作玻璃，是比喻中的明喻。' },
  { id: 7,  subject: 'chinese', topic: 'hanzi',   q: '下面词语中的"绝"与"绝无仅有"的"绝"意思相同的是（  ）',
    opts: ['A. 绝望', 'B. 拒绝', 'C. 绝迹', 'D. 断绝'], ans: 2, exp: '"绝无仅有"的"绝"是"绝对、完全"的意思，"绝迹"中的"绝"也表示"完全消失"。' },

  // --- 数学 ---
  { id: 10, subject: 'math', topic: 'fraction',   q: '3/4 + 1/3 = （  ）',
    opts: ['A. 4/7', 'B. 13/12', 'C. 4/12', 'D. 1/2'], ans: 1, exp: '通分：9/12 + 4/12 = 13/12。' },
  { id: 11, subject: 'math', topic: 'fraction',   q: '2/3 × 3/4 = （  ）',
    opts: ['A. 6/12', 'B. 5/7', 'C. 1/2', 'D. 2/4'], ans: 2, exp: '2×3 / 3×4 = 6/12 = 1/2，化简为1/2。' },
  { id: 12, subject: 'math', topic: 'geometry',   q: '底边为6cm，高为4cm的三角形面积是（  ）',
    opts: ['A. 24 cm²', 'B. 12 cm²', 'C. 10 cm²', 'D. 20 cm²'], ans: 1, exp: '三角形面积 = 底 × 高 ÷ 2 = 6 × 4 ÷ 2 = 12 cm²。' },
  { id: 13, subject: 'math', topic: 'geometry',   q: '半径为5cm的圆的面积约是（π≈3.14）（  ）',
    opts: ['A. 31.4 cm²', 'B. 78.5 cm²', 'C. 15.7 cm²', 'D. 62.8 cm²'], ans: 1, exp: 'S = π × r² = 3.14 × 5² = 3.14 × 25 = 78.5 cm²。' },
  { id: 14, subject: 'math', topic: 'decimal',    q: '0.125 × 8 = （  ）',
    opts: ['A. 0.1', 'B. 1', 'C. 10', 'D. 1.25'], ans: 1, exp: '0.125 × 8 = 1.000 = 1。也可用1/8 × 8 = 1来理解。' },
  { id: 15, subject: 'math', topic: 'statistics', q: '一组数据：5, 7, 9, 3, 6，其平均数是（  ）',
    opts: ['A. 5', 'B. 6', 'C. 7', 'D. 8'], ans: 1, exp: '(5+7+9+3+6) ÷ 5 = 30 ÷ 5 = 6。' },
  { id: 16, subject: 'math', topic: 'fraction',   q: '5/6 ÷ 5/12 = （  ）',
    opts: ['A. 1/2', 'B. 2', 'C. 25/72', 'D. 1/3'], ans: 1, exp: '5/6 ÷ 5/12 = 5/6 × 12/5 = 60/30 = 2。' },

  // --- 英语 ---
  { id: 20, subject: 'english', topic: 'grammar',    q: 'She __ (go) to school every day.',
    opts: ['A. go', 'B. goes', 'C. went', 'D. going'], ans: 1, exp: '第三人称单数 she 在一般现在时动词加 -s → goes。' },
  { id: 21, subject: 'english', topic: 'grammar',    q: 'There __ a pen and two books on the desk.',
    opts: ['A. are', 'B. is', 'C. were', 'D. be'], ans: 1, exp: '"There be"就近原则：离 be 最近的名词 "a pen" 是单数，所以用 is。' },
  { id: 22, subject: 'english', topic: 'vocabulary', q: 'The __ (第七) month of the year is July.',
    opts: ['A. sixth', 'B. seventh', 'C. seventy', 'D. seven'], ans: 1, exp: '"第七" 是序数词 seventh。七月 July 是第七个月。' },
  { id: 23, subject: 'english', topic: 'grammar',    q: 'I __ TV when my mother came in.',
    opts: ['A. watched', 'B. watch', 'C. was watching', 'D. am watching'], ans: 2, exp: '"when sb came in" 表示过去某时刻正在进行，用过去进行时：was/were + doing。' },
  { id: 24, subject: 'english', topic: 'vocabulary', q: 'Which word means the opposite of "expensive"?',
    opts: ['A. cheap', 'B. big', 'C. heavy', 'D. fast'], ans: 0, exp: '"expensive" 意为"贵的"，反义词是 "cheap"（便宜的）。' },
  { id: 25, subject: 'english', topic: 'phonics',    q: '"phone" 中 "ph" 的发音是（  ）',
    opts: ['A. /p/', 'B. /b/', 'C. /f/', 'D. /v/'], ans: 2, exp: '"ph" 在英语中通常发 /f/ 音，如 phone, photo, dolphin。' },

  // --- 科学 ---
  { id: 30, subject: 'science', topic: 'biology', q: '植物进行光合作用需要的条件不包括（  ）',
    opts: ['A. 阳光', 'B. 水', 'C. 二氧化碳', 'D. 氮气'], ans: 3, exp: '光合作用需要：阳光、水、二氧化碳，产生葡萄糖和氧气，不需要氮气。' },
  { id: 31, subject: 'science', topic: 'physics', q: '声音不能在（  ）中传播',
    opts: ['A. 空气', 'B. 水', 'C. 真空', 'D. 木头'], ans: 2, exp: '声音是机械波，需要介质传播，在真空中无法传播。' },
  { id: 32, subject: 'science', topic: 'earth',   q: '地球自转一圈大约需要（  ）',
    opts: ['A. 1小时', 'B. 1天', 'C. 1个月', 'D. 1年'], ans: 1, exp: '地球自转周期约为24小时，即1天，产生昼夜交替现象。' },
  { id: 33, subject: 'science', topic: 'health',  q: '人体最大的器官是（  ）',
    opts: ['A. 肝脏', 'B. 心脏', 'C. 皮肤', 'D. 大脑'], ans: 2, exp: '皮肤是人体面积最大的器官，具有保护、感觉、调温等功能。' },
  { id: 34, subject: 'science', topic: 'biology', q: '蚯蚓属于哪类动物？',
    opts: ['A. 昆虫', 'B. 环节动物', 'C. 软体动物', 'D. 爬行动物'], ans: 1, exp: '蚯蚓属于环节动物，身体由许多相似的体节组成，没有骨骼。' },
  { id: 35, subject: 'science', topic: 'physics', q: '凸透镜的主要作用是（  ）',
    opts: ['A. 发散光线', 'B. 汇聚光线', 'C. 吸收光线', 'D. 反射光线'], ans: 1, exp: '凸透镜（中间厚边缘薄）能使平行光汇聚于焦点，起汇聚光线的作用。' },

  // --- 历史 ---
  { id: 40, subject: 'history', topic: 'ancient', q: '中国历史上第一个统一的多民族国家是（  ）',
    opts: ['A. 夏朝', 'B. 周朝', 'C. 秦朝', 'D. 汉朝'], ans: 2, exp: '公元前221年，秦始皇灭六国，建立了中国历史上第一个统一的封建国家——秦朝。' },
  { id: 41, subject: 'history', topic: 'ancient', q: '"四大发明"中，发明活字印刷术的是（  ）',
    opts: ['A. 蔡伦', 'B. 毕昇', 'C. 张衡', 'D. 祖冲之'], ans: 1, exp: '北宋毕昇发明了活字印刷术，大大提高了印刷效率。蔡伦改进了造纸术。' },
  { id: 42, subject: 'history', topic: 'modern',  q: '中国近代史的开端是（  ）',
    opts: ['A. 太平天国运动', 'B. 鸦片战争', 'C. 甲午战争', 'D. 洋务运动'], ans: 1, exp: '1840年鸦片战争是中国近代史的开端，中国从此进入半殖民地半封建社会。' },
  { id: 43, subject: 'history', topic: 'world',   q: '古埃及文明的象征是（  ）',
    opts: ['A. 长城', 'B. 金字塔', 'C. 帕特农神庙', 'D. 泰姬陵'], ans: 1, exp: '金字塔是古埃及法老的陵墓，是古埃及文明最具代表性的建筑遗址。' },
  { id: 44, subject: 'history', topic: 'figures', q: '"海上丝绸之路"的开辟与哪位历史人物关系最密切？',
    opts: ['A. 张骞', 'B. 班超', 'C. 郑和', 'D. 鉴真'], ans: 2, exp: '明代郑和七下西洋，大大促进了海上丝绸之路的繁荣与发展。' },

  // --- 地理 ---
  { id: 50, subject: 'geography', topic: 'china_geo', q: '中国面积最大的省级行政区是（  ）',
    opts: ['A. 西藏', 'B. 内蒙古', 'C. 新疆', 'D. 青海'], ans: 2, exp: '新疆维吾尔自治区面积约166万平方千米，是中国面积最大的省级行政区。' },
  { id: 51, subject: 'geography', topic: 'world_geo', q: '世界上面积最大的大洲是（  ）',
    opts: ['A. 非洲', 'B. 北美洲', 'C. 亚洲', 'D. 南极洲'], ans: 2, exp: '亚洲面积约4400万平方千米，是世界上面积最大的大洲。' },
  { id: 52, subject: 'geography', topic: 'china_geo', q: '长江发源于（  ）',
    opts: ['A. 横断山脉', 'B. 青藏高原', 'C. 云贵高原', 'D. 秦岭'], ans: 1, exp: '长江发源于青藏高原的唐古拉山脉，是中国最长的河流。' },
  { id: 53, subject: 'geography', topic: 'climate',   q: '台风主要影响我国哪个方向的沿海地区？',
    opts: ['A. 东北沿海', 'B. 西北内陆', 'C. 东南沿海', 'D. 西南地区'], ans: 2, exp: '台风（热带气旋）主要在夏秋季节影响我国东南沿海地区，如广东、福建、浙江等地。' },
  { id: 54, subject: 'geography', topic: 'world_geo', q: '世界上最长的河流是（  ）',
    opts: ['A. 长江', 'B. 亚马逊河', 'C. 密西西比河', 'D. 尼罗河'], ans: 3, exp: '尼罗河全长约6670千米，是世界上最长的河流，流经非洲。' },

  // --- 道德法治 ---
  { id: 60, subject: 'morality', topic: 'law',     q: '我国对未成年人保护的专门法律是（  ）',
    opts: ['A. 民法典', 'B. 未成年人保护法', 'C. 刑法', 'D. 教育法'], ans: 1, exp: '《中华人民共和国未成年人保护法》专门保护18周岁以下未成年人的合法权益。' },
  { id: 61, subject: 'morality', topic: 'rights',  q: '我国规定的义务教育年限为（  ）',
    opts: ['A. 6年', 'B. 9年', 'C. 12年', 'D. 15年'], ans: 1, exp: '依据《义务教育法》，我国实行9年义务教育（小学6年+初中3年），国家保障公民接受这一教育。' },
  { id: 62, subject: 'morality', topic: 'nation',  q: '中华人民共和国成立于（  ）',
    opts: ['A. 1945年10月1日', 'B. 1949年10月1日', 'C. 1950年10月1日', 'D. 1949年9月30日'], ans: 1, exp: '1949年10月1日，毛泽东在天安门城楼宣布中华人民共和国成立。' },
  { id: 63, subject: 'morality', topic: 'society', q: '下列行为中属于文明行为的是（  ）',
    opts: ['A. 随地吐痰', 'B. 公共场所大声喧哗', 'C. 主动给老人让座', 'D. 乱扔垃圾'], ans: 2, exp: '主动给老人让座是尊老爱幼的文明行为，体现了社会公德。其余选项均为不文明行为。' },
];

// Expose to global scope
window.SUBJECTS = SUBJECTS;
window.QUESTIONS = QUESTIONS;
