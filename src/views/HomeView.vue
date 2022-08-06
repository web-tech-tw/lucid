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
    systemProfile: {
      default: {
        memory_size: 64 * 1024 * 1024,
        vga_memory_size: 8 * 1024 * 1024,
        cdrom: {
          url: "./default/system.iso",
          size: 23068672,
        },
      },
    },
  }),
  computed: {
    screenContainer() {
      return this.$refs.screenContainer;
    },
  },
  methods: {
    machineBoot(baseProfile) {
      const system = { ...baseProfile };
      // Setup BIOS
      system.bios = {
        url: "./default/bios/seabios.bin",
      };
      system.vga_bios = {
        url: "./default/bios/vgabios.bin",
      };
      // Setup Network Relay
      system.network_relay_url = "wss://relay.widgetry.org/";
      // Setup Screen Container
      system.screen_container = this.screenContainer;
      // Setup Auto Start
      system.autostart = true;
      // Mount Machine
      const V86Starter = window.V86Starter;
      this.emulator = new V86Starter(system);
      // Return Machine
      return this.emulator;
    },
  },
  mounted() {
    const params = new URLSearchParams(window.location.search);
    const profileName = params.get("profile");
    const baseProfile =
      this.systemProfile[profileName] || this.systemProfile.default;
    this.machineBoot(baseProfile);
  },
};
</script>
