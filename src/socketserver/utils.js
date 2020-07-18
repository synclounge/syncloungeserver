// TODO: add timeline

export const getNumberFromUsername = (username) => parseInt(username.match(/\((\d+)\)$/)[1], 10);

const s4 = () => Math.floor((1 + Math.random()) * 0x10000)
  .toString(16)
  .substring(1);

export const guid = () => s4() + s4() + s4() + s4();
