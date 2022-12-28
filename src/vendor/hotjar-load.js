export function load ({
                            hjid,
                            h = window,
                            o = document,
                            t = "https://static.hotjar.com/c/hotjar-",
                            j = ".js?sv=",
                            hjsv = 6,
                          } = {}) {
  h.hj =
    h.hj ||
    function () {
      (h.hj.q = h.hj.q || []).push(arguments);
    };
  h._hjSettings = { hjid, hjsv };
  var a = o.getElementsByTagName("head")[0];
  var r = o.createElement("script");
  r.async = 1;
  r.src = t + h._hjSettings.hjid + j + h._hjSettings.hjsv;
  a.appendChild(r);
  console.log("Got to end of load function");
}
