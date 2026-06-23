/*
 * 英语练习内容数据（面向初学者 / 中小学）
 * 所有内容集中在此文件，方便老师/家长自行增删。
 * 修改后直接刷新页面即可生效，无需重新构建。
 */
window.AppData = {
  /* ---------------- 单词卡片 ---------------- */
  // 每个分类包含若干单词，word=英文, cn=中文, ipa=音标, example=例句
  vocabulary: [
    {
      category: "动物 Animals",
      icon: "🐾",
      words: [
        { word: "cat", cn: "猫", ipa: "/kæt/", example: "The cat is sleeping." },
        { word: "dog", cn: "狗", ipa: "/dɔːɡ/", example: "My dog likes to run." },
        { word: "rabbit", cn: "兔子", ipa: "/ˈræbɪt/", example: "A rabbit has long ears." },
        { word: "bird", cn: "鸟", ipa: "/bɜːrd/", example: "The bird can fly high." },
        { word: "fish", cn: "鱼", ipa: "/fɪʃ/", example: "Fish live in the water." },
        { word: "tiger", cn: "老虎", ipa: "/ˈtaɪɡər/", example: "The tiger is very strong." },
      ],
    },
    {
      category: "食物 Food",
      icon: "🍎",
      words: [
        { word: "apple", cn: "苹果", ipa: "/ˈæpl/", example: "I eat an apple every day." },
        { word: "bread", cn: "面包", ipa: "/bred/", example: "She bought some bread." },
        { word: "milk", cn: "牛奶", ipa: "/mɪlk/", example: "Milk is good for you." },
        { word: "rice", cn: "米饭", ipa: "/raɪs/", example: "We eat rice for dinner." },
        { word: "egg", cn: "鸡蛋", ipa: "/eɡ/", example: "He had an egg for breakfast." },
        { word: "water", cn: "水", ipa: "/ˈwɔːtər/", example: "Please drink more water." },
      ],
    },
    {
      category: "颜色 Colors",
      icon: "🎨",
      words: [
        { word: "red", cn: "红色", ipa: "/red/", example: "The apple is red." },
        { word: "blue", cn: "蓝色", ipa: "/bluː/", example: "The sky is blue." },
        { word: "green", cn: "绿色", ipa: "/ɡriːn/", example: "Grass is green." },
        { word: "yellow", cn: "黄色", ipa: "/ˈjeloʊ/", example: "The sun looks yellow." },
        { word: "black", cn: "黑色", ipa: "/blæk/", example: "I have a black bag." },
        { word: "white", cn: "白色", ipa: "/waɪt/", example: "Snow is white." },
      ],
    },
    {
      category: "学校 School",
      icon: "🏫",
      words: [
        { word: "book", cn: "书", ipa: "/bʊk/", example: "I read a book." },
        { word: "pen", cn: "钢笔", ipa: "/pen/", example: "Write with a pen." },
        { word: "teacher", cn: "老师", ipa: "/ˈtiːtʃər/", example: "Our teacher is kind." },
        { word: "student", cn: "学生", ipa: "/ˈstuːdnt/", example: "She is a good student." },
        { word: "desk", cn: "课桌", ipa: "/desk/", example: "My desk is clean." },
        { word: "class", cn: "课/班级", ipa: "/klæs/", example: "Our class is fun." },
      ],
    },
  ],

  /* ---------------- 语法选择题 ---------------- */
  // q=题干, options=选项, answer=正确选项下标(从0开始), explain=解析
  grammar: [
    {
      q: "She ___ a teacher.",
      options: ["am", "is", "are", "be"],
      answer: 1,
      explain: "主语 she 是第三人称单数，be 动词用 is。",
    },
    {
      q: "There are three ___ on the desk.",
      options: ["book", "books", "a book", "bookes"],
      answer: 1,
      explain: "three 表示复数，名词 book 要加 s 变成 books。",
    },
    {
      q: "I ___ to school every day.",
      options: ["goes", "going", "go", "gone"],
      answer: 2,
      explain: "主语 I 用动词原形 go，表示日常习惯。",
    },
    {
      q: "This is ___ apple.",
      options: ["a", "an", "the", "/"],
      answer: 1,
      explain: "apple 以元音音素开头，用 an。",
    },
    {
      q: "He ___ TV now.",
      options: ["watch", "watches", "is watching", "watched"],
      answer: 2,
      explain: "now 表示现在正在进行，用现在进行时 is watching。",
    },
    {
      q: "My brother is taller ___ me.",
      options: ["then", "than", "that", "as"],
      answer: 1,
      explain: "比较级后面用 than 引出比较对象。",
    },
    {
      q: "___ you like ice cream?",
      options: ["Are", "Is", "Do", "Does"],
      answer: 2,
      explain: "实义动词 like 的一般疑问句，主语 you 用 Do。",
    },
    {
      q: "There ___ some milk in the cup.",
      options: ["is", "are", "am", "be"],
      answer: 0,
      explain: "milk 是不可数名词，用 is。",
    },
    {
      q: "We had a lot of fun ___ the party.",
      options: ["in", "at", "on", "to"],
      answer: 1,
      explain: "在某次活动/聚会上用介词 at。",
    },
    {
      q: "Look! The children ___ in the park.",
      options: ["play", "plays", "are playing", "played"],
      answer: 2,
      explain: "Look! 提示正在发生，用现在进行时 are playing。",
    },
  ],

  /* ---------------- 听力练习 ---------------- */
  // 朗读 sentence，让学生选出听到的句子；options 含干扰项
  listening: [
    {
      sentence: "Good morning, how are you?",
      options: [
        "Good morning, how are you?",
        "Good evening, where are you?",
        "Good morning, how old are you?",
      ],
      answer: 0,
    },
    {
      sentence: "I have two red apples.",
      options: [
        "I have two red apples.",
        "I have ten red apples.",
        "I have two red bananas.",
      ],
      answer: 0,
    },
    {
      sentence: "The cat is under the table.",
      options: [
        "The cat is on the table.",
        "The cat is under the table.",
        "The dog is under the table.",
      ],
      answer: 1,
    },
    {
      sentence: "My favorite color is blue.",
      options: [
        "My favorite color is blue.",
        "My favorite color is green.",
        "My favorite animal is blue.",
      ],
      answer: 0,
    },
    {
      sentence: "We go to school by bus.",
      options: [
        "We go to school by car.",
        "We go to work by bus.",
        "We go to school by bus.",
      ],
      answer: 2,
    },
    {
      sentence: "She likes to read books at night.",
      options: [
        "She likes to read books at night.",
        "He likes to read books at night.",
        "She likes to write books at night.",
      ],
      answer: 0,
    },
  ],

  /* ---------------- 阅读理解 ---------------- */
  reading: [
    {
      title: "Tom's Day",
      passage:
        "Tom is a student. He gets up at seven o'clock every morning. He has breakfast with his family. Then he goes to school by bike. Tom likes English and music. After school, he plays football with his friends. In the evening, he does his homework and reads a book. Tom goes to bed at nine o'clock.",
      questions: [
        {
          q: "When does Tom get up?",
          options: ["At six o'clock", "At seven o'clock", "At nine o'clock"],
          answer: 1,
        },
        {
          q: "How does Tom go to school?",
          options: ["By bike", "By bus", "On foot"],
          answer: 0,
        },
        {
          q: "What does Tom do after school?",
          options: ["Reads a book", "Plays football", "Watches TV"],
          answer: 1,
        },
      ],
    },
    {
      title: "My Pet",
      passage:
        "I have a little dog. Its name is Lucky. Lucky is white and brown. It is two years old. Lucky likes to run and play with a ball. Every day I give it food and water. Lucky sleeps in a small house in our garden. I love my dog very much.",
      questions: [
        {
          q: "What is the dog's name?",
          options: ["Lucky", "Tom", "Bobby"],
          answer: 0,
        },
        {
          q: "What color is the dog?",
          options: ["Black and white", "White and brown", "Yellow"],
          answer: 1,
        },
        {
          q: "Where does the dog sleep?",
          options: ["In the garden", "On the bed", "In the kitchen"],
          answer: 0,
        },
      ],
    },
  ],
};
