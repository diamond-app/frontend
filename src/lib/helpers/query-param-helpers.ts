export const parseQueryParams = (url: string = window.location.href) => {
  const result = {};
  new URLSearchParams(new URL(url).search).forEach((v, k) => (result[k] = v));
  return result;
};
