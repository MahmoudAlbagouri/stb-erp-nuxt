// utils/echarts-setup.ts
// ✅ ECharts بما تحتاجه رسومنا فقط (خط، عمود، دائرة). هذا الملف لا يُستورد
// مباشرة: ChartBox يحمّله بـ import() عند ظهور أول رسم، فيبقى خارج حزمة
// الصفحة (≈180KB مضغوط) ويُحمَّل مرة واحدة لكل التطبيق.

import { BarChart, LineChart, PieChart } from "echarts/charts";
import {
  AriaComponent,
  GridComponent,
  TooltipComponent,
} from "echarts/components";
import { use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";

use([
  CanvasRenderer,
  LineChart,
  BarChart,
  PieChart,
  GridComponent,
  TooltipComponent,
  AriaComponent,
]);

export { default as VChart } from "vue-echarts";
