export const title = "Lucid";
export const subtitle = "x86-compatible Linux virtual machine";

export const isSaraEnabled = false;
export const onClickSara = () => {
  const {
    VITE_SARA_INTE_HOST: saraInteHost,
  } = import.meta.env;
  location.assign(saraInteHost);
};

export const menuItems = [];
