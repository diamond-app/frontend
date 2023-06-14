// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  uploadImageHostname: "node.deso.org",
  verificationEndpointHostname: "https://node.deso.org",
  uploadVideoHostname: "media.deso.org",
  identityURL: "https://identity.deso.org",
  apiInternalHostname: "https://diamondapp.com",
  webPushServerVapidPublicKey:
    "BBt2v52sa0J-1D6w25XGk-eXqSOWdnfddV256XXI1B-UZlfX-HSIDzv4TkXbTLhHHNjDc45yZ8jsZWsXWg2CbF0",
  supportEmail: "",
  dd: {
    apiKey: "DCEB26AC8BF47F1D7B4D87440EDCA6",
    jsPath: "https://diamondapp.com/tags.js",
    ajaxListenerPath: "diamondapp.com/api",
    endpoint: "https://diamondapp.com/js/",
  },
  amplitude: {
    key: "ba127556985bcf271b9bb1eee6834918",
    domain: "amp.diamondapp.com",
  },
  heap: {
    appId: "1382101420",
  },
  hotjar: {
    hjid: "",
  },
  node: {
    id: 3,
    name: "Diamond",
    url: "https://diamondapp.com",
    logoAssetDir: "/assets/diamond/",
  },
  megaswapURL: "https://heroswap.com",
  megaswapAPI: "https://heroswap.com",
  megaswapAffiliateAddress: "BC1YLgTKfwSeHuNWtuqQmwduJM2QZ7ZQ9C7HFuLpyXuunUN7zTEr5WL",
  openfundURL: "https://openfund.com",
  setuAPI: "https://web3setu.co.in",
};
