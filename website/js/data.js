// 小学英语乐园 - 课程数据
// Vocabulary organized by grade and lesson

const CURRICULUM = {
    1: {
        name: '一年级 Grade 1',
        desc: '初识英语：字母、问候、数字',
        lessons: [
            {
                id: '1-1',
                title: '问候语 Greetings',
                words: [
                    { en: 'hello', zh: '你好', emoji: '👋' },
                    { en: 'hi', zh: '嗨', emoji: '🙋' },
                    { en: 'goodbye', zh: '再见', emoji: '👋' },
                    { en: 'bye', zh: '拜拜', emoji: '✌️' },
                    { en: 'yes', zh: '是', emoji: '✅' },
                    { en: 'no', zh: '不', emoji: '❌' },
                    { en: 'please', zh: '请', emoji: '🙏' },
                    { en: 'thanks', zh: '谢谢', emoji: '😊' }
                ]
            },
            {
                id: '1-2',
                title: '数字 Numbers 1-10',
                words: [
                    { en: 'one', zh: '一', emoji: '1️⃣' },
                    { en: 'two', zh: '二', emoji: '2️⃣' },
                    { en: 'three', zh: '三', emoji: '3️⃣' },
                    { en: 'four', zh: '四', emoji: '4️⃣' },
                    { en: 'five', zh: '五', emoji: '5️⃣' },
                    { en: 'six', zh: '六', emoji: '6️⃣' },
                    { en: 'seven', zh: '七', emoji: '7️⃣' },
                    { en: 'eight', zh: '八', emoji: '8️⃣' },
                    { en: 'nine', zh: '九', emoji: '9️⃣' },
                    { en: 'ten', zh: '十', emoji: '🔟' }
                ]
            },
            {
                id: '1-3',
                title: '颜色 Colors',
                words: [
                    { en: 'red', zh: '红色', emoji: '🔴' },
                    { en: 'blue', zh: '蓝色', emoji: '🔵' },
                    { en: 'yellow', zh: '黄色', emoji: '🟡' },
                    { en: 'green', zh: '绿色', emoji: '🟢' },
                    { en: 'black', zh: '黑色', emoji: '⚫' },
                    { en: 'white', zh: '白色', emoji: '⚪' },
                    { en: 'pink', zh: '粉色', emoji: '🌸' },
                    { en: 'orange', zh: '橙色', emoji: '🟠' }
                ]
            },
            {
                id: '1-4',
                title: '家庭成员 Family',
                words: [
                    { en: 'mom', zh: '妈妈', emoji: '👩' },
                    { en: 'dad', zh: '爸爸', emoji: '👨' },
                    { en: 'baby', zh: '宝宝', emoji: '👶' },
                    { en: 'brother', zh: '哥哥/弟弟', emoji: '👦' },
                    { en: 'sister', zh: '姐姐/妹妹', emoji: '👧' },
                    { en: 'grandpa', zh: '爷爷', emoji: '👴' },
                    { en: 'grandma', zh: '奶奶', emoji: '👵' },
                    { en: 'family', zh: '家庭', emoji: '👨‍👩‍👧‍👦' }
                ]
            }
        ]
    },
    2: {
        name: '二年级 Grade 2',
        desc: '日常生活：动物、食物、身体',
        lessons: [
            {
                id: '2-1',
                title: '动物 Animals',
                words: [
                    { en: 'cat', zh: '猫', emoji: '🐱' },
                    { en: 'dog', zh: '狗', emoji: '🐶' },
                    { en: 'pig', zh: '猪', emoji: '🐷' },
                    { en: 'cow', zh: '奶牛', emoji: '🐮' },
                    { en: 'duck', zh: '鸭子', emoji: '🦆' },
                    { en: 'bird', zh: '鸟', emoji: '🐦' },
                    { en: 'fish', zh: '鱼', emoji: '🐟' },
                    { en: 'rabbit', zh: '兔子', emoji: '🐰' },
                    { en: 'panda', zh: '熊猫', emoji: '🐼' },
                    { en: 'tiger', zh: '老虎', emoji: '🐯' }
                ]
            },
            {
                id: '2-2',
                title: '水果 Fruits',
                words: [
                    { en: 'apple', zh: '苹果', emoji: '🍎' },
                    { en: 'banana', zh: '香蕉', emoji: '🍌' },
                    { en: 'orange', zh: '橙子', emoji: '🍊' },
                    { en: 'pear', zh: '梨', emoji: '🍐' },
                    { en: 'grape', zh: '葡萄', emoji: '🍇' },
                    { en: 'peach', zh: '桃子', emoji: '🍑' },
                    { en: 'lemon', zh: '柠檬', emoji: '🍋' },
                    { en: 'watermelon', zh: '西瓜', emoji: '🍉' }
                ]
            },
            {
                id: '2-3',
                title: '身体部位 Body',
                words: [
                    { en: 'head', zh: '头', emoji: '🗣️' },
                    { en: 'eye', zh: '眼睛', emoji: '👁️' },
                    { en: 'ear', zh: '耳朵', emoji: '👂' },
                    { en: 'nose', zh: '鼻子', emoji: '👃' },
                    { en: 'mouth', zh: '嘴巴', emoji: '👄' },
                    { en: 'hand', zh: '手', emoji: '✋' },
                    { en: 'foot', zh: '脚', emoji: '🦶' },
                    { en: 'hair', zh: '头发', emoji: '💇' }
                ]
            },
            {
                id: '2-4',
                title: '食物 Food',
                words: [
                    { en: 'bread', zh: '面包', emoji: '🍞' },
                    { en: 'rice', zh: '米饭', emoji: '🍚' },
                    { en: 'noodles', zh: '面条', emoji: '🍜' },
                    { en: 'egg', zh: '鸡蛋', emoji: '🥚' },
                    { en: 'milk', zh: '牛奶', emoji: '🥛' },
                    { en: 'water', zh: '水', emoji: '💧' },
                    { en: 'cake', zh: '蛋糕', emoji: '🎂' },
                    { en: 'cookie', zh: '饼干', emoji: '🍪' }
                ]
            }
        ]
    },
    3: {
        name: '三年级 Grade 3',
        desc: '学校生活：文具、学科、教室',
        lessons: [
            {
                id: '3-1',
                title: '学习用品 School Things',
                words: [
                    { en: 'pen', zh: '钢笔', emoji: '🖊️' },
                    { en: 'pencil', zh: '铅笔', emoji: '✏️' },
                    { en: 'book', zh: '书', emoji: '📖' },
                    { en: 'bag', zh: '书包', emoji: '🎒' },
                    { en: 'ruler', zh: '尺子', emoji: '📏' },
                    { en: 'eraser', zh: '橡皮', emoji: '🧽' },
                    { en: 'paper', zh: '纸', emoji: '📄' },
                    { en: 'desk', zh: '书桌', emoji: '🪑' },
                    { en: 'chair', zh: '椅子', emoji: '💺' },
                    { en: 'board', zh: '黑板', emoji: '📋' }
                ]
            },
            {
                id: '3-2',
                title: '学校与学科 School',
                words: [
                    { en: 'school', zh: '学校', emoji: '🏫' },
                    { en: 'class', zh: '班级', emoji: '👨‍🏫' },
                    { en: 'teacher', zh: '老师', emoji: '🧑‍🏫' },
                    { en: 'student', zh: '学生', emoji: '🧑‍🎓' },
                    { en: 'math', zh: '数学', emoji: '➕' },
                    { en: 'English', zh: '英语', emoji: '🔤' },
                    { en: 'Chinese', zh: '语文', emoji: '📝' },
                    { en: 'music', zh: '音乐', emoji: '🎵' },
                    { en: 'art', zh: '美术', emoji: '🎨' }
                ]
            },
            {
                id: '3-3',
                title: '玩具 Toys',
                words: [
                    { en: 'ball', zh: '球', emoji: '⚽' },
                    { en: 'doll', zh: '洋娃娃', emoji: '🪆' },
                    { en: 'car', zh: '小汽车', emoji: '🚗' },
                    { en: 'kite', zh: '风筝', emoji: '🪁' },
                    { en: 'bike', zh: '自行车', emoji: '🚲' },
                    { en: 'plane', zh: '飞机', emoji: '✈️' },
                    { en: 'train', zh: '火车', emoji: '🚂' },
                    { en: 'boat', zh: '船', emoji: '⛵' }
                ]
            },
            {
                id: '3-4',
                title: '动作 Action Verbs',
                words: [
                    { en: 'run', zh: '跑', emoji: '🏃' },
                    { en: 'jump', zh: '跳', emoji: '🦘' },
                    { en: 'walk', zh: '走', emoji: '🚶' },
                    { en: 'sing', zh: '唱歌', emoji: '🎤' },
                    { en: 'dance', zh: '跳舞', emoji: '💃' },
                    { en: 'read', zh: '阅读', emoji: '📚' },
                    { en: 'write', zh: '写', emoji: '✍️' },
                    { en: 'draw', zh: '画画', emoji: '🖌️' }
                ]
            }
        ]
    },
    4: {
        name: '四年级 Grade 4',
        desc: '日常表达：时间、天气、地点',
        lessons: [
            {
                id: '4-1',
                title: '星期 Days of the Week',
                words: [
                    { en: 'Monday', zh: '星期一', emoji: '📅' },
                    { en: 'Tuesday', zh: '星期二', emoji: '📅' },
                    { en: 'Wednesday', zh: '星期三', emoji: '📅' },
                    { en: 'Thursday', zh: '星期四', emoji: '📅' },
                    { en: 'Friday', zh: '星期五', emoji: '📅' },
                    { en: 'Saturday', zh: '星期六', emoji: '🎉' },
                    { en: 'Sunday', zh: '星期日', emoji: '☀️' },
                    { en: 'weekend', zh: '周末', emoji: '🎊' }
                ]
            },
            {
                id: '4-2',
                title: '天气 Weather',
                words: [
                    { en: 'sunny', zh: '晴朗的', emoji: '☀️' },
                    { en: 'rainy', zh: '下雨的', emoji: '🌧️' },
                    { en: 'cloudy', zh: '多云的', emoji: '☁️' },
                    { en: 'windy', zh: '有风的', emoji: '💨' },
                    { en: 'snowy', zh: '下雪的', emoji: '❄️' },
                    { en: 'hot', zh: '热的', emoji: '🥵' },
                    { en: 'cold', zh: '冷的', emoji: '🥶' },
                    { en: 'warm', zh: '温暖的', emoji: '🌤️' }
                ]
            },
            {
                id: '4-3',
                title: '房间 Rooms',
                words: [
                    { en: 'bedroom', zh: '卧室', emoji: '🛏️' },
                    { en: 'kitchen', zh: '厨房', emoji: '🍳' },
                    { en: 'bathroom', zh: '浴室', emoji: '🛁' },
                    { en: 'living room', zh: '客厅', emoji: '🛋️' },
                    { en: 'window', zh: '窗户', emoji: '🪟' },
                    { en: 'door', zh: '门', emoji: '🚪' },
                    { en: 'bed', zh: '床', emoji: '🛏️' },
                    { en: 'lamp', zh: '灯', emoji: '💡' }
                ]
            },
            {
                id: '4-4',
                title: '衣服 Clothes',
                words: [
                    { en: 'shirt', zh: '衬衫', emoji: '👕' },
                    { en: 'pants', zh: '裤子', emoji: '👖' },
                    { en: 'dress', zh: '裙子', emoji: '👗' },
                    { en: 'hat', zh: '帽子', emoji: '👒' },
                    { en: 'shoes', zh: '鞋子', emoji: '👟' },
                    { en: 'socks', zh: '袜子', emoji: '🧦' },
                    { en: 'coat', zh: '外套', emoji: '🧥' },
                    { en: 'scarf', zh: '围巾', emoji: '🧣' }
                ]
            }
        ]
    },
    5: {
        name: '五年级 Grade 5',
        desc: '兴趣爱好：运动、爱好、性格',
        lessons: [
            {
                id: '5-1',
                title: '运动 Sports',
                words: [
                    { en: 'football', zh: '足球', emoji: '⚽' },
                    { en: 'basketball', zh: '篮球', emoji: '🏀' },
                    { en: 'tennis', zh: '网球', emoji: '🎾' },
                    { en: 'swimming', zh: '游泳', emoji: '🏊' },
                    { en: 'running', zh: '跑步', emoji: '🏃' },
                    { en: 'baseball', zh: '棒球', emoji: '⚾' },
                    { en: 'badminton', zh: '羽毛球', emoji: '🏸' },
                    { en: 'skating', zh: '滑冰', emoji: '⛸️' }
                ]
            },
            {
                id: '5-2',
                title: '爱好 Hobbies',
                words: [
                    { en: 'reading', zh: '阅读', emoji: '📚' },
                    { en: 'drawing', zh: '画画', emoji: '🎨' },
                    { en: 'cooking', zh: '烹饪', emoji: '👨‍🍳' },
                    { en: 'gardening', zh: '园艺', emoji: '🌱' },
                    { en: 'fishing', zh: '钓鱼', emoji: '🎣' },
                    { en: 'traveling', zh: '旅行', emoji: '🧳' },
                    { en: 'photography', zh: '摄影', emoji: '📷' },
                    { en: 'collecting', zh: '收集', emoji: '🗂️' }
                ]
            },
            {
                id: '5-3',
                title: '形容词 Adjectives',
                words: [
                    { en: 'happy', zh: '开心的', emoji: '😊' },
                    { en: 'sad', zh: '伤心的', emoji: '😢' },
                    { en: 'angry', zh: '生气的', emoji: '😠' },
                    { en: 'tired', zh: '累的', emoji: '😴' },
                    { en: 'big', zh: '大的', emoji: '🐘' },
                    { en: 'small', zh: '小的', emoji: '🐭' },
                    { en: 'tall', zh: '高的', emoji: '🦒' },
                    { en: 'short', zh: '矮的/短的', emoji: '🐢' },
                    { en: 'fast', zh: '快的', emoji: '🐆' },
                    { en: 'slow', zh: '慢的', emoji: '🐌' }
                ]
            },
            {
                id: '5-4',
                title: '职业 Jobs',
                words: [
                    { en: 'doctor', zh: '医生', emoji: '👨‍⚕️' },
                    { en: 'nurse', zh: '护士', emoji: '👩‍⚕️' },
                    { en: 'farmer', zh: '农民', emoji: '👨‍🌾' },
                    { en: 'cook', zh: '厨师', emoji: '👨‍🍳' },
                    { en: 'driver', zh: '司机', emoji: '🚕' },
                    { en: 'police', zh: '警察', emoji: '👮' },
                    { en: 'singer', zh: '歌手', emoji: '🎤' },
                    { en: 'artist', zh: '艺术家', emoji: '🎨' }
                ]
            }
        ]
    },
    6: {
        name: '六年级 Grade 6',
        desc: '丰富表达：自然、节日、国家',
        lessons: [
            {
                id: '6-1',
                title: '大自然 Nature',
                words: [
                    { en: 'mountain', zh: '山', emoji: '⛰️' },
                    { en: 'river', zh: '河', emoji: '🏞️' },
                    { en: 'sea', zh: '海', emoji: '🌊' },
                    { en: 'forest', zh: '森林', emoji: '🌲' },
                    { en: 'flower', zh: '花', emoji: '🌸' },
                    { en: 'tree', zh: '树', emoji: '🌳' },
                    { en: 'grass', zh: '草', emoji: '🌿' },
                    { en: 'sun', zh: '太阳', emoji: '☀️' },
                    { en: 'moon', zh: '月亮', emoji: '🌙' },
                    { en: 'star', zh: '星星', emoji: '⭐' }
                ]
            },
            {
                id: '6-2',
                title: '节日 Festivals',
                words: [
                    { en: 'Christmas', zh: '圣诞节', emoji: '🎄' },
                    { en: 'birthday', zh: '生日', emoji: '🎂' },
                    { en: 'holiday', zh: '假日', emoji: '🏖️' },
                    { en: 'party', zh: '聚会', emoji: '🎉' },
                    { en: 'gift', zh: '礼物', emoji: '🎁' },
                    { en: 'candle', zh: '蜡烛', emoji: '🕯️' },
                    { en: 'balloon', zh: '气球', emoji: '🎈' },
                    { en: 'firework', zh: '烟花', emoji: '🎆' }
                ]
            },
            {
                id: '6-3',
                title: '交通工具 Transport',
                words: [
                    { en: 'bus', zh: '公共汽车', emoji: '🚌' },
                    { en: 'taxi', zh: '出租车', emoji: '🚕' },
                    { en: 'subway', zh: '地铁', emoji: '🚇' },
                    { en: 'ship', zh: '轮船', emoji: '🚢' },
                    { en: 'helicopter', zh: '直升机', emoji: '🚁' },
                    { en: 'truck', zh: '卡车', emoji: '🚚' },
                    { en: 'motorbike', zh: '摩托车', emoji: '🏍️' },
                    { en: 'rocket', zh: '火箭', emoji: '🚀' }
                ]
            },
            {
                id: '6-4',
                title: '国家 Countries',
                words: [
                    { en: 'China', zh: '中国', emoji: '🇨🇳' },
                    { en: 'America', zh: '美国', emoji: '🇺🇸' },
                    { en: 'England', zh: '英国', emoji: '🇬🇧' },
                    { en: 'France', zh: '法国', emoji: '🇫🇷' },
                    { en: 'Japan', zh: '日本', emoji: '🇯🇵' },
                    { en: 'Korea', zh: '韩国', emoji: '🇰🇷' },
                    { en: 'Canada', zh: '加拿大', emoji: '🇨🇦' },
                    { en: 'Australia', zh: '澳大利亚', emoji: '🇦🇺' }
                ]
            }
        ]
    }
};

// Build a flat list of all words for quick access
function getAllWords() {
    const all = [];
    for (const grade in CURRICULUM) {
        CURRICULUM[grade].lessons.forEach(lesson => {
            lesson.words.forEach(w => {
                all.push({ ...w, grade: Number(grade), lessonId: lesson.id, lessonTitle: lesson.title });
            });
        });
    }
    return all;
}

function getWordsByGrade(grade) {
    const all = [];
    if (!CURRICULUM[grade]) return all;
    CURRICULUM[grade].lessons.forEach(lesson => {
        lesson.words.forEach(w => all.push({ ...w, grade, lessonId: lesson.id }));
    });
    return all;
}
