// TODO: add timeline

export const getNumberFromUsername = (username) => parseInt(username.match(/\((\d+)\)$/)[1], 10);

