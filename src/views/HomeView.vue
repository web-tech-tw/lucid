<template>
  <div>
    <div
      v-show="isShowProgressCircle"
      class="fixed inline-flex items-center justify-center overflow-hidden rounded-full top-3 right-0 md:right-1/2 2xl:right-2 bg-white hover:cursor-pointer"
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
    <div
      class="bg-black h-96 overflow-hidden"
      @click="onClickBox"
    >
      <div ref="screenContainer">
        <div id="screen" />
        <canvas
          id="vga"
          class="mx-auto"
        />
        <div id="virtual-keyboard-caller-box">
          <textarea
            id="virtual-keyboard-caller"
            ref="virtualKeyboardCaller"
            v-model="virtualKeyboardBlackHole"
            autocorrect="off"
            autocapitalize="none"
            spellcheck="false"
            tabindex="0"
          />
        </div>
      </div>
    </div>
    <div
      v-show="!isShowInitPowerButton"
      class="mt-5 px-3 w-full flex justify-between"
    >
      <button
        class="w-16 text-base font-medium text-gray-600 hover:text-gray-500"
        @click="onClickButtonPower"
      >
        電源
      </button>
      <button
        class="w-16 text-base font-medium text-gray-600 hover:text-gray-500"
        @click="onClickButtonPause"
      >
        {{ emulatorExtendedInfo.isPaused ? "恢復" : "暫停" }}
      </button>
      <button
        class="w-16 text-base font-medium text-gray-600 hover:text-gray-500"
        @click="onClickButtonReset"
      >
        重置
      </button>
      <button
        v-show="isTouchDevice"
        class="w-28 text-base font-medium text-gray-600 hover:text-gray-500"
        @click="onClickButtonCallSmartphoneVirtualKeyboard"
      >
        呼出虛擬鍵盤
      </button>
      <button
        class="w-28 text-base font-medium text-gray-600 hover:text-gray-500"
        @click="onClickButtonFullScreen"
      >
        進入全螢幕
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, h } from 'vue';

const screenContainer = ref(null);
const virtualKeyboardCaller = ref(null);

const isPowerPressed = ref(false);
const isDownloadCompleted = ref(false);
const progressTicks = ref(-1);

const emulator = ref(null);
const emulatorExtendedInfo = ref({
  isPaused: false,
  mouseEnabled: false,
});

const restoreFile = ref(null);
const virtualKeyboardBlackHole = ref(" ");

const isTouchDevice =
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    navigator.msMaxTouchPoints > 0;

const systemProfile = {
  xpud: {
    memory_size: 512 * 1024 * 1024,
    vga_memory_size: 32 * 1024 * 1024,
    cdrom: {
      url: "./machine/xpud.iso",
      size: 66529280,
    },
  },
};

const isEmulatorRunning = computed(() => {
  if (emulatorExtendedInfo.value.isPaused) return true;
  return emulator.value && emulator.value.is_running();
});

const isInFullScreen = computed(
  () => !!document.fullscreenElement,
);

const isShowProgressCircle = computed(
  () => !isPowerPressed.value || progressTicks.value >= 0,
);

const isShowInitPowerButton = computed(() => {
  return (
    (!isDownloadCompleted.value && !isPowerPressed.value) ||
    (isDownloadCompleted.value && !isEmulatorRunning.value)
  );
});

const progressPercentage = computed(() => {
  const progressValue = progressTicks.value < 1 ? progressTicks.value : 1;
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

const emulatorScreenInfo = computed(() => {
  if (!emulator.value) return {};
  return emulator.value.v86.cpu.devices.vga.stats;
});

const emulatorEventMethods = [
  {
    name: "download-progress",
    method: (e) => {
      progressTicks.value = 0;

      if (e.file_name.endsWith(".wasm")) {
        const filenameRaw = e.file_name.split("/");
        const filename = filenameRaw[filenameRaw.length - 1];
        lucidLog(`Fetching "${filename}" ...`);
        return;
      }

      if (
        e.file_index === e.file_count - 1 &&
        e.loaded >= e.total - 2048
      ) {
        isDownloadCompleted.value = true;
        lucidLog("Download completed!");
        if (!isPowerPressed.value) {
          lucidLog("Click power button to start.");
        }
        progressTicks.value = -1;
        return;
      }

      if (typeof e.file_index === "number" && e.file_count) {
        lucidLog(
          `Downloading images (${e.file_index + 1}/${e.file_count}) ...`
        );
      }

      if (e.total && typeof e.loaded === "number") {
        progressTicks.value = e.loaded / e.total;
      } else {
        lucidLog(`Progress: ${progressTicks.value++ % 50}`);
      }
    },
  },
  {
    name: "download-error",
    method: (e) => {
      progressTicks.value = 0;
      progressState.value = `
        Error: Loading "${e.file_name}" failed.
        Check your connection and reload the page to try again later.
      `;
    },
  },
  {
    name: "mouse-enable",
    method: (isEnabled) => {
      emulatorExtendedInfo.value.mouseEnabled = isEnabled;
    },
  },
  {
    name: "screen-set-mode",
    method: () => {
      onResizeScreen();
    },
  },
  {
    name: "screen-set-size-graphical",
    method: () => {
      onResizeScreen();
    },
  },
  {
    name: "emulator-stopped",
    method: () => {
      if (!isInFullScreen.value) return;
      onRequestExitFullScreen();
    },
  },
];

watch(isDownloadCompleted, (isCompleted) => {
  if (!isCompleted || !isPowerPressed.value) return;
  setTimeout(() => {
    emulatorPowerBoot();
  }, 500);
});

watch(virtualKeyboardBlackHole, (newValue) => {
  if (newValue === " ") return;
  if (newValue === "") {
    const value = 0x00e; // Backspace
    emulatorSendKeyboardCode(value);
  } else {
    const value = newValue.substring(1);
    emulatorSendKeyboardText(value);
  }
  window.requestAnimationFrame(() => {
    virtualKeyboardBlackHole.value = " ";
  });
});

function lucidLog(message) {
  console.info(`[Lucid] ${message}`);
}

function currentEmulator() {
  return emulator.value;
}
window.currentEmulator = currentEmulator;

function emulatorProfile(params) {
  // Read Parameters
  const profileName = params.get("profile");
  const networkRelayUrl = params.get("network_relay_url");

  // Retireve Profile
  const profile = {
    wasm_path: "./v86.wasm",
    bios: {
      url: "./machine/bios/seabios.bin",
    },
    vga_bios: {
      url: "./machine/bios/vgabios.bin",
    },
    screen_container: screenContainer.value,
    network_relay_url: networkRelayUrl || "wss://relay.widgetry.org/",
    ...(systemProfile[profileName] || systemProfile["xpud"]),
  };

  // Return Profile
  return profile;
}

function emulatorSetup(profile) {
  // Setup Emulator
  const {V86} = window;
  emulator.value = new V86(profile);
}

function emulatorAttachEvents() {
  // Attach Emulator Events
  for (const e of emulatorEventMethods) {
    emulator.value.add_listener(e.name, e.method);
  }
}

function emulatorScreenSetScale(scale) {
  emulator.value.screen_set_scale(scale);
}

async function emulatorStateSave() {
  // Save the state of the emulator
  const state = await emulator.value.save_state();
  const stateObject = new Blob([state]);
  // Create virtual download link
  const a = document.createElement("a");
  a.download = `lucid-state.bin`;
  a.href = window.URL.createObjectURL(stateObject);
  a.dataset.downloadurl = `application/octet-stream:${a.download}:${a.href}`;
  // Trigger virtual download link
  a.click();
}
window.emulatorStateSave = emulatorStateSave;

function emulatorStateRestore(file) {
  emulator.value.stop();

  const filereader = new FileReader();

  filereader.onload = (e) => {
    emulator.value.restore_state(e.target.result);
    emulator.value.run();
  };

  filereader.readAsArrayBuffer(file);
}
window.emulatorStateRestore = emulatorStateRestore;

function emulatorPowerBoot() {
  isPowerPressed.value = true;
  if (!isDownloadCompleted.value) return;
  if (isEmulatorRunning.value) {
    emulator.value.stop();
    emulator.value.restart();
  } else {
    emulator.value.run();
  }
}

function emulatorSendKeyboardText(text) {
  emulator.value.keyboard_send_text(text);
}

function emulatorSendKeyboardCode(code) {
  emulator.value.bus.send("keyboard-code", code);
}

function emulatorPowerPause() {
  if (emulatorExtendedInfo.value.isPaused) {
    emulator.value.run();
    emulatorExtendedInfo.value.isPaused = false;
  } else {
    emulator.value.stop();
    emulatorExtendedInfo.value.isPaused = true;
  }
}

function emulatorPowerReset() {
  emulator.value.restart();
}

function onLockMouse() {
  const body = document.body;
  const method =
    body.requestPointerLock ||
    body.mozRequestPointerLock ||
    body.webkitRequestPointerLock ||
    body.msRequestPointerLock;
  if (method) {
    method.call(body);
  } else {
    console.warn("The browser is not support requestPointerLock");
  }
}

function onRequestFullScreen() {
  const element = screenContainer.value;
  const requestFullscreen =
    element.requestFullscreen ||
    element.mozRequestFullScreen ||
    element.webkitRequestFullscreen ||
    element.msRequestFullscreen;
  if (!requestFullscreen) {
    console.warn("The browser is not support requestFullscreen");
    return;
  }
  requestFullscreen.call(element);
}

function onRequestExitFullScreen() {
  const method =
    document.exitFullscreen ||
    document.mozCancelFullScreen ||
    document.webkitExitFullscreen ||
    document.msExitFullscreen;
  if (method) {
    method.call(document);
  } else {
    console.warn("The browser is not support exitFullscreen");
  }
}

function onResizeScreen() {
  if (!isEmulatorRunning.value) return;
  if (!emulatorScreenInfo.value.is_graphical) {
    emulatorScreenSetScale(1);
  }
  const documentScreen = {
    width: screenContainer.value.clientWidth || 1,
    height: screenContainer.value.clientHeight || 1,
  };
  const emulatorScreen = {
    width: emulatorScreenInfo.value.res_x || 1,
    height: emulatorScreenInfo.value.res_y || 1,
  };
  if (documentScreen.height > documentScreen.width) {
    const widthScale = documentScreen.width / emulatorScreen.width;
    const heightScale = documentScreen.height / emulatorScreen.height;
    const scale = Math.min(widthScale, heightScale);
    emulatorScreenSetScale(scale);
    console.log(scale);
  } else {
    emulatorScreenSetScale(1);
  }
}

function onChangeRestoreFile(e) {
  restoreFile.value = e.target.files[0];
}

function onClickBox() {
  if (emulatorExtendedInfo.value.mouseEnabled) {
    onLockMouse();
  }
}

function onClickButtonInitPower() {
  if (isPowerPressed.value) return;
  emulatorPowerBoot();
}

function onClickButtonPower() {
  emulatorPowerBoot();
}

function onClickButtonPause() {
  emulatorPowerPause();
}

function onClickButtonReset() {
  emulatorPowerReset();
}

function onClickButtonFullScreen() {
  onRequestFullScreen();
}

function onClickButtonCallSmartphoneVirtualKeyboard() {
  virtualKeyboardCaller.value.focus();
}

onMounted(() => {
  window.addEventListener("resize", onResizeScreen);
  onResizeScreen();

  const params = new URLSearchParams(window.location.search);
  const profile = emulatorProfile(params);
  emulatorSetup(profile);
  emulatorAttachEvents();
});

onUnmounted(() => {
  window.removeEventListener("resize", onResizeScreen);
});
</script>

<style scoped>
#virtual-keyboard-caller-box {
  position: absolute;
  top: 0;
  z-index: 10;
}

#virtual-keyboard-caller {
  width: 0;
  height: 0;
  resize: none;
  position: absolute;
  opacity: 0;
  left: -9999em;
  top: 0;
  z-index: -10;
  white-space: nowrap;
  overflow: hidden;
}
</style>
