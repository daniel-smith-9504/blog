<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useDark, useECharts } from "@pureadmin/utils";

const props = defineProps({
  value: {
    type: Number,
    default: 0
  }
});

const { isDark } = useDark();

const theme = computed(() => (isDark.value ? "dark" : "light"));

const chartRef = ref();
const { setOptions } = useECharts(chartRef, {
  theme,
  renderer: "svg"
});

function updateChart() {
  setOptions({
    container: ".line-card",
    title: {
      text: `${props.value}%`,
      left: "47%",
      top: "30%",
      textAlign: "center",
      textStyle: {
        fontSize: "16",
        fontWeight: 600
      }
    },
    polar: {
      radius: ["100%", "90%"],
      center: ["50%", "50%"]
    },
    angleAxis: {
      max: 100,
      show: false
    },
    radiusAxis: {
      type: "category",
      show: true,
      axisLabel: {
        show: false
      },
      axisLine: {
        show: false
      },
      axisTick: {
        show: false
      }
    },
    series: [
      {
        type: "bar",
        roundCap: true,
        barWidth: 2,
        showBackground: true,
        backgroundStyle: {
          color: "#dfe7ef"
        },
        data: [props.value],
        coordinateSystem: "polar",
        color: "#7846e5",
        itemStyle: {
          shadowBlur: 2,
          shadowColor: "#7846e5",
          shadowOffsetX: 0,
          shadowOffsetY: 0
        }
      }
    ]
  });
}

updateChart();
watch(() => props.value, updateChart);
</script>

<template>
  <div ref="chartRef" style="width: 100%; height: 60px" />
</template>
