<template>
  <div>
    <div
      class="bg-black min-h-screen overflow-hidden"
      @click="documentHandleClickBox"
    >
      <div ref="screenContainer">
        <div id="screen"></div>
        <canvas id="vga"></canvas>
      </div>
    </div>
    <div class="mt-5 px-3 w-full flex justify-between">
      <button class="w-16" @click="documentHandleClickButtonPause">
        {{ emulatorExtendedInfo.isPaused ? "Resume" : "Pause" }}
      </button>
      <button class="w-28" @click="documentHandleClickButtonFullScreen">
        Full Screen
      </button>
      <button class="w-16" @click="documentHandleClickButtonReset">
        Reset
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: "HomeView",
  data: () => ({
    emulator: null,
    emulatorExtendedInfo: {
      isPaused: false,
      mouseEnabled: false,
    },
  }),
  computed: {
    emulatorEventMethods() {
      return [
        {
          name: "mouse-enable",
          method: (isEnabled) => {
            this.emulatorExtendedInfo.mouseEnabled = isEnabled;
          },
        },
        {
          name: "emulator-stopped",
          method: () => {
            this.documentRequestExitFullScreen();
          },
        },
      ];
    },
  },
  methods: {
    machineBoot() {
      // Define Config
      const config = {
        wasm_path: "./v86.wasm",
        memory_size: 256 * 1024 * 1024,
        vga_memory_size: 8 * 1024 * 1024,
        cdrom: {
          url: "./machine/system.iso",
          size: 56379392,
        },
        bios: {
          url: "./machine/bios/seabios.bin",
        },
        vga_bios: {
          url: "./machine/bios/vgabios.bin",
        },
        network_relay_url: "wss://relay.widgetry.org/",
        screen_container: this.$refs.screenContainer,
        autostart: true,
      };
      // Mount Machine
      const V86Starter = window.V86Starter;
      this.emulator = new V86Starter(config);
      // Return Machine
      return this.emulator;
    },
    machineSetupEventListener(machine) {
      for (const e of this.emulatorEventMethods) {
        machine.add_listener(e.name, e.method);
      }
    },
    machinePowerPause(machine) {
      if (!this.emulatorExtendedInfo.isPaused) {
        machine.stop();
        this.emulatorExtendedInfo.isPaused = true;
      } else {
        machine.run();
        this.emulatorExtendedInfo.isPaused = false;
      }
    },
    machinePowerReset(machine) {
      machine.restart();
    },
    documentLockMouse() {
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
    },
    documentRequestFullScreen() {
      const element = this.$refs.screenContainer;
      const method =
        element.requestFullscreen ||
        element.mozRequestFullScreen ||
        element.webkitRequestFullscreen ||
        element.msRequestFullscreen;
      if (method) {
        method.call(element);
      } else {
        console.warn("The browser is not support requestFullscreen");
      }
    },
    documentRequestExitFullScreen() {
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
    },
    documentHandleClickBox() {
      if (this.emulatorExtendedInfo.mouseEnabled) {
        this.documentLockMouse();
      }
    },
    documentHandleClickButtonPause() {
      this.machinePowerPause(this.emulator);
    },
    documentHandleClickButtonReset() {
      this.machinePowerReset(this.emulator);
    },
    documentHandleClickButtonFullScreen() {
      this.documentRequestFullScreen();
    },
  },
  mounted() {
    const machine = this.machineBoot();
    this.machineSetupEventListener(machine);
  },
};
</script>
