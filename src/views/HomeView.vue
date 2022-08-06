<template>
  <div class="bg-black h-screen">
    <div ref="screenContainer">
      <div id="screen"></div>
      <canvas id="vga"></canvas>
    </div>
  </div>
</template>

<script>
export default {
  name: "HomeView",
  data: () => ({
    emulator: null,
    emulatorExtendedInfo: {},
  }),
  methods: {
    machineBoot() {
      // Define Config
      const config = {
        wasm_path: "./v86.wasm",
        memory_size: 256 * 1024 * 1024,
        vga_memory_size: 8 * 1024 * 1024,
        cdrom: {
          url: "./machine/system.iso",
          size: 45088768,
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
  },
  mounted() {
    this.machineBoot();
  },
};
</script>
