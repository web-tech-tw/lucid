<template>
  <div>
    <power-button
      class="fixed top-3 right-0 md:right-1/2 2xl:right-2"
      :is-pressed="isPowerPressed"
      :is-running="isEmulatorRunning"
      :is-download-completed="isDownloadCompleted"
      :progress-ticks="progressTicks"
      @power-on="emulatorPowerBoot"
    />
    <div
      ref="screenContainer"
      class="bg-black overflow-hidden"
      :style="screenContainerStyle"
      @click="onClickBox"
    >
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
    <div
      v-show="!isShowInitPowerButton"
      class="mt-5 px-3 w-full flex justify-between"
    >
      <button
        class="w-16 text-base font-medium text-gray-600 hover:text-gray-500"
        @click="onClickPower"
      >
        電源
      </button>
      <button
        class="w-16 text-base font-medium text-gray-600 hover:text-gray-500"
        @click="onClickPause"
      >
        {{ emulatorExtendedInfo.isPaused ? "恢復" : "暫停" }}
      </button>
      <button
        class="w-16 text-base font-medium text-gray-600 hover:text-gray-500"
        @click="onClickReset"
      >
        重置
      </button>
      <button
        v-show="isTouchDevice"
        class="w-28 text-base font-medium text-gray-600 hover:text-gray-500"
        @click="onClickCallSmartphoneVirtualKeyboard"
      >
        呼出虛擬鍵盤
      </button>
      <button
        class="w-28 text-base font-medium text-gray-600 hover:text-gray-500"
        @click="onClickFullScreen"
      >
        進入全螢幕
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';

import PowerButton from '../components/PowerButton.vue';

const progressTicks = ref(-1);

const screenContainer = ref(null);
const screenContainerHeight = ref(0);
const virtualKeyboardCaller = ref(null);
const virtualKeyboardBlackHole = ref(" ");

const isPowerPressed = ref(false);
const isDownloadCompleted = ref(false);

const emulator = ref(null);
const emulatorExtendedInfo = ref({
  isPaused: false,
  mouseEnabled: false,
});

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

const isShowInitPowerButton = computed(() => {
  return (
    (!isDownloadCompleted.value && !isPowerPressed.value) ||
    (isDownloadCompleted.value && !isEmulatorRunning.value)
  );
});

const screenContainerStyle = computed(() => {
  const height = screenContainerHeight.value;
  return `width: 100%; height: ${height}px;`;
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
      requestAnimationFrame(() => {
        onResizeScreen();
      });
    },
  },
  {
    name: "screen-set-size-graphical",
    method: () => {
      requestAnimationFrame(() => {
        onResizeScreen();
      });
    },
  },
  {
    name: "emulator-stopped",
    method: () => {
      if (!isInFullScreen.value) return;
      onExitFullscreen();
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

function currentEmulatorScreenState() {
  let isGraphic = false;
  let width = 640;
  let height = 480;

  const vgaState = emulator.value?.v86?.cpu?.devices?.vga;
  if (isEmulatorRunning.value && vgaState) {
    isGraphic = vgaState.graphical_mode;
    width = vgaState.screen_width || width;
    height = vgaState.screen_height || height;
    console.log(vgaState, isGraphic, width, height);
  }

  return {isGraphic, width, height};
}

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
  const {V86Starter: V86} = window;
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
window.emulatorScreenSetScale = emulatorScreenSetScale;

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

function onRequestPointerLock() {
  const element = document.body;
  const requestPointerLock =
    element.requestPointerLock ||
    element.mozRequestPointerLock ||
    element.webkitRequestPointerLock ||
    element.msRequestPointerLock;
  if (!requestPointerLock) {
    console.warn("The browser is not support requestPointerLock");
    return;
  }
  requestPointerLock.call(element);
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

function onExitFullscreen() {
  const exitFullscreen =
    document.exitFullscreen ||
    document.mozCancelFullScreen ||
    document.webkitExitFullscreen ||
    document.msExitFullscreen;
  if (!exitFullscreen) {
    console.warn("The browser is not support exitFullscreen");
    return;
  }
  exitFullscreen.call(element);
}

function onResizeScreen() {
  if (!isEmulatorRunning.value) {
    return;
  }

  const emulatorScreenState = currentEmulatorScreenState();
  if (!emulatorScreenState.isGraphic) {
    emulatorScreenSetScale(1);
    return;
  }

  const {clientWidth} = document.body;
  const {
    width: emulatorWidth,
    height: emulatorHeight,
  } = emulatorScreenState;
  const widthScale = clientWidth / emulatorWidth;

  const scale = widthScale > 1 ? 1 : widthScale;
  emulatorScreenSetScale(scale);
  screenContainerHeight.value = emulatorHeight * scale;
}

function onClickBox() {
  if (emulatorExtendedInfo.value.mouseEnabled) {
    onRequestPointerLock();
  }
}

function onClickPower() {
  emulatorPowerBoot();
}

function onClickPause() {
  emulatorPowerPause();
}

function onClickReset() {
  emulatorPowerReset();
}

function onClickFullScreen() {
  onRequestFullScreen();
}

function onClickCallSmartphoneVirtualKeyboard() {
  virtualKeyboardCaller.value.focus();
}

onMounted(() => {
  window.addEventListener("resize", onResizeScreen);

  const emulatorScreenState = currentEmulatorScreenState();
  screenContainerHeight.value = emulatorScreenState.height;

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
