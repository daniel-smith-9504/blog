import GroupLine from "~icons/ri/group-line";
import Question from "~icons/ri/question-answer-line";
import CheckLine from "~icons/ri/chat-check-line";
import Smile from "~icons/ri/star-smile-line";

const days = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

/** 访客数、评论数、文章数、总浏览量 */
const chartData = [
  {
    icon: GroupLine,
    bgColor: "#effaff",
    color: "#41b6ff",
    duration: 2200,
    name: "访客数",
    value: 0,
    percent: "",
    data: [] // 平滑折线图数据
  },
  {
    icon: Question,
    bgColor: "#fff5f4",
    color: "#e85f33",
    duration: 1600,
    name: "评论数",
    value: 0,
    percent: "",
    data: []
  },
  {
    icon: CheckLine,
    bgColor: "#eff8f4",
    color: "#26ce83",
    duration: 1500,
    name: "文章数",
    value: 0,
    percent: "",
    data: []
  },
  {
    icon: Smile,
    bgColor: "#f6f4fe",
    color: "#7846e5",
    duration: 100,
    name: "总浏览量",
    value: 0,
    percent: "",
    data: []
  }
];

/** 分析概览 */
const barChartData = [
  {
    requireData: [0, 0, 0, 0, 0, 0, 0],
    questionData: [0, 0, 0, 0, 0, 0, 0]
  },
  {
    requireData: [0, 0, 0, 0, 0, 0, 0],
    questionData: [0, 0, 0, 0, 0, 0, 0]
  }
];

/** 数据统计 */
const tableData: any[] = [];

/** 最新动态 */
const latestNewsData: any[] = [];

export { chartData, barChartData, tableData, latestNewsData, days };
