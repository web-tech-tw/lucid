<template>
  <div
    v-show="isShowProgressCircle"
    class="inline-flex items-center justify-center overflow-hidden rounded-full bg-white hover:cursor-pointer"
    @click="onClickButtonInitPower"
  >
    <svg class="w-20 h-20">
      <circle
        class="text-gray-300"
        stroke-width="5"
        stroke="currentColor"
        fill="transparent"
        r="30"
        cx="40"
        cy="40"
      />
      <circle
        class="text-blue-600"
        stroke-width="5"
        stroke-linecap="round"
        stroke="currentColor"
        fill="transparent"
        r="30"
        cx="40"
        cy="40"
        :stroke-dasharray="progressCircleSvgValue.strokeDasharray"
        :stroke-dashoffset="progressCircleSvgValue.strokeDashoffset"
      />
    </svg>
    <svg
      v-if="isShowInitPowerButton"
      xmlns="http://www.w3.org/2000/svg"
      class="h-6 w-6 absolute text-xl text-emerald-700"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      stroke-width="2"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M13 10V3L4 14h7v7l9-11h-7z"
      />
    </svg>
    <span
      v-else
      class="absolute text-xl text-blue-700"
    >
      {{ progressPercentageString }}
    </span>
  </div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  isPressed: {
    type: Boolean,
    required: true,
  },
  isRunning: {
    type: Boolean,
    required: true,
  },
  isDownloadCompleted: {
    type: Boolean,
    required: true,
  },
  progressTicks: {
    type: Number,
    required: true,
  },
});

const emits = defineEmits(["power-on"]);

const isShowInitPowerButton = computed(() => {
  return (
    (!props.isDownloadCompleted && !props.isPressed) ||
    (props.isDownloadCompleted && !props.isRunning)
  );
});

const isShowProgressCircle = computed(
  () => !props.isPressed || props.progressTicks >= 0,
);

const progressPercentage = computed(() => {
  const progressValue = props.progressTicks < 1 ? props.progressTicks : 1;
  return progressValue * 100;
});

const progressPercentageString = computed(() => {
  const value = progressPercentage.value;
  return `${value.toFixed(0)}%`;
});

const progressCircleSvgValue = computed(() => {
  const strokeDasharray = 30 * 2 * Math.PI;
  const strokeDashoffset = strokeDasharray - (progressPercentage.value / 100) * strokeDasharray
  return {strokeDasharray, strokeDashoffset};
});

const onClickButtonInitPower = () => {
    if (props.isPressed) return;
    emits("power-on");
};
</script>